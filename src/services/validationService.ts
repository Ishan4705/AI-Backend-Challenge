/**
 * Question Validation Service
 * Validates the structure and content of AI-generated quiz questions
 * before they are stored in the database.
 */

interface RawQuestion {
  type?: string;
  difficulty?: string;
  question?: string;
  options?: string[];
  correct_answer?: string;
  explanation?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized: RawQuestion | null;
}

const VALID_TYPES = ["MCQ", "TF", "FIB"];
const VALID_DIFFICULTIES = ["easy", "medium", "hard"];

/**
 * Validate a single quiz question's structure and content.
 */
export function validateQuestion(q: RawQuestion): ValidationResult {
  const errors: string[] = [];

  // ─── Required fields ──────────────────────────────────────────────
  if (!q.type || typeof q.type !== "string") {
    errors.push("Missing or invalid 'type'");
  } else if (!VALID_TYPES.includes(q.type)) {
    errors.push(`Invalid type "${q.type}" — must be MCQ, TF, or FIB`);
  }

  if (!q.difficulty || typeof q.difficulty !== "string") {
    errors.push("Missing or invalid 'difficulty'");
  } else if (!VALID_DIFFICULTIES.includes(q.difficulty.toLowerCase())) {
    errors.push(`Invalid difficulty "${q.difficulty}" — must be easy, medium, or hard`);
  }

  if (!q.question || typeof q.question !== "string" || q.question.trim().length < 10) {
    errors.push("Missing or too short 'question' (min 10 chars)");
  }

  if (!q.correct_answer || typeof q.correct_answer !== "string" || q.correct_answer.trim().length === 0) {
    errors.push("Missing or empty 'correct_answer'");
  }

  // ─── Type-specific validation ─────────────────────────────────────
  if (q.type === "MCQ") {
    if (!Array.isArray(q.options) || q.options.length < 2) {
      errors.push("MCQ must have at least 2 options");
    } else if (q.options.length !== 4) {
      errors.push(`MCQ should have exactly 4 options, got ${q.options.length}`);
    }

    // Correct answer must be one of the options
    if (Array.isArray(q.options) && q.correct_answer) {
      const normalized = q.options.map((o) => o.toLowerCase().trim());
      if (!normalized.includes(q.correct_answer.toLowerCase().trim())) {
        errors.push("MCQ correct_answer is not among the options");
      }
    }
  }

  if (q.type === "TF") {
    if (q.correct_answer && !["true", "false"].includes(q.correct_answer.toLowerCase().trim())) {
      errors.push(`TF correct_answer must be "True" or "False", got "${q.correct_answer}"`);
    }
    // TF should NOT have options
    if (q.options && Array.isArray(q.options) && q.options.length > 0) {
      // Auto-fix: we'll strip them in sanitization
    }
  }

  if (q.type === "FIB") {
    if (q.question && !q.question.includes("___")) {
      errors.push("FIB question must contain '___' blank marker");
    }
  }

  // ─── Sanitize ─────────────────────────────────────────────────────
  if (errors.length > 0) {
    return { valid: false, errors, sanitized: null };
  }

  const sanitized: RawQuestion = {
    type: q.type!.toUpperCase(),
    difficulty: q.difficulty!.toLowerCase(),
    question: q.question!.trim(),
    correct_answer: q.correct_answer!.trim(),
    explanation: q.explanation?.trim() || undefined,
    options: q.type === "MCQ" ? q.options!.map((o) => o.trim()) : undefined,
  };

  return { valid: true, errors: [], sanitized };
}

/**
 * Validate a batch of questions and return only the valid ones.
 */
export function validateQuestions(questions: RawQuestion[]): {
  valid: RawQuestion[];
  invalidCount: number;
  allErrors: string[];
} {
  const valid: RawQuestion[] = [];
  const allErrors: string[] = [];
  let invalidCount = 0;

  for (let i = 0; i < questions.length; i++) {
    const result = validateQuestion(questions[i]);
    if (result.valid && result.sanitized) {
      valid.push(result.sanitized);
    } else {
      invalidCount++;
      result.errors.forEach((e) => allErrors.push(`Q${i + 1}: ${e}`));
    }
  }

  if (invalidCount > 0) {
    console.log(`⚠️  Validation: ${invalidCount}/${questions.length} questions invalid — ${allErrors.join("; ")}`);
  }

  return { valid, invalidCount, allErrors };
}
