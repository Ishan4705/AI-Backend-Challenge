import React from "react";

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  color: "indigo" | "amber" | "emerald";
}

const colors = {
  indigo: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400",
  amber: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
};

export default function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-[var(--card)] p-4 rounded-2xl border border-[var(--card-border)] shadow-sm flex items-center gap-4 transition-colors">
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        {React.cloneElement(icon, { size: 18 } as Record<string, unknown>)}
      </div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-lg font-black capitalize">{String(value)}</p>
      </div>
    </div>
  );
}
