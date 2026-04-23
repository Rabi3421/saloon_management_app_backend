"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Scissors, Mail, Lock, User, Phone, ShieldCheck, RefreshCw, Eye, EyeOff } from "lucide-react";
import { api, setToken } from "@/lib/apiClient";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

interface RegisterResponse {
  data: {
    token: string;
    user: { name: string; email: string; role: string };
    salon: { name: string };
  };
}

// ── OTP digit input ──────────────────────────────────────────────────────────
function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const digits = 6;
  const refs = Array.from({ length: digits }, () => useRef<HTMLInputElement>(null));

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      const arr = value.split("");
      if (arr[i]) {
        arr[i] = "";
        onChange(arr.join(""));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
        const arr2 = value.split("");
        arr2[i - 1] = "";
        onChange(arr2.join(""));
      }
    }
  };

  const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const char = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.padEnd(digits).split("");
    arr[i] = char;
    const next = arr.join("").slice(0, digits);
    onChange(next);
    if (char && i < digits - 1) refs[i + 1].current?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, digits);
    onChange(pasted.padEnd(digits));
    refs[Math.min(pasted.length, digits - 1)].current?.focus();
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: digits }).map((_, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className={cn(
            "w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all",
            value[i]
              ? "border-violet-500 bg-violet-50 text-violet-800"
              : "border-slate-200 bg-slate-50 text-slate-900",
            "focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          )}
        />
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();

  // Step 1 = details form, Step 2 = OTP entry
  const [step, setStep]       = useState<1 | 2>(1);
  const [form, setForm]       = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [otp,  setOtp]        = useState("");
  const [showPw, setShowPw]   = useState(false);
  const [showCp, setShowCp]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const salonId = process.env.NEXT_PUBLIC_SALON_ID;

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // ── Step 1: Send OTP ─────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!salonId) { setError("This app is not configured for a specific salon."); return; }
    if (!form.name.trim()) { setError("Please enter your full name."); return; }
    if (!form.email.trim()) { setError("Please enter your email."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      await api.post("/api/auth/send-registration-otp", { email: form.email });
      setStep(2);
      setOtp("");
      setResendCooldown(60);
      setSuccess(`OTP sent to ${form.email}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Resend OTP ───────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(""); setSuccess("");
    setLoading(true);
    try {
      await api.post("/api/auth/send-registration-otp", { email: form.email });
      setOtp("");
      setResendCooldown(60);
      setSuccess("New OTP sent to your email.");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: Verify OTP + Register ───────────────────────────────────────
  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (otp.replace(/\D/g, "").length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<RegisterResponse>("/api/auth/register-customer", {
        name:     form.name,
        email:    form.email,
        phone:    form.phone,
        password: form.password,
        otp:      otp.trim(),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header band */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
              {step === 1 ? <Scissors size={26} className="text-white" /> : <ShieldCheck size={26} className="text-white" />}
            </div>
            <h1 className="text-2xl font-bold">SalonOS</h1>
            <p className="text-white/80 text-sm mt-1">
              {step === 1 ? "Create your account" : "Verify your email"}
            </p>

            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {[1, 2].map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    s === step ? "w-8 bg-white" : s < step ? "w-4 bg-white/60" : "w-4 bg-white/30"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="px-8 py-8">
            {!salonId && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-xl px-4 py-3 mb-5">
                ⚠️ <strong>NEXT_PUBLIC_SALON_ID</strong> is not set. This page won&apos;t work until you configure it.
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                <ShieldCheck size={15} /> {success}
              </div>
            )}

            {/* ── Step 1: Details form ── */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-4">
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
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    label="Confirm Password"
                    type={showCp ? "text" : "password"}
                    placeholder="Repeat password"
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCp(!showCp)}
                    className="absolute right-3 top-9 text-slate-400 hover:text-slate-600"
                  >
                    {showCp ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>}

                <Button type="submit" className="w-full" loading={loading}>
                  Send Verification Code
                </Button>
              </form>
            )}

            {/* ── Step 2: OTP verification ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyAndRegister} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-2">We sent a 6-digit code to</p>
                  <p className="text-sm font-bold text-slate-800 bg-slate-100 rounded-lg px-4 py-2 inline-block">{form.email}</p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 text-center mb-3 font-medium">Enter OTP</p>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2 text-center">{error}</p>}

                <Button
                  type="submit"
                  className="w-full"
                  loading={loading}
                  disabled={otp.replace(/\D/g, "").length < 6}
                >
                  Verify & Create Account
                </Button>

                {/* Resend + back */}
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(""); setSuccess(""); }}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    ← Change email
                  </button>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className={cn(
                      "flex items-center gap-1.5 font-medium transition-colors",
                      resendCooldown > 0
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-indigo-600 hover:text-indigo-800"
                    )}
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-slate-400 mt-5">
          Already have an account?{" "}
          <a href="/login" className="text-indigo-300 font-medium hover:text-white transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}


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
