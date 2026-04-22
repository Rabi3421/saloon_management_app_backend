"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Store, Users, CalendarDays, Scissors, Users2 } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
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
  const [data, setData] = useState<SalonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    adminApi
      .get<{ data: SalonDetail }>(`/api/admin/salons/${id}`)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, router]);

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
                activeTab === t.key ? "bg-rose-100 text-rose-700" : "bg-slate-200 text-slate-500"
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
        )}
      </div>
    </div>
  );
}
