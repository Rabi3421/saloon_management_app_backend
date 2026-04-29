"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  KeyRound,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";

interface SalonOption {
  _id: string;
  name: string;
  email?: string;
}

interface StaffRow {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  specialization: string;
  isActive: boolean;
  createdAt?: string;
  salonId:
    | {
        _id: string;
        name: string;
        email?: string;
        plan?: string;
        isActive?: boolean;
      }
    | null;
  userId:
    | {
        _id: string;
        email: string;
        phone?: string;
        isActive: boolean;
        createdAt?: string;
      }
    | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "All Staff" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function AdminStaffPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [salons, setSalons] = useState<SalonOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [salonFilter, setSalonFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const [form, setForm] = useState({
    salonId: "",
    name: "",
    email: "",
    phone: "",
    specialization: "",
    password: "",
    isActive: true,
  });

  const fetchStaff = (next?: { q?: string; salonId?: string; status?: string }) => {
    setLoading(true);
    const params: Record<string, string> = {};
    const q = next?.q ?? search;
    const salonId = next?.salonId ?? salonFilter;
    const status = next?.status ?? statusFilter;
    if (q) params.search = q;
    if (salonId) params.salonId = salonId;
    if (status && status !== "all") params.status = status;

    adminApi
      .get<{ data: StaffRow[] }>("/api/admin/staff", params)
      .then((response) => setStaff(Array.isArray(response.data) ? response.data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }

    adminApi
      .get<{ data: SalonOption[] }>("/api/admin/salons")
      .then((response) => {
        const data = Array.isArray(response.data) ? response.data : [];
        setSalons(data.map((salon) => ({ _id: salon._id, name: salon.name, email: salon.email })));
      })
      .catch((e) => setError(e.message));

    fetchStaff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingStaff(null);
    setForm({
      salonId: "",
      name: "",
      email: "",
      phone: "",
      specialization: "",
      password: "",
      isActive: true,
    });
    setModalError("");
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (item: StaffRow) => {
    setEditingStaff(item);
    setForm({
      salonId: item.salonId?._id || "",
      name: item.name || "",
      email: item.email || item.userId?.email || "",
      phone: item.phone || item.userId?.phone || "",
      specialization: item.specialization || "",
      password: "",
      isActive: item.isActive,
    });
    setModalError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.specialization.trim()) {
      setModalError("Name, email and specialization are required.");
      return;
    }

    if (!editingStaff && form.password.trim().length < 6) {
      setModalError("Password must be at least 6 characters.");
      return;
    }

    if (!editingStaff && !form.salonId) {
      setModalError("Please choose a salon for this staff account.");
      return;
    }

    setSaving(true);
    setModalError("");

    try {
      const payload = {
        salonId: form.salonId,
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        specialization: form.specialization.trim(),
        isActive: form.isActive,
        ...(form.password.trim() ? { password: form.password.trim() } : {}),
      };

      if (editingStaff) {
        await adminApi.put(`/api/admin/staff/${editingStaff._id}`, payload);
      } else {
        await adminApi.post("/api/admin/staff", payload);
      }

      setShowModal(false);
      resetForm();
      fetchStaff();
    } catch (e: unknown) {
      setModalError(e instanceof Error ? e.message : "Failed to save staff member");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: StaffRow) => {
    try {
      await adminApi.put(`/api/admin/staff/${item._id}`, { isActive: !item.isActive });
      fetchStaff();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update staff status");
    }
  };

  const handleDelete = async (item: StaffRow) => {
    if (!confirm(`Permanently delete staff member "${item.name}"? This also removes their login account.`)) {
      return;
    }
    setDeleting(item._id);
    try {
      await adminApi.delete(`/api/admin/staff/${item._id}`);
      fetchStaff();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete staff member");
    } finally {
      setDeleting(null);
    }
  };

  const counts = useMemo(() => ({
    total: staff.length,
    active: staff.filter((item) => item.isActive).length,
    inactive: staff.filter((item) => !item.isActive).length,
  }), [staff]);

  return (
    <div>
      <AdminHeader title="Staff Management" />
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Total Staff", value: counts.total, sub: "Across all salons" },
            { label: "Active Staff", value: counts.active, sub: "Can log in now" },
            { label: "Inactive Staff", value: counts.inactive, sub: "Access disabled" },
          ].map((card) => (
            <Card key={card.label} className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="mt-1 text-sm text-slate-500">{card.sub}</p>
            </Card>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search staff..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchStaff({ q: e.target.value });
            }}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />
          <div className="relative">
            <select
              value={salonFilter}
              onChange={(e) => {
                setSalonFilter(e.target.value);
                fetchStaff({ salonId: e.target.value });
              }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">All Salons</option>
              {salons.map((salon) => (
                <option key={salon._id} value={salon._id}>{salon.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                fetchStaff({ status: e.target.value });
              }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="ml-auto">
            <Button onClick={openCreate} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
              <Plus size={15} /> Add Staff
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : staff.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">No staff members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {[
                      "Staff",
                      "Salon",
                      "Contact",
                      "Specialization",
                      "Login",
                      "Status",
                      "Actions",
                    ].map((heading) => (
                      <th key={heading} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staff.map((item) => (
                    <tr key={item._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{item.name}</p>
                            <p className="text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {item.salonId ? (
                          <a href={`/admin/salons/${item.salonId._id}`} className="text-indigo-600 hover:underline font-medium text-xs">
                            {item.salonId.name}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <p>{item.email || item.userId?.email || "—"}</p>
                        <p className="text-xs text-slate-400 mt-1">{item.phone || item.userId?.phone || "No phone"}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant="info">{item.specialization}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={item.userId?.isActive ? "success" : "warning"}>
                          {item.userId?.isActive ? "Enabled" : "Disabled"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={item.isActive ? "success" : "danger"}>
                          {item.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                            title="Edit staff"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => openEdit(item)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                            title="Reset password"
                          >
                            <KeyRound size={14} />
                          </button>
                          <button
                            onClick={() => toggleActive(item)}
                            className={`p-1.5 rounded-lg transition-colors ${item.isActive ? "hover:bg-red-50 text-red-400" : "hover:bg-emerald-50 text-emerald-600"}`}
                            title={item.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deleting === item._id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-40"
                            title="Delete staff"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-slate-400">{staff.length} staff member(s) found</p>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingStaff ? `Edit Staff — ${editingStaff.name}` : "Create Staff Account"}
        size="sm"
      >
        <div className="space-y-4">
          {modalError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{modalError}</p>}

          {!editingStaff && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Salon *</label>
              <select
                value={form.salonId}
                onChange={(e) => setForm((prev) => ({ ...prev, salonId: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Select salon</option>
                {salons.map((salon) => (
                  <option key={salon._id} value={salon._id}>{salon.name}</option>
                ))}
              </select>
            </div>
          )}

          <Input label="Full Name *" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
          <Input label="Login Email *" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <Input label="Specialization *" value={form.specialization} onChange={(e) => setForm((prev) => ({ ...prev, specialization: e.target.value }))} />
          <Input
            label={editingStaff ? "Reset Password" : "Temporary Password *"}
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
            placeholder={editingStaff ? "Leave blank to keep current password" : "Min. 6 characters"}
          />

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Login Active</label>
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, isActive: !prev.isActive }))}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.isActive ? "translate-x-5" : ""}`} />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
              {editingStaff ? "Save Changes" : "Create Staff"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}