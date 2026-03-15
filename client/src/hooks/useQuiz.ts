import { useState, useCallback } from "react";
import {
  ingestPDF,
  generateQuiz,
  submitAnswer,
  type QuizQuestion,
  type IngestResponse,
  type SubmitAnswerResponse,
} from "../services/api";

export interface IngestedSource {
  id: string;
  filename: string;
  topic?: string;
  grade?: string;
  timestamp: string;
}

export interface StudentStats {
  difficulty: string;
  accuracy: number;
  total: number;
}

export interface Feedback {
  correct: boolean;
  explanation: string | null;
  correctAnswer: string;
}

export function useQuiz() {
  const [studentId] = useState(`STU_${Math.floor(Math.random() * 1000)}`);
  const [activeTab, setActiveTab] = useState<"upload" | "generate" | "quiz">("upload");
  const [ingestedSources, setIngestedSources] = useState<IngestedSource[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState({ ingest: false, generate: false });
  const [studentStats, setStudentStats] = useState<StudentStats>({
    difficulty: "medium",
    accuracy: 0,
    total: 0,
  });

  const handleFileUpload = useCallback(
    async (file: File, metadata: { topic?: string; grade?: string; subject?: string } = {}) => {
      setLoading((prev) => ({ ...prev, ingest: true }));
      try {
        const data: IngestResponse = await ingestPDF(file, metadata);
        setIngestedSources((prev) => [
          {
            id: data.sourceId,
            filename: data.filename,
            topic: data.metadata?.topic || metadata.topic,
            grade: data.metadata?.grade || metadata.grade,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        setActiveTab("generate");
      } catch (error) {
        console.error("Ingestion failed", error);
      } finally {
        setLoading((prev) => ({ ...prev, ingest: false }));
      }
    },
    []
  );

  const handleGenerateQuiz = useCallback(
    async (sourceId: string) => {
      setLoading((prev) => ({ ...prev, generate: true }));
      try {
        // Don't send a topic — the backend will use the source's own metadata
        const data = await generateQuiz({
          sourceId,
          difficulty: studentStats.difficulty,
          numQuestions: 3,
        });
        setQuizQuestions(data.questions);
        setActiveTab("quiz");
        setCurrentQuizIndex(0);
        setQuizFinished(false);
      } catch (error) {
        console.error("Generation failed", error);
      } finally {
        setLoading((prev) => ({ ...prev, generate: false }));
      }
    },
    [studentStats.difficulty]
  );

  const handleSubmitAnswer = useCallback(
    async (answer: string) => {
      const currentQuestion = quizQuestions[currentQuizIndex];
      try {
        const data: SubmitAnswerResponse = await submitAnswer({
          questionId: currentQuestion.id,
          studentId,
          answer,
        });

        setLastFeedback({
          correct: data.correct,
          explanation: data.explanation,
          correctAnswer: data.correctAnswer,
        });

        setStudentStats({
          total: data.stats.totalAnswered,
          accuracy: data.stats.accuracy,
          difficulty: data.stats.difficultyLevel,
        });

        setTimeout(() => {
          setLastFeedback(null);
          if (currentQuizIndex < quizQuestions.length - 1) {
            setCurrentQuizIndex((i) => i + 1);
          } else {
            setQuizFinished(true);
          }
        }, 3500);
      } catch (error) {
        console.error("Submission failed", error);
      }
    },
    [quizQuestions, currentQuizIndex, studentId]
  );

  const resetQuiz = useCallback(() => {
    setActiveTab("upload");
    setQuizQuestions([]);
    setQuizFinished(false);
    setCurrentQuizIndex(0);
    setLastFeedback(null);
  }, []);

  return {
    studentId,
    activeTab,
    setActiveTab,
    ingestedSources,
    quizQuestions,
    currentQuizIndex,
    quizFinished,
    lastFeedback,
    loading,
    studentStats,
    handleFileUpload,
    handleGenerateQuiz,
    handleSubmitAnswer,
    resetQuiz,
  };
}
