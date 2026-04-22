"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/apiClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

interface RegisterResponse {
  data: {
    token: string;
    user: { name: string; email: string; role: string };
    salon: { name: string };
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const salonId = process.env.NEXT_PUBLIC_SALON_ID;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!salonId) {
      setError("This app is not configured for a specific salon. Contact support.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<RegisterResponse>("/api/auth/register-customer", {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      setToken(res.data.token);
      localStorage.setItem("salon_user", JSON.stringify(res.data.user));
      localStorage.setItem("salon_data", JSON.stringify(res.data.salon));
      router.push("/dashboard");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">S</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
          <p className="text-slate-500 text-sm mt-1">Register to book appointments</p>
        </div>

        {!salonId && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3 mb-4">
            ⚠️ <strong>NEXT_PUBLIC_SALON_ID</strong> is not set. This page won&apos;t work until you configure it.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name"
            type="text"
            placeholder="Your full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <Input
            label="Phone (optional)"
            type="tel"
            placeholder="9876543210"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Repeat password"
            value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            required
          />

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-600 font-medium hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
