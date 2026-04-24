"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Mail, Lock, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/lib/apiClient";

interface LoginResponse {
  data: {
    token: string;
    user: { name: string; email: string; role: string };
    salon: { name: string; _id: string };
  };
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<LoginResponse>("/api/auth/login", form);
      const { user } = res.data;
      // Admin users must use the dedicated admin login
      if (user.role === "admin") {
        throw new Error("Admin accounts must sign in at /admin/login");
      }
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Scissors size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">SalonOS</h1>
            <p className="text-indigo-200 text-sm mt-1">
              Sign in to your dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="owner@yoursalon.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<Mail size={15} />}
              autoComplete="email"
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <Lock size={15} />
                </span>
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full mt-2"
              loading={loading}
            >
              Sign In
            </Button>

            <p className="text-center text-xs text-slate-400 pt-2">
              Don&apos;t have an account? Use{" "}
              <code className="text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                POST /api/auth/register-owner
              </code>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
