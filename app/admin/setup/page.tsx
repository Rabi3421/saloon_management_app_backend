"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, User, Eye, EyeOff } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function AdminSetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [alreadyExists, setAlreadyExists] = useState(false);

  useEffect(() => {
    // Check if admin already exists
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.exists) {
          setAlreadyExists(true);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      localStorage.setItem("admin_token", data.data.token);
      localStorage.setItem("admin_user", JSON.stringify(data.data.admin));
      router.push("/admin");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-rose-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-rose-700 to-red-800 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Admin Setup</h1>
            <p className="text-rose-200 text-sm mt-1">Create super-admin account</p>
          </div>

          <div className="px-8 py-8">
            {alreadyExists ? (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto">
                  <ShieldCheck size={28} className="text-rose-600" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Admin Already Configured
                </h2>
                <p className="text-sm text-slate-500">
                  A super-admin account already exists. Only one admin account
                  is allowed for security.
                </p>
                <Button
                  className="w-full bg-rose-700 hover:bg-rose-800 focus:ring-rose-500"
                  onClick={() => router.push("/admin/login")}
                >
                  Go to Admin Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSetup} className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs">
                  ⚠️ This setup can only be done <strong>once</strong>. Keep
                  these credentials safe.
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  leftIcon={<User size={15} />}
                />
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="admin@salonos.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  leftIcon={<Mail size={15} />}
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
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={(e) =>
                    setForm({ ...form, confirm: e.target.value })
                  }
                  leftIcon={<Lock size={15} />}
                />

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-rose-700 hover:bg-rose-800 focus:ring-rose-500 mt-2"
                  loading={submitting}
                >
                  Create Admin Account
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
