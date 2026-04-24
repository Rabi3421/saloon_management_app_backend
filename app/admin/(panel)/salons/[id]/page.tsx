"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Store, Users, CalendarDays, Scissors, Users2, Copy, Check, Plus } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";
import { cn } from "@/lib/utils";

type TabKey = "overview" | "users" | "bookings" | "services" | "staff";

interface SalonDetail {
  salon: {
    _id: string;
    name: string;
    ownerName: string;
    email: string;
    phone: string;
    address: string;
    plan: string;
    isActive: boolean;
    createdAt: string;
  };
  users: { _id: string; name: string; email: string; role: string; phone: string; isActive: boolean; createdAt: string }[];
  bookings: { _id: string; status: string; timeSlot: string; bookingDate: string; customerId: { name: string; email: string }; serviceId: { name: string; price: number }; staffId: { name: string } }[];
  services: { _id: string; name: string; price: number; duration: number; category: string; isActive: boolean }[];
  staff: { _id: string; name: string; phone: string; specialization: string; isActive: boolean }[];
}

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <Store size={15} /> },
  { key: "users", label: "Users", icon: <Users size={15} /> },
  { key: "bookings", label: "Bookings", icon: <CalendarDays size={15} /> },
  { key: "services", label: "Services", icon: <Scissors size={15} /> },
  { key: "staff", label: "Staff", icon: <Users2 size={15} /> },
];

export default function SalonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData]       = useState<SalonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [error, setError]     = useState("");
  const [copied, setCopied]   = useState(false);

  // ── Add Service modal ──────────────────────────────────────────────
  const [showAddService, setShowAddService] = useState(false);
  const [serviceForm, setServiceForm] = useState({ name: "", price: "", duration: "", category: "", description: "" });
  const [savingService, setSavingService] = useState(false);
  const [serviceError, setServiceError]   = useState("");

  // ── Add Staff modal ────────────────────────────────────────────────
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [staffForm, setStaffForm] = useState({ name: "", phone: "", specialization: "" });
  const [savingStaff, setSavingStaff] = useState(false);
  const [staffError, setStaffError]   = useState("");

  // ── Add Customer modal ─────────────────────────────────────────────
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [customerError, setCustomerError]   = useState("");

  const copyId = () => {
    if (!data) return;
    navigator.clipboard.writeText(data.salon._id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const reload = () => {
    setLoading(true);
    adminApi
      .get<{ data: SalonDetail }>(`/api/admin/salons/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, router]);

  const handleAddService = async () => {
    setSavingService(true); setServiceError("");
    try {
      await adminApi.post(`/api/admin/salons/${id}/services`, {
        ...serviceForm,
        price:    Number(serviceForm.price),
        duration: Number(serviceForm.duration),
      });
      setShowAddService(false);
      setServiceForm({ name: "", price: "", duration: "", category: "", description: "" });
      reload();
    } catch (e: unknown) { setServiceError(e instanceof Error ? e.message : "Error"); }
    finally { setSavingService(false); }
  };

  const handleAddStaff = async () => {
    setSavingStaff(true); setStaffError("");
    try {
      await adminApi.post(`/api/admin/salons/${id}/staff`, staffForm);
      setShowAddStaff(false);
      setStaffForm({ name: "", phone: "", specialization: "" });
      reload();
    } catch (e: unknown) { setStaffError(e instanceof Error ? e.message : "Error"); }
    finally { setSavingStaff(false); }
  };

  const handleAddCustomer = async () => {
    setSavingCustomer(true); setCustomerError("");
    try {
      await adminApi.post(`/api/admin/salons/${id}/customers`, customerForm);
      setShowAddCustomer(false);
      setCustomerForm({ name: "", email: "", phone: "", password: "" });
      reload();
    } catch (e: unknown) { setCustomerError(e instanceof Error ? e.message : "Error"); }
    finally { setSavingCustomer(false); }
  };

  if (loading)
    return (
      <div>
        <AdminHeader title="Salon Detail" />
        <div className="flex justify-center py-24"><Spinner className="w-10 h-10" /></div>
      </div>
    );

  if (error || !data)
    return (
      <div>
        <AdminHeader title="Salon Detail" />
        <div className="p-6"><p className="text-red-500">{error || "Not found"}</p></div>
      </div>
    );

  const { salon, users, bookings, services, staff } = data;

  return (
    <>
    <div>
      <AdminHeader title={salon.name} />
      <div className="p-6 space-y-5">
        {/* Back */}
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft size={16} /> Back to Salons
        </button>

        {/* Salon summary card */}
        <Card className="p-6">
          <div className="flex flex-wrap items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold shrink-0">
              {salon.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div><p className="text-xs text-slate-400">Salon Name</p><p className="font-semibold text-slate-900">{salon.name}</p></div>
              <div><p className="text-xs text-slate-400">Owner</p><p className="font-medium text-slate-700">{salon.ownerName}</p></div>
              <div><p className="text-xs text-slate-400">Email</p><p className="text-slate-700">{salon.email}</p></div>
              <div><p className="text-xs text-slate-400">Phone</p><p className="text-slate-700">{salon.phone}</p></div>
              <div><p className="text-xs text-slate-400">Address</p><p className="text-slate-700">{salon.address}</p></div>
              <div><p className="text-xs text-slate-400">Joined</p><p className="text-slate-700">{new Date(salon.createdAt).toLocaleDateString()}</p></div>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-slate-400 mb-1">Salon ID</p>
                <button
                  onClick={copyId}
                  className="flex items-center gap-2 font-mono text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors border border-slate-200 w-fit"
                  title="Click to copy Salon ID"
                >
                  {salon._id}
                  {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} className="text-slate-400" />}
                  <span className="text-slate-400 text-[10px] ml-1">{copied ? "Copied!" : "Copy"}</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1">Use this as <code className="bg-slate-100 px-1 rounded">NEXT_PUBLIC_SALON_ID</code> in the salon app&apos;s <code className="bg-slate-100 px-1 rounded">.env.local</code></p>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              <Badge variant={salon.plan === "premium" ? "warning" : "default"}>{salon.plan.toUpperCase()}</Badge>
              <Badge variant={salon.isActive ? "success" : "danger"}>{salon.isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </div>
          {/* Quick counts */}
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-4 gap-3 text-center">
            {[
              { label: "Users", val: users.length },
              { label: "Bookings", val: bookings.length },
              { label: "Services", val: services.length },
              { label: "Staff", val: staff.length },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-50 rounded-xl py-3">
                <p className="text-2xl font-bold text-slate-900">{val}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                activeTab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {t.icon} {t.label}
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                activeTab === t.key ? "bg-violet-100 text-violet-700" : "bg-slate-200 text-slate-500"
              )}>
                {t.key === "overview" ? "" : t.key === "users" ? users.length : t.key === "bookings" ? bookings.length : t.key === "services" ? services.length : staff.length}
              </span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "overview" && (
          <Card>
            <div className="px-6 py-4 border-b border-slate-100"><h3 className="font-semibold text-slate-900">Recent Activity</h3></div>
            <div className="p-6 text-sm text-slate-500">
              {bookings.length === 0 ? "No bookings yet for this salon." : (
                <div className="space-y-2">
                  {bookings.slice(0, 5).map((b) => (
                    <div key={b._id} className="flex items-center justify-between py-2 border-b border-slate-50">
                      <div>
                        <span className="font-medium text-slate-800">{b.customerId?.name}</span>
                        <span className="text-slate-400"> → </span>
                        <span className="text-slate-600">{b.serviceId?.name}</span>
                      </div>
                      <Badge variant={bookingStatusBadge(b.status)}>{b.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "users" && (
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Salon Customers</p>
              <Button onClick={() => { setCustomerError(""); setShowAddCustomer(true); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
                <Plus size={13} /> Add Customer
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  {["Name", "Email", "Phone", "Role", "Status", "Joined"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{u.name}</td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3 text-slate-500">{u.phone || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant={u.role === "owner" ? "purple" : u.role === "staff" ? "info" : "default"}>{u.role}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "bookings" && (
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Bookings</p>
              <Button
                onClick={() => router.push(`/admin/bookings?salonId=${id}`)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-700 hover:bg-violet-800 focus:ring-violet-500"
              >
                <Plus size={13} /> New Booking
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  {["Customer", "Service", "Staff", "Date", "Time", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {bookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{b.customerId?.name || "—"}</p>
                        <p className="text-xs text-slate-400">{b.customerId?.email}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-slate-700">{b.serviceId?.name || "—"}</p>
                        <p className="text-xs text-slate-400">₹{b.serviceId?.price}</p>
                      </td>
                      <td className="px-5 py-3 text-slate-700">{b.staffId?.name || "—"}</td>
                      <td className="px-5 py-3 text-slate-700">{new Date(b.bookingDate).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-slate-500">{b.timeSlot}</td>
                      <td className="px-5 py-3"><Badge variant={bookingStatusBadge(b.status)}>{b.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "services" && (
          <Card>
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-700">Services</p>
              <Button onClick={() => { setServiceError(""); setShowAddService(true); }} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
                <Plus size={13} /> Add Service
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50">
                  {["Name", "Category", "Price", "Duration", "Status"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {services.map((s) => (
                    <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-slate-900">{s.name}</td>
                      <td className="px-5 py-3"><Badge variant="purple">{s.category}</Badge></td>
                      <td className="px-5 py-3 font-medium text-slate-700">₹{s.price}</td>
                      <td className="px-5 py-3 text-slate-500">{s.duration} min</td>
                      <td className="px-5 py-3"><Badge variant={s.isActive ? "success" : "danger"}>{s.isActive ? "Active" : "Inactive"}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === "staff" && (
          <>
            <div className="flex justify-end">
              <Button onClick={() => { setStaffError(""); setShowAddStaff(true); }} className="flex items-center gap-1.5 text-sm bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">
                <Plus size={14} /> Add Staff
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {staff.map((s) => (
              <Card key={s._id} className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-lg">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.phone || "No phone"}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <Badge variant="success">{s.specialization}</Badge>
                </div>
              </Card>
            ))}
            </div>
          </>
        )}
      </div>
    </div>

      {/* Add Service Modal */}
      <Modal isOpen={showAddService} onClose={() => setShowAddService(false)} title="Add Service" size="sm">
        <div className="space-y-4">
          {serviceError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{serviceError}</p>}
          <Input label="Service Name *" value={serviceForm.name} onChange={(e) => setServiceForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Haircut" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Price (₹) *" type="number" value={serviceForm.price} onChange={(e) => setServiceForm((f) => ({ ...f, price: e.target.value }))} placeholder="299" />
            <Input label="Duration (min) *" type="number" value={serviceForm.duration} onChange={(e) => setServiceForm((f) => ({ ...f, duration: e.target.value }))} placeholder="30" />
          </div>
          <Input label="Category *" value={serviceForm.category} onChange={(e) => setServiceForm((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Hair, Skin, Nails" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
            <textarea value={serviceForm.description} onChange={(e) => setServiceForm((f) => ({ ...f, description: e.target.value }))} rows={2} placeholder="Optional…" className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowAddService(false)}>Cancel</Button>
            <Button onClick={handleAddService} loading={savingService} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">Add Service</Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Staff Modal ───────────────────────────────── */}
      <Modal isOpen={showAddStaff} onClose={() => setShowAddStaff(false)} title="Add Staff Member" size="sm">
        <div className="space-y-4">
          {staffError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{staffError}</p>}
          <Input label="Full Name *" value={staffForm.name} onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Priya Sharma" />
          <Input label="Phone" value={staffForm.phone} onChange={(e) => setStaffForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
          <Input label="Specialization *" value={staffForm.specialization} onChange={(e) => setStaffForm((f) => ({ ...f, specialization: e.target.value }))} placeholder="e.g. Hair Stylist, Makeup Artist" />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowAddStaff(false)}>Cancel</Button>
            <Button onClick={handleAddStaff} loading={savingStaff} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">Add Staff</Button>
          </div>
        </div>
      </Modal>

      {/* ── Add Customer Modal ────────────────────────────── */}
      <Modal isOpen={showAddCustomer} onClose={() => setShowAddCustomer(false)} title="Add Customer" size="sm">
        <div className="space-y-4">
          {customerError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{customerError}</p>}
          <Input label="Full Name *" value={customerForm.name} onChange={(e) => setCustomerForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Rabi Kumar" />
          <Input label="Email *" type="email" value={customerForm.email} onChange={(e) => setCustomerForm((f) => ({ ...f, email: e.target.value }))} placeholder="customer@example.com" />
          <Input label="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm((f) => ({ ...f, phone: e.target.value }))} placeholder="9876543210" />
          <Input label="Password *" type="password" value={customerForm.password} onChange={(e) => setCustomerForm((f) => ({ ...f, password: e.target.value }))} placeholder="Min 6 characters" />
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer} loading={savingCustomer} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">Add Customer</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
