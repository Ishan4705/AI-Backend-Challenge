import { Brain } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  studentId: string;
}

export default function Header({ studentId }: HeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div>
        <h1 className="text-3xl font-bold text-indigo-600 flex items-center gap-2">
          <Brain className="w-8 h-8" /> Peblo AI Engine
        </h1>
        <p className="text-slate-500 text-sm dark:text-slate-400">Adaptive Learning Prototype</p>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="bg-white dark:bg-slate-800 px-4 py-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-xs font-mono">
          ID: {studentId}
        </div>
      </div>
    </div>
  );
}
