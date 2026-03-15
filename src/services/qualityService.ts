/**
 * Question Quality Evaluation Service
 *
 * Pipeline: Rule-based scoring → LLM quality evaluation → Combined score
 *
 * Evaluates generated questions on multiple dimensions:
 *   1. Structural quality    (rule-based: length, formatting, options)
 *   2. Bloom's taxonomy      (LLM-based: recall / understand / apply / analyze)
 *   3. Distractor quality    (LLM-based: plausibility of wrong options)
 *   4. Clarity & readability (LLM-based: unambiguous, age-appropriate)
 *   5. Content alignment     (LLM-based: grounded in source material)
 */

import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

// ─── Types ──────────────────────────────────────────────────────────

interface QuestionInput {
  type: string;        // MCQ | TF | FIB
  difficulty: string;  // easy | medium | hard
  question: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export interface QualityReport {
  overallScore: number;             // 0–100
  ruleScore: number;                // 0–100 (structural)
  llmScore: number;                 // 0–100 (semantic)
  bloomsLevel: string;              // "recall" | "understand" | "apply" | "analyze"
  issues: string[];                 // list of quality problems
  passed: boolean;                  // true if overallScore >= threshold
}

// ─── Rule-Based Scoring (runs locally, no API) ──────────────────────

function ruleBasedScore(q: QuestionInput): { score: number; issues: string[] } {
  let score = 100;
  const issues: string[] = [];

  // ── Question length ─────────────────────────────────────────────
  if (q.question.length < 15) {
    score -= 20;
    issues.push("Question too short (< 15 chars)");
  } else if (q.question.length < 30) {
    score -= 10;
    issues.push("Question could be more detailed");
  }
  if (q.question.length > 500) {
    score -= 10;
    issues.push("Question excessively long (> 500 chars)");
  }

  // ── Question ends with ? or has blank for FIB ───────────────────
  if (q.type === "MCQ" || q.type === "TF") {
    if (!q.question.trim().endsWith("?") && !q.question.trim().endsWith(".")) {
      score -= 5;
      issues.push("Question should end with ? or .");
    }
  }

  // ── Explanation quality ─────────────────────────────────────────
  if (!q.explanation || q.explanation.trim().length < 10) {
    score -= 15;
    issues.push("Missing or too short explanation");
  }

  // ── MCQ-specific checks ─────────────────────────────────────────
  if (q.type === "MCQ" && q.options) {
    // Check for diverse options (not too similar to each other)
    const optionSet = new Set(q.options.map((o) => o.toLowerCase().trim()));
    if (optionSet.size < q.options.length) {
      score -= 20;
      issues.push("MCQ has duplicate options");
    }

    // Check option length balance (all options similar length is better)
    const lengths = q.options.map((o) => o.length);
    const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxDiff = Math.max(...lengths.map((l) => Math.abs(l - avgLen)));
    if (maxDiff > avgLen * 2) {
      score -= 10;
      issues.push("MCQ option lengths are very unbalanced (correct answer might be obvious)");
    }

    // Correct answer shouldn't always be the longest option
    const correctIdx = q.options.findIndex(
      (o) => o.toLowerCase().trim() === q.correct_answer.toLowerCase().trim()
    );
    if (correctIdx >= 0 && q.options[correctIdx].length === Math.max(...lengths)) {
      score -= 5;
      issues.push("Correct answer is the longest option (pattern giveaway)");
    }
  }

  // ── TF-specific checks ──────────────────────────────────────────
  if (q.type === "TF") {
    // Avoid negative phrasing which is confusing
    const negWords = ["not", "never", "no ", "isn't", "doesn't", "cannot"];
    const hasNeg = negWords.some((w) => q.question.toLowerCase().includes(w));
    if (hasNeg) {
      score -= 5;
      issues.push("TF uses negative phrasing (can be confusing)");
    }
  }

  // ── FIB-specific checks ─────────────────────────────────────────
  if (q.type === "FIB") {
    const blankCount = (q.question.match(/___/g) || []).length;
    if (blankCount > 2) {
      score -= 15;
      issues.push("FIB has too many blanks (> 2) — reduces clarity");
    }
    if (q.correct_answer.split(" ").length > 5) {
      score -= 10;
      issues.push("FIB answer is too long — should be a concise phrase");
    }
  }

  // ── Difficulty alignment ────────────────────────────────────────
  const wordCount = q.question.split(/\s+/).length;
  if (q.difficulty === "hard" && wordCount < 8) {
    score -= 10;
    issues.push("Hard question seems too short/simple");
  }
  if (q.difficulty === "easy" && wordCount > 40) {
    score -= 5;
    issues.push("Easy question is unnecessarily complex");
  }

  return { score: Math.max(0, score), issues };
}

// ─── LLM-Based Evaluation (API call) ────────────────────────────────

async function llmEvaluate(
  q: QuestionInput,
  sourceContent: string
): Promise<{ score: number; bloomsLevel: string; issues: string[] }> {
  const prompt = `You are an expert educational assessment evaluator. Score this quiz question on quality.

QUESTION:
- Type: ${q.type}
- Difficulty: ${q.difficulty}
- Question: "${q.question}"
- ${q.type === "MCQ" ? `Options: ${JSON.stringify(q.options)}` : ""}
- Correct Answer: "${q.correct_answer}"
- Explanation: "${q.explanation || "none"}"

SOURCE CONTENT (excerpt):
"${sourceContent.slice(0, 500)}"

Evaluate on these criteria:
1. **Content Alignment** (0-25): Is the question grounded in the source material?  
2. **Clarity** (0-25): Is the question unambiguous and age-appropriate?
3. **Cognitive Level** (0-25): Does it test understanding, not just memorization?
4. **Distractor Quality** (0-25): For MCQ, are wrong options plausible but clearly wrong? For TF/FIB, is the answer definitive?

RESPOND WITH ONLY this JSON — no markdown, no explanation:
{
  "score": <number 0-100>,
  "blooms_level": "<recall|understand|apply|analyze>",
  "issues": ["<issue1>", "<issue2>"]
}`;

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 512,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://peblo.ai",
          "X-Title": "Peblo AI Quality Evaluator",
        },
      }
    );

    let content = response.data.choices?.[0]?.message?.content || "";
    // Clean markdown fences
    content = content.trim();
    if (content.startsWith("```json")) content = content.slice(7);
    else if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    const result = JSON.parse(content);
    return {
      score: Math.min(100, Math.max(0, result.score || 0)),
      bloomsLevel: result.blooms_level || "recall",
      issues: Array.isArray(result.issues) ? result.issues : [],
    };
  } catch (error: any) {
    console.error("⚠️  LLM evaluation failed:", error?.message);
    // Fallback: return neutral scores
    return { score: 60, bloomsLevel: "recall", issues: ["LLM evaluation unavailable"] };
  }
}

// ─── Combined Evaluation Pipeline ───────────────────────────────────

const QUALITY_THRESHOLD = 50;

/**
 * Evaluate a single question's quality.
 * Combines rule-based structural scoring with LLM semantic evaluation.
 *
 * @param question - The question to evaluate
 * @param sourceContent - Original chunk content for alignment checking
 * @param threshold - Minimum score to pass (default 50)
 */
export async function evaluateQuestion(
  question: QuestionInput,
  sourceContent: string,
  threshold: number = QUALITY_THRESHOLD
): Promise<QualityReport> {
  // Run both evaluations
  const ruleResult = ruleBasedScore(question);
  const llmResult = await llmEvaluate(question, sourceContent);

  // Weighted combination: 40% rules + 60% LLM
  const overallScore = Math.round(ruleResult.score * 0.4 + llmResult.score * 0.6);
  const allIssues = [...ruleResult.issues, ...llmResult.issues];

  return {
    overallScore,
    ruleScore: ruleResult.score,
    llmScore: llmResult.score,
    bloomsLevel: llmResult.bloomsLevel,
    issues: allIssues,
    passed: overallScore >= threshold,
  };
}

/**
 * Batch evaluate questions and filter by quality threshold.
 * Returns only questions that meet the quality bar.
 */
export async function evaluateAndFilter(
  questions: QuestionInput[],
  sourceContent: string,
  threshold: number = QUALITY_THRESHOLD
): Promise<{
  passed: Array<QuestionInput & { qualityScore: number; bloomsLevel: string }>;
  failed: Array<{ question: string; score: number; issues: string[] }>;
}> {
  const passed: Array<QuestionInput & { qualityScore: number; bloomsLevel: string }> = [];
  const failed: Array<{ question: string; score: number; issues: string[] }> = [];

  for (const q of questions) {
    const report = await evaluateQuestion(q, sourceContent, threshold);

    if (report.passed) {
      passed.push({ ...q, qualityScore: report.overallScore, bloomsLevel: report.bloomsLevel });
    } else {
      failed.push({
        question: q.question,
        score: report.overallScore,
        issues: report.issues,
      });
    }
  }

  return { passed, failed };
}
