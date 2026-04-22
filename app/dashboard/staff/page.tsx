"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Pencil } from "lucide-react";
import Header from "@/components/dashboard/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";

interface WorkingHour {
  day: string;
  startTime: string;
  endTime: string;
}

interface Staff {
  _id: string;
  name: string;
  phone: string;
  specialization: string;
  workingHours: WorkingHour[];
  isActive: boolean;
}

const EMPTY = {
  name: "",
  phone: "",
  specialization: "",
};

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<Staff>>(EMPTY);
  const [error, setError] = useState("");

  const fetchStaff = () => {
    setLoading(true);
    api
      .get<{ data: Staff[] }>("/api/staff")
      .then((res) => setStaff(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchStaff, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal("add");
  };

  const openEdit = (s: Staff) => {
    setForm(s);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name || !form.specialization) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await api.post("/api/staff", form);
      }
      // extend with PUT /api/staff/[id] if needed
      fetchStaff();
      setModal(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = staff.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.specialization.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Staff" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Staff
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 flex justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="col-span-3 text-center text-slate-400 py-16 text-sm">
              No staff found
            </p>
          ) : (
            filtered.map((s) => (
              <Card key={s._id} className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.phone || "No phone"}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                    {s.specialization}
                  </span>
                  {s.workingHours.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {s.workingHours.slice(0, 2).map((wh, i) => (
                        <p key={i} className="text-xs text-slate-500">
                          {wh.day}: {wh.startTime} – {wh.endTime}
                        </p>
                      ))}
                      {s.workingHours.length > 2 && (
                        <p className="text-xs text-slate-400">
                          +{s.workingHours.length - 2} more days
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "add" ? "Add Staff Member" : "Edit Staff Member"}
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Priya Sharma"
          />
          <Input
            label="Phone"
            value={form.phone || ""}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="+91 98765 43210"
          />
          <Input
            label="Specialization"
            value={form.specialization || ""}
            onChange={(e) =>
              setForm({ ...form, specialization: e.target.value })
            }
            placeholder="e.g. Hair Styling, Makeup"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {modal === "add" ? "Add Member" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
