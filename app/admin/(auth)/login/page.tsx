"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Lock, Mail } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Redirect if already logged in as admin
  useEffect(() => {
    if (localStorage.getItem("admin_token")) router.replace("/admin");
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Login failed");

      if (data.data.user.role !== "admin") {
        throw new Error("Access denied. This portal is for super-admin only.");
      }

      localStorage.setItem("admin_token", data.data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.data.user));
      router.push("/admin");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-violet-700 to-violet-800 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Super Admin</h1>
            <p className="text-violet-200 text-sm mt-1">SalonOS Control Panel</p>
          </div>

          <form onSubmit={handleLogin} className="px-8 py-8 space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Input
              label="Admin Email"
              type="email"
              placeholder="admin@salonos.com"
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
                  className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
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
              className="w-full bg-violet-700 hover:bg-violet-800 focus:ring-violet-500 mt-2"
              loading={loading}
            >
              Sign In to Admin Panel
            </Button>

            <p className="text-center text-sm pt-1">
              <a href="/admin/forgot-password" className="text-violet-600 hover:underline text-sm">
                Forgot password?
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
