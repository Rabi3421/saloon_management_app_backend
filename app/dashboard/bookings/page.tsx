"use client";

import { useEffect, useState } from "react";
import { Plus, Search, ChevronDown } from "lucide-react";
import Header from "@/components/dashboard/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";

interface Booking {
  _id: string;
  status: string;
  timeSlot: string;
  bookingDate: string;
  notes?: string;
  customerId: { _id: string; name: string; email: string };
  serviceId: { _id: string; name: string; price: number };
  staffId: { _id: string; name: string };
}

interface StaffOption {
  _id: string;
  name: string;
}
interface ServiceOption {
  _id: string;
  name: string;
  price: number;
}

const STATUSES = ["", "pending", "confirmed", "completed", "cancelled"];

const EMPTY_FORM = {
  customerId: "",
  staffId: "",
  serviceId: "",
  bookingDate: "",
  timeSlot: "",
  notes: "",
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [error, setError] = useState("");

  const fetchAll = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    Promise.all([
      api.get<{ data: Booking[] }>("/api/bookings", params),
      api.get<{ data: StaffOption[] }>("/api/staff"),
      api.get<{ data: ServiceOption[] }>("/api/services"),
    ])
      .then(([b, s, sv]) => {
        setBookings(b.data);
        setStaff(s.data);
        setServices(sv.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAll, [statusFilter]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal("add");
  };

  const openEdit = (b: Booking) => {
    setEditId(b._id);
    setEditStatus(b.status);
    setModal("edit");
  };

  const handleCreate = async () => {
    if (!form.staffId || !form.serviceId || !form.bookingDate || !form.timeSlot)
      return;
    setSaving(true);
    try {
      await api.post("/api/bookings", form);
      fetchAll();
      setModal(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!editId) return;
    setSaving(true);
    try {
      await api.put(`/api/bookings/${editId}`, { status: editStatus });
      fetchAll();
      setModal(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const filtered = bookings.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.customerId?.name?.toLowerCase().includes(q) ||
      b.serviceId?.name?.toLowerCase().includes(q) ||
      b.staffId?.name?.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <Header title="Bookings" />
      <div className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-3 flex-wrap">
            <Input
              placeholder="Search bookings..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search size={15} />}
              className="sm:w-64"
            />
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s || "All Statuses"}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>
          <Button onClick={openAdd}>
            <Plus size={16} /> New Booking
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">
              No bookings found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {[
                      "Customer",
                      "Service",
                      "Staff",
                      "Date",
                      "Time",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((b) => (
                    <tr
                      key={b._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-900">
                          {b.customerId?.name || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.customerId?.email}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-slate-700">
                          {b.serviceId?.name || "—"}
                        </p>
                        <p className="text-xs text-slate-400">
                          ₹{b.serviceId?.price}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {b.staffId?.name || "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {new Date(b.bookingDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{b.timeSlot}</td>
                      <td className="px-6 py-4">
                        <Badge variant={bookingStatusBadge(b.status)}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEdit(b)}
                          className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Create Booking Modal */}
      <Modal
        isOpen={modal === "add"}
        onClose={() => setModal(null)}
        title="New Booking"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Customer ID (User _id)"
            value={form.customerId}
            onChange={(e) => setForm({ ...form, customerId: e.target.value })}
            placeholder="MongoDB ObjectId of customer"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Staff
              </label>
              <select
                value={form.staffId}
                onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select staff</option>
                {staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Service
              </label>
              <select
                value={form.serviceId}
                onChange={(e) =>
                  setForm({ ...form, serviceId: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select service</option>
                {services.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.name} — ₹{s.price}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={form.bookingDate}
              onChange={(e) =>
                setForm({ ...form, bookingDate: e.target.value })
              }
            />
            <Input
              label="Time Slot"
              placeholder="e.g. 10:00 AM"
              value={form.timeSlot}
              onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
            />
          </div>
          <Input
            label="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={saving}>
              Create Booking
            </Button>
          </div>
        </div>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        isOpen={modal === "edit"}
        onClose={() => setModal(null)}
        title="Update Booking Status"
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {["pending", "confirmed", "completed", "cancelled"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} loading={saving}>
              Update Status
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
