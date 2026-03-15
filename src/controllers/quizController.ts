import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { chunks, questions, sources } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateQuizFromChunk } from "../services/openRouterService.js";
import { getFilteredQuestions } from "../services/quizService.js";
import { validateQuestions } from "../services/validationService.js";
import { filterBySimilarity } from "../services/similarityService.js";
import { evaluateAndFilter } from "../services/qualityService.js";

/**
 * POST /quiz/generate
 *
 * Full Pipeline:
 *   A. LLM generates raw questions
 *   B. Validate structure (MCQ/TF/FIB rules)
 *   C. Embedding API → cosine similarity filter
 *   D. Quality evaluation (rule-based + LLM scoring)
 *   E. Store high-quality unique questions + cache embeddings
 *   ↻ Retry if all questions are filtered out
 */
export async function generateQuiz(req: Request, res: Response): Promise<void> {
  try {
    const { sourceId, topic, difficulty, numQuestions } = req.body;

    if (!sourceId) {
      res.status(400).json({ error: "sourceId is required" });
      return;
    }

    // ── 1. Fetch source metadata ──────────────────────────────────
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source) {
      res.status(404).json({ error: "Source not found" });
      return;
    }

    // ── 2. Retrieve chunks ────────────────────────────────────────
    const sourceChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.sourceId, sourceId));

    if (sourceChunks.length === 0) {
      res.status(404).json({ error: "No chunks found for this source" });
      return;
    }

    // ── 3. Load existing questions + cached embeddings (cross-source) ─
    const effectiveTopic = topic || source.topic || "General";
    const allExistingQs = await db
      .select({ question: questions.question, embedding: questions.embedding })
      .from(questions)
      .where(eq(questions.topic, effectiveTopic));

    // Parse cached embedding vectors from JSON
    const existingEmbeddings = allExistingQs
      .filter((q) => q.embedding)
      .map((q) => ({
        question: q.question,
        embedding: JSON.parse(q.embedding!) as number[],
      }));

    const existingQuestionTexts = allExistingQs.map((q) => q.question);

    console.log(
      `📋 Topic "${effectiveTopic}": ${allExistingQs.length} existing questions, ` +
      `${existingEmbeddings.length} with cached embeddings`
    );

    // ── 4. Pipeline: Generate → Validate → Embed → Quality → Store ─
    const allQuestions = [];
    const MAX_RETRIES = 3;
    const SIMILARITY_THRESHOLD = 0.85;

    for (const chunk of sourceChunks) {
      let chunkNewQuestions = 0;
      let attempt = 0;

      while (chunkNewQuestions === 0 && attempt < MAX_RETRIES) {
        attempt++;
        if (attempt > 1) {
          console.log(`🔄 Retry ${attempt}/${MAX_RETRIES} — regenerating to find unique questions`);
        }

        // ── Step A: Generate from LLM ───────────────────────────
        console.log(`🤖 Calling LLM for chunk ${sourceChunks.indexOf(chunk) + 1}/${sourceChunks.length}...`);
        const rawQuestions = await generateQuizFromChunk({
          chunkContent: chunk.content,
          topic: effectiveTopic,
          grade: source.grade || undefined,
          difficulty: difficulty || "medium",
          numQuestions: numQuestions || 3,
          existingQuestions: existingQuestionTexts,
        });

        // ── Step B: Validate structure ──────────────────────────
        const { valid: validatedQuestions, invalidCount } = validateQuestions(rawQuestions);
        console.log(`🔍 Validation: ${validatedQuestions.length} passed, ${invalidCount} rejected`);

        if (validatedQuestions.length === 0) continue;

        // ── Step C: Embedding API → Cosine Similarity ───────────
        console.log(`🧬 Getting embeddings for ${validatedQuestions.length} questions...`);
        const { unique, duplicates } = await filterBySimilarity(
          validatedQuestions.map((q) => ({
            question: q.question as string,
            type: q.type as string,
            difficulty: q.difficulty as string,
            options: q.options,
            correct_answer: q.correct_answer as string,
            explanation: q.explanation,
          })),
          existingEmbeddings,
          SIMILARITY_THRESHOLD
        );

        for (const dup of duplicates) {
          console.log(
            `⏭️  Similar (${dup.score}): "${dup.question.slice(0, 45)}…" ↔ "${dup.matchedWith.slice(0, 45)}…"`
          );
        }

        if (unique.length === 0) continue;

        // ── Step D: Quality Evaluation (rule-based + LLM) ───────
        console.log(`📊 Evaluating quality for ${unique.length} unique questions...`);
        const { passed: highQuality, failed: lowQuality } = await evaluateAndFilter(
          unique.map((q) => ({
            type: q.type as string,
            difficulty: q.difficulty as string,
            question: q.question,
            options: q.options as string[] | undefined,
            correct_answer: q.correct_answer as string,
            explanation: q.explanation as string | undefined,
          })),
          chunk.content
        );

        for (const lq of lowQuality) {
          console.log(
            `❌ Low quality (${lq.score}): "${lq.question.slice(0, 50)}…" — ${lq.issues.join(", ")}`
          );
        }

        // ── Step E: Store high-quality questions + cache ─────────
        for (const q of highQuality) {
          // Find matching embedding from the similarity step
          const matchingUnique = unique.find((u) => u.question === q.question);
          const embeddingVec = matchingUnique?.embedding;

          const questionId = uuidv4();
          const record = {
            id: questionId,
            sourceChunkId: chunk.id,
            type: q.type,
            difficulty: q.difficulty,
            question: q.question,
            options: q.options ? JSON.stringify(q.options) : null,
            correctAnswer: q.correct_answer,
            explanation: q.explanation || null,
            topic: effectiveTopic,
            embedding: embeddingVec && embeddingVec.length > 0 ? JSON.stringify(embeddingVec) : null,
            qualityScore: q.qualityScore,
            bloomsLevel: q.bloomsLevel,
          };

          await db.insert(questions).values(record);
          allQuestions.push({ ...record, id: questionId });

          // Update pools for intra-batch dedup
          existingQuestionTexts.push(q.question);
          if (embeddingVec && embeddingVec.length > 0) {
            existingEmbeddings.push({ question: q.question, embedding: embeddingVec });
          }
          chunkNewQuestions++;
        }
      }

      if (chunkNewQuestions === 0) {
        console.log(`⚠️  Could not generate quality questions for chunk after ${MAX_RETRIES} attempts`);
      } else {
        console.log(`✅ Stored ${chunkNewQuestions} high-quality unique questions`);
      }
    }

    res.status(201).json({
      message: "Quiz generated successfully",
      sourceId,
      totalQuestions: allQuestions.length,
      questions: allQuestions,
    });
  } catch (error) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: "Failed to generate quiz" });
  }
}

/**
 * GET /quiz
 * Retrieve stored questions with optional filters: topic, difficulty, type, limit.
 */
export async function getQuiz(req: Request, res: Response): Promise<void> {
  try {
    const { topic, difficulty, type, limit } = req.query;

    const results = await getFilteredQuestions({
      topic: topic as string | undefined,
      difficulty: difficulty as string | undefined,
      type: type as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    // Parse options back from JSON string for MCQ questions
    const parsed = results.map((q) => ({
      ...q,
      options: q.options ? JSON.parse(q.options) : null,
    }));

    res.json({
      count: parsed.length,
      questions: parsed,
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    res.status(500).json({ error: "Failed to retrieve quiz" });
  }
}
