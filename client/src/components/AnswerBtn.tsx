import { ChevronRight } from "lucide-react";

interface AnswerBtnProps {
  label: string;
  onClick: () => void;
  disabled: boolean;
}

export default function AnswerBtn({ label, onClick, disabled }: AnswerBtnProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="w-full text-left p-4 rounded-2xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all font-medium flex justify-between items-center group disabled:opacity-50"
    >
      {label}
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />
    </button>
  );
}
