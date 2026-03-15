/**
 * Embedding-based Similarity Service
 * Pipeline: Generate Question → Get Embedding via API → Cosine Compare → Filter
 *
 * Uses OpenRouter's embedding endpoint for real neural network embeddings
 * instead of local TF-IDF. Embeddings are cached in the DB for fast future lookups.
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/embeddings";
const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// ─── Embedding API ──────────────────────────────────────────────────

/**
 * Get embedding vectors for one or more texts via OpenRouter API.
 * Returns an array of number[] vectors — one per input text.
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: EMBEDDING_MODEL,
        input: texts,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    // OpenAI-compatible response format
    const embeddings: number[][] = response.data.data
      .sort((a: any, b: any) => a.index - b.index)
      .map((item: any) => item.embedding);

    return embeddings;
  } catch (error: any) {
    console.error("⚠️  Embedding API failed:", error?.response?.data || error.message);
    // Fallback: return empty embeddings (will skip similarity check)
    return texts.map(() => []);
  }
}

/**
 * Get a single embedding vector for one text.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const [embedding] = await getEmbeddings([text]);
  return embedding || [];
}

// ─── Cosine Similarity ──────────────────────────────────────────────

/**
 * Compute cosine similarity between two embedding vectors. Returns 0–1.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB);
  return magnitude === 0 ? 0 : dot / magnitude;
}

// ─── Similarity Pipeline ────────────────────────────────────────────

export interface SimilarityResult {
  isSimilar: boolean;
  score: number;
  matchedQuestion: string | null;
}

/**
 * Full pipeline: Get embedding for a new question, compare against
 * existing question embeddings using cosine similarity.
 *
 * @param newEmbedding - Pre-computed embedding for the new question
 * @param existingEmbeddings - Array of { question, embedding } from DB
 * @param threshold - Similarity threshold (0–1), default 0.85
 */
export function checkEmbeddingSimilarity(
  newEmbedding: number[],
  existingEmbeddings: Array<{ question: string; embedding: number[] }>,
  threshold: number = 0.85
): SimilarityResult {
  if (newEmbedding.length === 0 || existingEmbeddings.length === 0) {
    return { isSimilar: false, score: 0, matchedQuestion: null };
  }

  let maxScore = 0;
  let matchedQuestion: string | null = null;

  for (const existing of existingEmbeddings) {
    if (existing.embedding.length === 0) continue;

    const score = cosineSimilarity(newEmbedding, existing.embedding);
    if (score > maxScore) {
      maxScore = score;
      matchedQuestion = existing.question;
    }
  }

  return {
    isSimilar: maxScore >= threshold,
    score: Math.round(maxScore * 100) / 100,
    matchedQuestion,
  };
}

/**
 * Batch similarity filter: get embeddings for all new questions,
 * compare each against existing embeddings, return unique vs duplicates.
 */
export async function filterBySimilarity(
  newQuestions: Array<{ question: string; [key: string]: any }>,
  existingEmbeddings: Array<{ question: string; embedding: number[] }>,
  threshold: number = 0.85
): Promise<{
  unique: Array<{ question: string; embedding: number[]; [key: string]: any }>;
  duplicates: Array<{ question: string; score: number; matchedWith: string }>;
}> {
  // Step 1: Get embeddings for all new questions in one API call
  const newTexts = newQuestions.map((q) => q.question);
  const newEmbeddings = await getEmbeddings(newTexts);

  const unique: Array<{ question: string; embedding: number[]; [key: string]: any }> = [];
  const duplicates: Array<{ question: string; score: number; matchedWith: string }> = [];

  // Growing pool — includes existing + newly accepted
  const pool = [...existingEmbeddings];

  for (let i = 0; i < newQuestions.length; i++) {
    const embedding = newEmbeddings[i] || [];

    // Step 2: Compare against pool
    const result = checkEmbeddingSimilarity(embedding, pool, threshold);

    if (result.isSimilar) {
      duplicates.push({
        question: newQuestions[i].question,
        score: result.score,
        matchedWith: result.matchedQuestion || "",
      });
    } else {
      unique.push({ ...newQuestions[i], embedding });
      // Add to pool for intra-batch dedup
      pool.push({ question: newQuestions[i].question, embedding });
    }
  }

  return { unique, duplicates };
}
