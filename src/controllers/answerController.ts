import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db } from "../db/index.js";
import { questions, studentStats } from "../db/schema.js";
import { eq, and } from "drizzle-orm";

/**
 * POST /submit-answer
 * Validates the student's answer and updates their adaptive stats.
 * 
 * Body: { questionId, studentId, answer }
 */
export async function submitAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { questionId, studentId, answer } = req.body;

    if (!questionId || !studentId || answer === undefined) {
      res.status(400).json({
        error: "questionId, studentId, and answer are required",
      });
      return;
    }

    // 1. Fetch the question
    const [question] = await db
      .select()
      .from(questions)
      .where(eq(questions.id, questionId))
      .limit(1);

    if (!question) {
      res.status(404).json({ error: "Question not found" });
      return;
    }

    // 2. Validate the answer (case-insensitive comparison)
    const isCorrect =
      answer.toString().trim().toLowerCase() ===
      question.correctAnswer.trim().toLowerCase();

    // 3. Update or create student stats
    const topic = question.topic || "General";
    const [existingStat] = await db
      .select()
      .from(studentStats)
      .where(
        and(
          eq(studentStats.studentId, studentId),
          eq(studentStats.topic, topic)
        )
      )
      .limit(1);

    if (existingStat) {
      const newCorrectCount = existingStat.correctCount + (isCorrect ? 1 : 0);
      const newTotalCount = existingStat.totalCount + 1;
      const accuracy = newCorrectCount / newTotalCount;

      // Adaptive difficulty logic:
      // - accuracy >= 80% → increase difficulty
      // - accuracy <= 40% → decrease difficulty
      // - otherwise → maintain current level
      let newDifficulty = existingStat.difficultyLevel;
      if (accuracy >= 0.8 && newTotalCount >= 3) {
        newDifficulty =
          existingStat.difficultyLevel === "easy"
            ? "medium"
            : existingStat.difficultyLevel === "medium"
            ? "hard"
            : "hard";
      } else if (accuracy <= 0.4 && newTotalCount >= 3) {
        newDifficulty =
          existingStat.difficultyLevel === "hard"
            ? "medium"
            : existingStat.difficultyLevel === "medium"
            ? "easy"
            : "easy";
      }

      await db
        .update(studentStats)
        .set({
          correctCount: newCorrectCount,
          totalCount: newTotalCount,
          difficultyLevel: newDifficulty,
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(studentStats.id, existingStat.id));

      res.json({
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        stats: {
          topic,
          accuracy: Math.round(accuracy * 100),
          difficultyLevel: newDifficulty,
          totalAnswered: newTotalCount,
        },
      });
    } else {
      // Create new stats entry for this student + topic
      await db.insert(studentStats).values({
        id: uuidv4(),
        studentId,
        topic,
        difficultyLevel: "medium",
        correctCount: isCorrect ? 1 : 0,
        totalCount: 1,
      });

      res.json({
        correct: isCorrect,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        stats: {
          topic,
          accuracy: isCorrect ? 100 : 0,
          difficultyLevel: "medium",
          totalAnswered: 1,
        },
      });
    }
  } catch (error) {
    console.error("Submit answer error:", error);
    res.status(500).json({ error: "Failed to submit answer" });
  }
}
