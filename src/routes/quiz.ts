import { Router } from "express";
import { generateQuiz, getQuiz } from "../controllers/quizController.js";

const router = Router();

// POST /quiz/generate — generate quiz from ingested content via OpenRouter
router.post("/generate", generateQuiz);

// GET /quiz — retrieve stored questions (filterable by topic, difficulty, type)
router.get("/", getQuiz);

export default router;
