"use client";

import { useEffect, useState } from "react";
import Header from "@/components/dashboard/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";

interface SalonProfile {
  _id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  isActive: boolean;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<SalonProfile | null>(null);
  const [form, setForm] = useState<Partial<SalonProfile>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ data: SalonProfile }>("/api/salon/profile")
      .then((res) => {
        setProfile(res.data);
        setForm(res.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSuccess("");
    setError("");
    try {
      const res = await api.put<{ data: SalonProfile }>("/api/salon/profile", {
        name: form.name,
        ownerName: form.ownerName,
        phone: form.phone,
        address: form.address,
        plan: form.plan,
      });
      setProfile(res.data);
      setSuccess("Profile updated successfully!");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div>
        <Header title="Salon Profile" />
        <div className="flex justify-center py-24">
          <Spinner className="w-10 h-10" />
        </div>
      </div>
    );

  return (
    <div>
      <Header title="Salon Profile" />
      <div className="p-6 max-w-2xl space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-medium">
            ✓ {success}
          </div>
        )}

        <Card className="p-6 space-y-5">
          <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
            <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{profile?.name}</p>
              <span
                className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  profile?.plan === "premium"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {profile?.plan?.toUpperCase()} Plan
              </span>
            </div>
          </div>

          <Input
            label="Salon Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Owner Name"
            value={form.ownerName || ""}
            onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
          />
          <Input
            label="Email"
            value={form.email || ""}
            disabled
            className="bg-slate-50 cursor-not-allowed"
          />
          <Input
            label="Phone"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Address
            </label>
            <textarea
              value={form.address || ""}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Plan
            </label>
            <select
              value={form.plan || "basic"}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          <div className="pt-2">
            <Button onClick={handleSave} loading={saving} size="lg">
              Save Changes
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
