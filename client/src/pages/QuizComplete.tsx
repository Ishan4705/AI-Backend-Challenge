import { CheckCircle } from "lucide-react";

interface QuizCompleteProps {
  accuracy: number;
  onDone: () => void;
}

export default function QuizComplete({ accuracy, onDone }: QuizCompleteProps) {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-6">
        <CheckCircle className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold mb-2">Quiz Completed!</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">You achieved {accuracy}% accuracy.</p>
      <button
        onClick={onDone}
        className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
      >
        Done
      </button>
    </div>
  );
}
