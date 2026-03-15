import React from "react";

interface StatCardProps {
  icon: React.ReactElement;
  label: string;
  value: string | number;
  color: "indigo" | "amber" | "emerald";
}

const colors = {
  indigo: "bg-indigo-50 text-indigo-600",
  amber: "bg-amber-50 text-amber-600",
  emerald: "bg-emerald-50 text-emerald-600",
};

export default function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
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
