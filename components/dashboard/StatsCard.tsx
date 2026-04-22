import React from "react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: "indigo" | "emerald" | "amber" | "rose" | "purple" | "blue";
  sub?: string;
}

const colorMap = {
  indigo: {
    bg: "bg-indigo-50",
    icon: "bg-indigo-100 text-indigo-600",
    value: "text-indigo-600",
  },
  emerald: {
    bg: "bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    value: "text-emerald-600",
  },
  amber: {
    bg: "bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    value: "text-amber-600",
  },
  rose: {
    bg: "bg-rose-50",
    icon: "bg-rose-100 text-rose-600",
    value: "text-rose-600",
  },
  purple: {
    bg: "bg-purple-50",
    icon: "bg-purple-100 text-purple-600",
    value: "text-purple-600",
  },
  blue: {
    bg: "bg-blue-50",
    icon: "bg-blue-100 text-blue-600",
    value: "text-blue-600",
  },
};

export default function StatsCard({
  label,
  value,
  icon,
  color = "indigo",
  sub,
}: StatsCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4",
        c.bg
      )}
    >
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
          c.icon
        )}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className={cn("text-3xl font-bold mt-0.5", c.value)}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}
