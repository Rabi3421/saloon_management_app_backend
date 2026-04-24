"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ChevronDown, Pencil, Trash2, CalendarDays, RefreshCw, Plus,
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";

interface SalonRef  { _id: string; name: string }
interface UserRef   { _id: string; name: string; email: string; phone: string; role: string }
interface ServiceRef { _id: string; name: string; price: number; duration: number }
interface StaffRef  { _id: string; name: string; specialization: string }

interface SalonDetail {
  users: UserRef[];
  services: ServiceRef[];
  staff: StaffRef[];
}

interface Booking {
  _id: string;
  status: string;
  timeSlot: string;
  bookingDate: string;
  notes: string;
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  salonId: SalonRef | null;
  customerId: UserRef | null;
  staffId: StaffRef | null;
  serviceId: ServiceRef | null;
}

const STATUSES = ["", "pending", "confirmed", "completed", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid"];

function AdminBookingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [total, setTotal]       = useState(0);
  const [pages, setPages]       = useState(1);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  // Filters
  const [search,        setSearch]        = useState("");
  const [statusFilter,  setStatusFilter]  = useState("");
  const [salonIdFilter, setSalonIdFilter] = useState(searchParams.get("salonId") || "");
  const [dateFilter,    setDateFilter]    = useState("");

  // Edit modal
  const [editBooking, setEditBooking] = useState<Booking | null>(null);
  const [editForm,    setEditForm]    = useState({ status: "", timeSlot: "", notes: "", paymentStatus: "" });
  const [saving,      setSaving]      = useState(false);
  const [editError,   setEditError]   = useState("");

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

  // New booking modal
  const [showNewBooking,   setShowNewBooking]   = useState(false);
  const [allSalons,        setAllSalons]        = useState<SalonRef[]>([]);
  const [salonDetail,      setSalonDetail]      = useState<SalonDetail | null>(null);
  const [salonDetailLoad,  setSalonDetailLoad]  = useState(false);
  const [newForm, setNewForm] = useState({
    salonId: "", customerId: "", serviceId: "", staffId: "",
    bookingDate: "", timeSlot: "", notes: "",
  });
  const [creating,   setCreating]   = useState(false);
  const [createError, setCreateError] = useState("");

  const fetchBookings = useCallback((opts?: {
    p?: number; q?: string; st?: string; sid?: string; dt?: string;
  }) => {
    setLoading(true);
    setError("");
    const params: Record<string, string> = {};
    const p  = opts?.p  ?? page;
    const q  = opts?.q  ?? search;
    const st = opts?.st ?? statusFilter;
    const sid = opts?.sid ?? salonIdFilter;
    const dt = opts?.dt ?? dateFilter;
    if (p  > 1)  params.page    = String(p);
    if (q)       params.search  = q;
    if (st)      params.status  = st;
    if (sid)     params.salonId = sid;
    if (dt)      params.date    = dt;
    adminApi
      .get<{ data: { bookings: Booking[]; total: number; pages: number } }>(
        "/api/admin/bookings", params
      )
      .then((r) => {
        setBookings(r.data.bookings);
        setTotal(r.data.total);
        setPages(r.data.pages);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [page, search, statusFilter, salonIdFilter, dateFilter]);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openEdit = (b: Booking) => {
    setEditBooking(b);
    setEditForm({
      status:        b.status,
      timeSlot:      b.timeSlot,
      notes:         b.notes || "",
      paymentStatus: b.paymentStatus || "unpaid",
    });
    setEditError("");
  };

  const handleSave = async () => {
    if (!editBooking) return;
    setSaving(true);
    setEditError("");
    try {
      await adminApi.put(`/api/admin/bookings/${editBooking._id}`, editForm);
      setEditBooking(null);
      fetchBookings();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (b: Booking) => {
    if (!confirm(`Permanently delete booking for "${b.customerId?.name ?? "customer"}"? This cannot be undone.`)) return;
    setDeleting(b._id);
    try {
      await adminApi.delete(`/api/admin/bookings/${b._id}`);
      fetchBookings();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(null);
    }
  };

  const openNewBooking = () => {
    setNewForm({ salonId: "", customerId: "", serviceId: "", staffId: "", bookingDate: "", timeSlot: "", notes: "" });
    setSalonDetail(null);
    setCreateError("");
    setShowNewBooking(true);
    // Fetch all salons for the dropdown
    if (allSalons.length === 0) {
      adminApi
        .get<{ data: SalonRef[] }>("/api/admin/salons")
        .then((r) => setAllSalons(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  };

  const onNewSalonChange = (salonId: string) => {
    setNewForm((f) => ({ ...f, salonId, customerId: "", serviceId: "", staffId: "" }));
    setSalonDetail(null);
    if (!salonId) return;
    setSalonDetailLoad(true);
    adminApi
      .get<{ data: SalonDetail }>(`/api/admin/salons/${salonId}`)
      .then((r) => setSalonDetail(r.data))
      .catch(() => {})
      .finally(() => setSalonDetailLoad(false));
  };

  const handleCreate = async () => {
    if (!newForm.salonId)     { setCreateError("Please select a salon."); return; }
    if (!newForm.customerId)  { setCreateError("Please select a customer."); return; }
    if (!newForm.serviceId)   { setCreateError("Please select a service."); return; }
    if (!newForm.staffId)     { setCreateError("Please select a staff member."); return; }
    if (!newForm.bookingDate) { setCreateError("Please pick a booking date."); return; }
    if (!newForm.timeSlot)    { setCreateError("Please enter a time slot."); return; }
    setCreating(true);
    setCreateError("");
    try {
      await adminApi.post("/api/admin/bookings", newForm);
      setShowNewBooking(false);
      fetchBookings();
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Error");
    } finally {
      setCreating(false);
    }
  };

  const applyFilter = (opts: { q?: string; st?: string; sid?: string; dt?: string }) => {
    setPage(1);
    fetchBookings({ p: 1, ...opts });
  };

  return (
    <div>
      <AdminHeader title="All Bookings" />
      <div className="p-6 space-y-4">

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div />
          <Button
            onClick={openNewBooking}
            className="flex items-center gap-2 bg-violet-700 hover:bg-violet-800 focus:ring-violet-500 text-sm"
          >
            <Plus size={15} /> New Booking
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Input
            placeholder="Search customer or salon…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); applyFilter({ q: e.target.value }); }}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />

          {/* Status */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); applyFilter({ st: e.target.value }); }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s || "All Statuses"}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Date */}
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => { setDateFilter(e.target.value); applyFilter({ dt: e.target.value }); }}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          />

          {/* Salon ID filter (pre-filled from query param) */}
          {salonIdFilter && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
              <CalendarDays size={13} />
              Filtered by salon
              <button
                onClick={() => { setSalonIdFilter(""); applyFilter({ sid: "" }); }}
                className="ml-1 text-indigo-400 hover:text-indigo-700"
              >✕</button>
            </div>
          )}

          <button
            onClick={() => { setSearch(""); setStatusFilter(""); setDateFilter(""); setSalonIdFilter(""); fetchBookings({ p: 1, q: "", st: "", sid: "", dt: "" }); }}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
            title="Reset filters"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">No bookings found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["Customer", "Salon", "Service", "Staff", "Date & Time", "Amount", "Payment", "Status", "Actions"].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{b.customerId?.name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{b.customerId?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        {b.salonId ? (
                          <a href={`/admin/salons/${b.salonId._id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                            {b.salonId.name}
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{b.serviceId?.name ?? "—"}</p>
                        <p className="text-xs text-slate-400">{b.serviceId?.duration} min</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{b.staffId?.name ?? "—"}</td>
                      <td className="px-4 py-3">
                        <p className="text-slate-700">{new Date(b.bookingDate).toLocaleDateString()}</p>
                        <p className="text-xs text-slate-400">{b.timeSlot}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {b.totalAmount ? `₹${b.totalAmount}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={b.paymentStatus === "paid" ? "success" : "danger"}>
                          {b.paymentStatus || "unpaid"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={bookingStatusBadge(b.status)}>{b.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(b)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                            title="Edit booking"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(b)}
                            disabled={deleting === b._id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors disabled:opacity-40"
                            title="Delete booking"
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

        {/* Pagination + count */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">{total} booking(s) total</p>
          {pages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => { const p = page - 1; setPage(p); fetchBookings({ p }); }}
                disabled={page <= 1}
                className="text-xs px-3 py-1.5"
              >← Prev</Button>
              <span className="text-xs text-slate-500">Page {page} of {pages}</span>
              <Button
                variant="outline"
                onClick={() => { const p = page + 1; setPage(p); fetchBookings({ p }); }}
                disabled={page >= pages}
                className="text-xs px-3 py-1.5"
              >Next →</Button>
            </div>
          )}
        </div>
      </div>

      {/* New Booking Modal */}
      <Modal isOpen={showNewBooking} onClose={() => setShowNewBooking(false)} title="New Booking" size="sm">
        <div className="space-y-4">
          {createError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createError}</p>}

          {/* Salon */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Salon <span className="text-red-500">*</span></label>
            <select
              value={newForm.salonId}
              onChange={(e) => onNewSalonChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Select salon…</option>
              {allSalons.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {salonDetailLoad && <p className="text-xs text-slate-400">Loading salon data…</p>}

          {salonDetail && (
            <>
              {/* Warn if salon has no customers/services/staff */}
              {salonDetail.users.filter((u) => u.role === "customer").length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">⚠️ This salon has no registered customers yet.</p>
              )}
              {salonDetail.services.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">⚠️ This salon has no services yet. Add services first.</p>
              )}
              {salonDetail.staff.length === 0 && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">⚠️ This salon has no staff members yet.</p>
              )}

              {/* Customer */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer <span className="text-red-500">*</span></label>
                <select
                  value={newForm.customerId}
                  onChange={(e) => setNewForm((f) => ({ ...f, customerId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                >
                  <option value="">— Select customer —</option>
                  {salonDetail.users
                    .filter((u) => u.role === "customer")
                    .map((u) => <option key={u._id} value={u._id}>{u.name} ({u.email})</option>)}
                </select>
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Service <span className="text-red-500">*</span></label>
                <select
                  value={newForm.serviceId}
                  onChange={(e) => setNewForm((f) => ({ ...f, serviceId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  disabled={salonDetail.services.length === 0}
                >
                  <option value="">{salonDetail.services.length === 0 ? "No services available" : "— Select service —"}</option>
                  {salonDetail.services.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} — ₹{s.price} ({s.duration} min)</option>
                  ))}
                </select>
              </div>

              {/* Staff */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Staff Member <span className="text-red-500">*</span></label>
                <select
                  value={newForm.staffId}
                  onChange={(e) => setNewForm((f) => ({ ...f, staffId: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                  disabled={salonDetail.staff.length === 0}
                >
                  <option value="">{salonDetail.staff.length === 0 ? "No staff available" : "— Select staff —"}</option>
                  {salonDetail.staff.map((s) => (
                    <option key={s._id} value={s._id}>{s.name} · {s.specialization}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Booking Date <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={newForm.bookingDate}
              onChange={(e) => setNewForm((f) => ({ ...f, bookingDate: e.target.value }))}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>

          {/* Time slot */}
          <Input
            label="Time Slot *"
            value={newForm.timeSlot}
            onChange={(e) => setNewForm((f) => ({ ...f, timeSlot: e.target.value }))}
            placeholder="e.g. 10:00 AM"
          />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={newForm.notes}
              onChange={(e) => setNewForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              placeholder="Optional notes…"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowNewBooking(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={creating} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
              Create Booking
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Booking Modal */}
      <Modal isOpen={!!editBooking} onClose={() => setEditBooking(null)} title="Edit Booking" size="sm">
        <div className="space-y-4">
          {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}

          <div>
            <p className="text-xs text-slate-400 mb-0.5">Customer</p>
            <p className="text-sm font-medium text-slate-800">{editBooking?.customerId?.name} · {editBooking?.customerId?.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {["pending","confirmed","completed","cancelled"].map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment Status</label>
            <select
              value={editForm.paymentStatus}
              onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {PAYMENT_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>

          <Input
            label="Time Slot"
            value={editForm.timeSlot}
            onChange={(e) => setEditForm({ ...editForm, timeSlot: e.target.value })}
            placeholder="e.g. 10:00 AM"
          />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditBooking(null)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function AdminBookingsPageWrapper() {
  return (
    <Suspense>
      <AdminBookingsPage />
    </Suspense>
  );
}
