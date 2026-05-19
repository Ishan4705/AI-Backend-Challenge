import { CheckCircle, XCircle } from "lucide-react";
import AnswerBtn from "../components/AnswerBtn";
import type { QuizQuestion } from "../services/api";
import type { Feedback } from "../hooks/useQuiz";

interface QuizPageProps {
  questions: QuizQuestion[];
  currentIndex: number;
  feedback: Feedback | null;
  onSubmitAnswer: (answer: string) => void;
}

export default function QuizPage({ questions, currentIndex, feedback, onSubmitAnswer }: QuizPageProps) {
  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  const parsedOptions: string[] = currentQuestion.options
    ? typeof currentQuestion.options === "string"
      ? JSON.parse(currentQuestion.options)
      : currentQuestion.options
    : [];

  return (
    <div className="max-w-xl mx-auto">
      {/* Progress bar */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-[10px] font-black text-indigo-600 tracking-widest">
          QUESTION {currentIndex + 1}/{questions.length}
        </span>
        <div className="flex-grow h-1.5 mx-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="bg-indigo-500 h-full transition-all"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <h2 className="text-2xl font-bold mb-8 leading-tight">{currentQuestion.question}</h2>

      {/* Answer options */}
      <div className="space-y-3 mb-8">
        {currentQuestion.type === "MCQ" &&
          parsedOptions.map((opt: string, i: number) => (
            <AnswerBtn key={i} label={opt} onClick={() => onSubmitAnswer(opt)} disabled={!!feedback} />
          ))}

        {currentQuestion.type === "TF" &&
          ["True", "False"].map((opt, i) => (
            <AnswerBtn key={i} label={opt} onClick={() => onSubmitAnswer(opt)} disabled={!!feedback} />
          ))}

        {currentQuestion.type === "FIB" && (
          <input
            className="w-full p-4 rounded-2xl border-2 border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-indigo-500 outline-none font-medium transition-all"
            placeholder="Type answer and press Enter..."
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmitAnswer((e.target as HTMLInputElement).value);
            }}
            disabled={!!feedback}
          />
        )}
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`p-6 rounded-3xl border-2 ${
            feedback.correct
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
              : "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800 text-rose-900 dark:text-rose-100"
          }`}
        >
          <div className="flex gap-4">
            {feedback.correct ? (
              <CheckCircle className="shrink-0 text-emerald-500" />
            ) : (
              <XCircle className="shrink-0 text-rose-500" />
            )}
            <div>
              <p className="font-bold">
                {feedback.correct ? "Correct!" : `Incorrect. Answer: ${feedback.correctAnswer}`}
              </p>
              <p className="text-sm opacity-80 mt-1">{feedback.explanation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
