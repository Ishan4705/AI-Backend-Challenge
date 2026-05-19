import { useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import type { IngestedSource } from "../hooks/useQuiz";

interface UploadPageProps {
  loading: boolean;
  ingestedSources: IngestedSource[];
  onFileUpload: (file: File, metadata: { topic?: string; grade?: string; subject?: string }) => void;
  onGenerate: (sourceId: string) => void;
}

export default function UploadPage({ loading, ingestedSources, onFileUpload, onGenerate }: UploadPageProps) {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("");
  const [subject, setSubject] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileUpload(file, {
      topic: topic || undefined,
      grade: grade || undefined,
      subject: subject || undefined,
    });
  };

  return (
    <div className="flex flex-col items-center py-10">
      <div className="w-full max-w-sm p-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex flex-col items-center mb-8">
        <Upload className="w-10 h-10 text-slate-300 dark:text-slate-500 mb-4" />

        {/* Metadata inputs */}
        <div className="w-full space-y-2 mb-4">
          <input
            type="text"
            placeholder="Topic (e.g. Mathematics, Science)"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-indigo-400 outline-none transition-all"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Grade (e.g. 4)"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-indigo-400 outline-none transition-all"
            />
            <input
              type="text"
              placeholder="Subject (e.g. Algebra)"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-1/2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-indigo-400 outline-none transition-all"
            />
          </div>
        </div>

        <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 dark:shadow-indigo-900/30">
          {loading && <Loader2 className="animate-spin w-4 h-4" />}
          {loading ? "Processing..." : "Upload PDF"}
          <input
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={handleChange}
            disabled={loading}
          />
        </label>
      </div>

      <div className="w-full max-w-sm">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Ingested Documents
        </h3>
        {ingestedSources.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-xl mb-2 shadow-sm"
          >
            <div className="min-w-0">
              <span className="text-sm font-medium truncate block max-w-[150px]">{s.filename}</span>
              {s.topic && <span className="text-[10px] text-slate-400">{s.topic}{s.grade ? ` · Grade ${s.grade}` : ""}</span>}
            </div>
            <button
              onClick={() => onGenerate(s.id)}
              className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-lg font-bold shrink-0"
            >
              GENERATE
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
