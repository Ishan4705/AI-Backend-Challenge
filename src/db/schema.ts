import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ─── Sources ─────────────────────────────────────────────────────────
export const sources = sqliteTable("sources", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  topic: text("topic"),               // e.g. "Mathematics", "Science"
  grade: text("grade"),               // e.g. "Grade 1", "Grade 4"
  subject: text("subject"),           // e.g. "Numbers", "Grammar"
  totalChunks: integer("total_chunks").default(0),
  uploadedAt: text("uploaded_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ─── Chunks ─────────────────────────────────────────────────────────
export const chunks = sqliteTable("chunks", {
  id: text("id").primaryKey(),
  sourceId: text("source_id")
    .notNull()
    .references(() => sources.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull(),
  content: text("content").notNull(),
});

// ─── Questions ──────────────────────────────────────────────────────
export const questions = sqliteTable("questions", {
  id: text("id").primaryKey(),
  sourceChunkId: text("source_chunk_id")
    .notNull()
    .references(() => chunks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),         // "MCQ" | "TF" | "FIB"
  difficulty: text("difficulty").notNull(), // "easy" | "medium" | "hard"
  question: text("question").notNull(),
  options: text("options"),             // JSON stringified array (for MCQ)
  correctAnswer: text("correct_answer").notNull(),
  explanation: text("explanation"),
  topic: text("topic"),
  embedding: text("embedding"),         // JSON stringified number[] — cached embedding vector
  qualityScore: integer("quality_score"), // 0–100 combined quality score
  bloomsLevel: text("blooms_level"),      // "recall" | "understand" | "apply" | "analyze"
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
// ─── Student Stats ──────────────────────────────────────────────────
export const studentStats = sqliteTable("student_stats", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  topic: text("topic").notNull(),
  difficultyLevel: text("difficulty_level").notNull().default("medium"),
  correctCount: integer("correct_count").notNull().default(0),
  totalCount: integer("total_count").notNull().default(0),
  lastUpdated: text("last_updated")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
