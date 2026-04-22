"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Eye, Pencil, Power } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";

interface SalonCounts {
  users: number;
  bookings: number;
  services: number;
  staff: number;
}

interface Salon {
  _id: string;
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
  _counts: SalonCounts;
}

export default function AdminSalonsPage() {
  const router = useRouter();
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [editModal, setEditModal] = useState<Salon | null>(null);
  const [editForm, setEditForm] = useState<Partial<Salon>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchSalons = (q?: string, plan?: string, active?: string) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q ?? search) params.search = q ?? search;
    if (plan ?? planFilter) params.plan = plan ?? planFilter;
    if ((active ?? activeFilter) !== "") params.isActive = active ?? activeFilter;
    adminApi
      .get<{ data: Salon[] }>("/api/admin/salons", params)
      .then((r) => setSalons(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    fetchSalons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (s: Salon) => {
    setEditForm(s);
    setEditModal(s);
  };

  const handleSave = async () => {
    if (!editModal) return;
    setSaving(true);
    try {
      await adminApi.put(`/api/admin/salons/${editModal._id}`, {
        name: editForm.name,
        ownerName: editForm.ownerName,
        phone: editForm.phone,
        address: editForm.address,
        plan: editForm.plan,
      });
      setEditModal(null);
      fetchSalons();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (s: Salon) => {
    if (!confirm(`${s.isActive ? "Deactivate" : "Activate"} "${s.name}"?`)) return;
    try {
      if (s.isActive) {
        await adminApi.delete(`/api/admin/salons/${s._id}`);
      } else {
        await adminApi.put(`/api/admin/salons/${s._id}`, { isActive: true });
      }
      fetchSalons();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  return (
    <div>
      <AdminHeader title="All Salons" />
      <div className="p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search salons..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              fetchSalons(e.target.value, planFilter, activeFilter);
            }}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />
          <div className="relative">
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value);
                fetchSalons(search, e.target.value, activeFilter);
              }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Plans</option>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value);
                fetchSalons(search, planFilter, e.target.value);
              }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : salons.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">No salons found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["Salon", "Owner", "Plan", "Users", "Bookings", "Services", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salons.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-slate-700">{s.ownerName}</p>
                        <p className="text-xs text-slate-400">{s.phone}</p>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={s.plan === "premium" ? "warning" : "default"}>
                          {s.plan}
                        </Badge>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{s._counts.users}</td>
                      <td className="px-5 py-4 text-slate-700">{s._counts.bookings}</td>
                      <td className="px-5 py-4 text-slate-700">{s._counts.services}</td>
                      <td className="px-5 py-4">
                        <Badge variant={s.isActive ? "success" : "danger"}>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <a
                            href={`/admin/salons/${s._id}`}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                            title="View detail"
                          >
                            <Eye size={15} />
                          </a>
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => toggleActive(s)}
                            className={`p-1.5 rounded-lg transition-colors ${s.isActive ? "hover:bg-red-50 text-red-500" : "hover:bg-emerald-50 text-emerald-600"}`}
                            title={s.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={15} />
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

        <p className="text-xs text-slate-400">{salons.length} salon(s) found</p>
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editModal} onClose={() => setEditModal(null)} title="Edit Salon" size="md">
        <div className="space-y-4">
          <Input label="Salon Name" value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
          <Input label="Owner Name" value={editForm.ownerName || ""} onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })} />
          <Input label="Phone" value={editForm.phone || ""} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Plan</label>
            <select
              value={editForm.plan || "basic"}
              onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Address</label>
            <textarea
              value={editForm.address || ""}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="bg-rose-700 hover:bg-rose-800 focus:ring-rose-500">Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
