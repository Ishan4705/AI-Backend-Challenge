const API_BASE = "/api";

// ─── Ingest ─────────────────────────────────────────────────────────

export interface IngestResponse {
  message: string;
  sourceId: string;
  filename: string;
  totalChunks: number;
  metadata: { topic: string; grade: string; subject: string };
}

export async function ingestPDF(
  file: File,
  metadata: { topic?: string; grade?: string; subject?: string } = {}
): Promise<IngestResponse> {
  const formData = new FormData();
  formData.append("pdf", file);
  if (metadata.topic) formData.append("topic", metadata.topic);
  if (metadata.grade) formData.append("grade", metadata.grade);
  if (metadata.subject) formData.append("subject", metadata.subject);

  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error((await res.json()).error || "Ingest failed");
  return res.json();
}

// ─── Quiz Generation ────────────────────────────────────────────────

export interface QuizQuestion {
  id: string;
  type: "MCQ" | "TF" | "FIB";
  difficulty: string;
  question: string;
  options: string | null;
  correctAnswer: string;
  explanation: string | null;
  topic: string | null;
}

export interface GenerateQuizResponse {
  message: string;
  sourceId: string;
  totalQuestions: number;
  questions: QuizQuestion[];
}

export async function generateQuiz(params: {
  sourceId: string;
  topic?: string;
  difficulty?: string;
  numQuestions?: number;
}): Promise<GenerateQuizResponse> {
  const res = await fetch(`${API_BASE}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error((await res.json()).error || "Generation failed");
  return res.json();
}

// ─── Get Quiz ───────────────────────────────────────────────────────

export async function getQuiz(filters: {
  topic?: string;
  difficulty?: string;
  type?: string;
  limit?: number;
}): Promise<{ count: number; questions: QuizQuestion[] }> {
  const params = new URLSearchParams();
  if (filters.topic) params.set("topic", filters.topic);
  if (filters.difficulty) params.set("difficulty", filters.difficulty);
  if (filters.type) params.set("type", filters.type);
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(`${API_BASE}/quiz?${params}`);
  if (!res.ok) throw new Error("Failed to fetch quiz");
  return res.json();
}

// ─── Submit Answer ──────────────────────────────────────────────────

export interface SubmitAnswerResponse {
  correct: boolean;
  correctAnswer: string;
  explanation: string | null;
  stats: {
    topic: string;
    accuracy: number;
    difficultyLevel: string;
    totalAnswered: number;
  };
}

export async function submitAnswer(params: {
  questionId: string;
  studentId: string;
  answer: string;
}): Promise<SubmitAnswerResponse> {
  const res = await fetch(`${API_BASE}/submit-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!res.ok) throw new Error("Submission failed");
  return res.json();
}
