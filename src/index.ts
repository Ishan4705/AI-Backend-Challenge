import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ingestRoutes from "./routes/ingest.js";
import quizRoutes from "./routes/quiz.js";
import answerRoutes from "./routes/answer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Health Check ───────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Routes ─────────────────────────────────────────────────────────
app.use("/ingest", ingestRoutes);
app.use("/quiz", quizRoutes);
app.use("/submit-answer", answerRoutes);

// ─── Global Error Handler ───────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({ error: "Internal server error" });
  }
);

// ─── Start Server ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Peblo AI server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
});

export default app;
