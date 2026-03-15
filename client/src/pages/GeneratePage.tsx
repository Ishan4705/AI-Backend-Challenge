import { Loader2, Database } from "lucide-react";

interface GeneratePageProps {
  loading: boolean;
  difficulty: string;
  topic: string;
  firstSourceId: string | undefined;
  onGenerate: (sourceId: string) => void;
}

export default function GeneratePage({ loading, difficulty, topic, firstSourceId, onGenerate }: GeneratePageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {loading ? (
        <div className="space-y-4">
          <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <h2 className="text-xl font-bold">OpenRouter is thinking...</h2>
          <p className="text-slate-400">Creating MCQ, TF, and FIB questions about <b>{topic}</b> from your PDF.</p>
        </div>
      ) : (
        <div className="max-w-xs">
          <Database className="w-16 h-16 text-indigo-100 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Ready to Build</h2>
          <p className="text-slate-500 mb-2 text-sm">
            Topic: <b>{topic}</b>
          </p>
          <p className="text-slate-500 mb-8 text-sm">
            Difficulty: <b>{difficulty}</b>
          </p>
          <button
            onClick={() => firstSourceId && onGenerate(firstSourceId)}
            disabled={!firstSourceId}
            className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
          >
            Start Generation
          </button>
        </div>
      )}
    </div>
  );
}
