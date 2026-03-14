import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { chunks, questions, sources } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { generateQuizFromChunk } from "../services/openRouterService.js";
import { getFilteredQuestions } from "../services/quizService.js";

/**
 * POST /quiz/generate
 * Generates quiz questions from stored chunks using OpenRouter.
 * Requires sourceId in the body; optionally accepts topic, difficulty, numQuestions.
 */
export async function generateQuiz(req: Request, res: Response): Promise<void> {
  try {
    const { sourceId, topic, difficulty, numQuestions } = req.body;

    if (!sourceId) {
      res.status(400).json({ error: "sourceId is required" });
      return;
    }

    // 1. Fetch the source to get metadata
    const [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.id, sourceId))
      .limit(1);

    if (!source) {
      res.status(404).json({ error: "Source not found" });
      return;
    }

    // 2. Retrieve all chunks for this source
    const sourceChunks = await db
      .select()
      .from(chunks)
      .where(eq(chunks.sourceId, sourceId));

    if (sourceChunks.length === 0) {
      res.status(404).json({ error: "No chunks found for this source" });
      return;
    }

    // 3. Generate questions from each chunk via OpenRouter
    const allQuestions = [];

    for (const chunk of sourceChunks) {
      const generatedQuestions = await generateQuizFromChunk({
        chunkContent: chunk.content,
        topic: topic || source.topic || "General",
        grade: source.grade || undefined,
        difficulty: difficulty || "medium",
        numQuestions: numQuestions || 3,
      });

      // 4. Store each question in the database
      for (const q of generatedQuestions) {
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
          topic: topic || source.topic || null,
        };

        await db.insert(questions).values(record);
        allQuestions.push({ ...record, id: questionId });
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
