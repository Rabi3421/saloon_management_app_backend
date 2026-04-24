"use client";

import { useEffect, useState } from "react";
import { Bell, User } from "lucide-react";
import { api } from "@/lib/apiClient";

interface SalonUser {
  name: string;
  email: string;
  role: string;
}

interface SalonData {
  name: string;
}

export default function Header({ title }: { title: string }) {
  const [user, setUser] = useState<SalonUser | null>(null);
  const [salon, setSalon] = useState<SalonData | null>(null);

  useEffect(() => {
    api
      .get<{ user: SalonUser; salon: SalonData }>("/api/auth/me")
      .then((res) => {
        setUser(res.user);
        setSalon(res.salon);
      })
      .catch(() => {/* unauthenticated — middleware will redirect */});
  }, []);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        {salon && (
          <p className="text-xs text-slate-500 mt-0.5">{salon.name}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <User size={16} className="text-indigo-600" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {user?.name || "Owner"}
            </p>
            <p className="text-xs text-slate-500 capitalize">
              {user?.role || "owner"}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
