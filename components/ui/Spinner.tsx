import React from "react";
import { cn } from "@/lib/utils";

export default function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "w-6 h-6 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin",
        className
      )}
    />
  );
}
