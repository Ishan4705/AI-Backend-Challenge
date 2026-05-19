import React from "react";

interface TabBtnProps {
  active: boolean;
  label: string;
  icon: React.ReactElement;
  onClick: () => void;
  disabled?: boolean;
}

export default function TabBtn({ active, label, icon, onClick, disabled }: TabBtnProps) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`flex-1 py-4 flex items-center justify-center gap-2 font-bold text-sm transition-all border-b-2 disabled:opacity-20 ${
        active
          ? "bg-[var(--card)] border-indigo-600 text-indigo-600 dark:text-indigo-400"
          : "text-slate-400 border-transparent hover:text-slate-600 dark:hover:text-slate-200"
      }`}
    >
      {React.cloneElement(icon, { size: 14 } as Record<string, unknown>)} {label}
    </button>
  );
}
