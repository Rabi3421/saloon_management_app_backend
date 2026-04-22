"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, User } from "lucide-react";

export default function AdminHeader({ title }: { title: string }) {
  const [adminName, setAdminName] = useState("Super Admin");

  useEffect(() => {
    try {
      const u = localStorage.getItem("admin_user");
      if (u) setAdminName(JSON.parse(u).name);
    } catch {
      // ignore
    }
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-xs text-rose-500 font-semibold mt-0.5 flex items-center gap-1">
          <ShieldCheck size={11} /> Super Admin Panel
        </p>
      </div>

      <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
        <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
          <User size={16} className="text-rose-600" />
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900 leading-tight">
            {adminName}
          </p>
          <p className="text-xs text-rose-500 font-medium">admin</p>
        </div>
      </div>
    </header>
  );
}
