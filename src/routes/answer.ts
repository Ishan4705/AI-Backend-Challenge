import { Router } from "express";
import { submitAnswer } from "../controllers/answerController.js";

const router = Router();

// POST /submit-answer — validate answer and update student stats
router.post("/", submitAnswer);

export default router;
