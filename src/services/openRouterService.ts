import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

interface QuizQuestion {
  type: "MCQ" | "TF" | "FIB";
  difficulty: "easy" | "medium" | "hard";
  question: string;
  options?: string[];
  correct_answer: string;
  explanation: string;
}

interface GenerateQuizParams {
  chunkContent: string;
  topic: string;
  grade?: string;
  difficulty?: string;
  numQuestions?: number;
  existingQuestions?: string[];
}

/**
 * Call OpenRouter API to generate quiz questions from a text chunk.
 * Uses a robust system prompt to enforce strict JSON output structure.
 */
export async function generateQuizFromChunk(
  params: GenerateQuizParams
): Promise<QuizQuestion[]> {
  const {
    chunkContent,
    topic,
    grade = "General",
    difficulty = "medium",
    numQuestions = 5,
    existingQuestions = [],
  } = params;

  const systemPrompt = `You are an expert educational assessment designer for ${grade} students.
Your task is to generate quiz questions from the provided educational content.

CRITICAL RULES:
1. You MUST respond with ONLY a valid JSON array — no markdown, no explanation, no wrapping.
2. Each element in the array MUST be an object with EXACTLY these fields:
   - "type": one of "MCQ", "TF", or "FIB"
   - "difficulty": one of "easy", "medium", or "hard"
   - "question": the question text as a string
   - "options": an array of 4 strings (ONLY for "MCQ" type; omit for "TF" and "FIB")
   - "correct_answer": the correct answer as a string (for TF: "True" or "False"; for FIB: the missing word/phrase)
   - "explanation": a brief explanation of why the answer is correct

3. Generate a MIX of question types: at least one MCQ, one TF, and one FIB.
4. All questions MUST be directly based on the provided content — do not invent facts.
5. For MCQ: include exactly 4 options, one of which must be the correct_answer.
6. For TF: the question must be a clear statement that is either True or False.
7. For FIB: use "___" (three underscores) in the question to mark the blank.
8. Match the requested difficulty level: "${difficulty}".

EXAMPLE OUTPUT FORMAT:
[
  {
    "type": "MCQ",
    "difficulty": "medium",
    "question": "What is the primary function of chlorophyll?",
    "options": ["Energy storage", "Photosynthesis", "Respiration", "Transpiration"],
    "correct_answer": "Photosynthesis",
    "explanation": "Chlorophyll is the pigment responsible for absorbing light energy during photosynthesis."
  },
  {
    "type": "TF",
    "difficulty": "easy",
    "question": "Plants release oxygen during photosynthesis.",
    "correct_answer": "True",
    "explanation": "During photosynthesis, plants convert CO2 and water into glucose and oxygen."
  },
  {
    "type": "FIB",
    "difficulty": "hard",
    "question": "The process by which plants make food using sunlight is called ___.",
    "correct_answer": "photosynthesis",
    "explanation": "Photosynthesis is the process plants use to convert light energy into chemical energy."
  }
]`;

  // Build the duplicate avoidance block
  let duplicateBlock = "";
  if (existingQuestions.length > 0) {
    duplicateBlock = `\n\nIMPORTANT — DUPLICATE AVOIDANCE:\nThe following questions have ALREADY been generated for this content. You MUST NOT repeat or rephrase any of them. Generate completely NEW and DIFFERENT questions.\n\nAlready used questions:\n${existingQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}\n`;
  }

  const userPrompt = `Generate exactly ${numQuestions} quiz questions about "${topic}" at "${difficulty}" difficulty level from this content:${duplicateBlock}\n\n${chunkContent}`;

  const response = await axios.post(
    OPENROUTER_API_URL,
    {
      model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: existingQuestions.length > 0 ? 0.95 : 0.7,
      max_tokens: 4096,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://peblo.ai",
        "X-Title": "Peblo AI Quiz Generator",
      },
    }
  );

  const content = response.data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content returned from OpenRouter API");
  }

  // Parse the JSON response, handling potential markdown code fences
  let cleaned = content.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  const questions: QuizQuestion[] = JSON.parse(cleaned);
  return questions;
}
