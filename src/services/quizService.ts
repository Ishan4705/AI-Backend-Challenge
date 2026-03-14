import { db } from "../db/index.js";
import { questions } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

interface QuizFilters {
  topic?: string;
  difficulty?: string;
  type?: string;
  limit?: number;
}

/**
 * Retrieve quiz questions from the database with optional filters.
 */
export async function getFilteredQuestions(filters: QuizFilters) {
  const conditions = [];

  if (filters.topic) {
    conditions.push(eq(questions.topic, filters.topic));
  }
  if (filters.difficulty) {
    conditions.push(eq(questions.difficulty, filters.difficulty));
  }
  if (filters.type) {
    conditions.push(eq(questions.type, filters.type));
  }

  const query = db
    .select()
    .from(questions)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .limit(filters.limit || 20);

  return await query;
}

/**
 * Get questions by source chunk ID for traceability.
 */
export async function getQuestionsByChunkId(chunkId: string) {
  return await db
    .select()
    .from(questions)
    .where(eq(questions.sourceChunkId, chunkId));
}
