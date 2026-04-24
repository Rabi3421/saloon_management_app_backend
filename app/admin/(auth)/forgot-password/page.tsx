"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, Lock, Eye, EyeOff, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { cn } from "@/lib/utils";

// ── Completely rewritten OTP input — single useRef, no hooks-in-loops ─────────
function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const DIGITS = 6;
  const containerRef = useRef<HTMLDivElement>(null);

  function getInputs(): HTMLInputElement[] {
    if (!containerRef.current) return [];
    return Array.from(containerRef.current.querySelectorAll("input"));
  }

  function focus(index: number) {
    const inputs = getInputs();
    inputs[Math.max(0, Math.min(index, DIGITS - 1))]?.focus();
  }

  function handleChange(index: number, e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    // Handle if user types more than 1 char (mobile autocomplete etc.)
    if (raw.length > 1) {
      const next = raw.slice(0, DIGITS);
      onChange(next.padEnd(DIGITS, " ").slice(0, DIGITS));
      focus(Math.min(next.length, DIGITS - 1));
      return;
    }
    const char = raw.slice(-1);
    const arr = (value + "      ").slice(0, DIGITS).split("");
    arr[index] = char || " ";
    onChange(arr.join(""));
    if (char) focus(index + 1);
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = (value + "      ").slice(0, DIGITS).split("");
      if (arr[index].trim()) {
        arr[index] = " ";
        onChange(arr.join(""));
      } else if (index > 0) {
        arr[index - 1] = " ";
        onChange(arr.join(""));
        focus(index - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focus(index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focus(index + 1);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    onChange(pasted.padEnd(DIGITS, " ").slice(0, DIGITS));
    focus(Math.min(pasted.length, DIGITS - 1));
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.select();
  }

  const chars = (value + "      ").slice(0, DIGITS);

  return (
    <div ref={containerRef} className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length: DIGITS }).map((_, i) => (
        <input
          key={i}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={chars[i].trim()}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={handleFocus}
          autoComplete="one-time-code"
          className={cn(
            "w-12 h-14 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all",
            chars[i].trim()
              ? "border-violet-500 bg-violet-50 text-violet-800"
              : "border-slate-200 bg-slate-50 text-slate-900",
            "focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          )}
        />
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3;

export default function AdminForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("      ");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showCp, setShowCp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Step 1: Send OTP
  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) { setError("Please enter your email."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to send OTP");
      setOtp("      ");
      setStep(2);
      setResendCooldown(60);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  // Resend OTP
  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setOtp("      ");
      setResendCooldown(60);
    } catch {
      setError("Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const clean = otp.trim();
    if (clean.length < 6) { setError("Please enter the complete 6-digit OTP."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: clean }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Invalid OTP");
      setResetToken(data.data.resetToken);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP");
    } finally {
      setLoading(false);
    }
  }

  // Step 3: Reset password
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (newPassword !== confirmPw) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Reset failed");
      router.push("/admin/login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    1: "Enter Email",
    2: "Verify OTP",
    3: "New Password",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-700 to-violet-800 px-8 py-8 text-white text-center">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-violet-200 text-sm mt-1">SalonOS Admin</p>
            <div className="flex items-center justify-center gap-2 mt-4">
              {([1, 2, 3] as Step[]).map((s) => (
                <div
                  key={s}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    s === step ? "w-8 bg-white" : s < step ? "w-5 bg-white/60" : "w-5 bg-white/25"
                  )}
                />
              ))}
            </div>
            <p className="text-violet-200 text-xs mt-2">{stepLabels[step]}</p>
          </div>

          <div className="px-8 py-8">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-600 text-sm text-center border border-red-100">
                {error}
              </div>
            )}

            {/* ── Step 1: Email ── */}
            {step === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-5">
                <p className="text-sm text-slate-500 text-center">
                  Enter the email address associated with your admin account.
                </p>
                <Input
                  label="Admin Email"
                  type="email"
                  placeholder="admin@salonos.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  leftIcon={<Mail size={15} />}
                  autoComplete="email"
                  required
                />
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-violet-700 hover:bg-violet-800 focus:ring-violet-500"
                  loading={loading}
                >
                  Send OTP
                </Button>
                <p className="text-center text-sm">
                  <a href="/admin/login" className="text-violet-600 hover:underline">
                    ← Back to login
                  </a>
                </p>
              </form>
            )}

            {/* ── Step 2: OTP ── */}
            {step === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-2">We sent a 6-digit code to</p>
                  <p className="text-sm font-bold text-slate-800 bg-slate-100 rounded-lg px-4 py-2 inline-block">
                    {email}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 text-center mb-3 font-medium">Enter OTP</p>
                  <OtpInput value={otp} onChange={setOtp} />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-violet-700 hover:bg-violet-800 focus:ring-violet-500"
                  loading={loading}
                  disabled={otp.trim().length < 6}
                >
                  Verify OTP
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(""); }}
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
                        : "text-violet-600 hover:text-violet-800"
                    )}
                  >
                    <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Step 3: New password ── */}
            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <p className="text-sm text-slate-500 text-center">
                  Choose a new password for your admin account.
                </p>
                <div className="relative">
                  <Input
                    label="New Password"
                    type={showPw ? "text" : "password"}
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    leftIcon={<Lock size={15} />}
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
                    placeholder="Repeat new password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    leftIcon={<Lock size={15} />}
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
                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-violet-700 hover:bg-violet-800 focus:ring-violet-500"
                  loading={loading}
                >
                  Reset Password
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
