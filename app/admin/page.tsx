"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Users,
  CalendarDays,
  Scissors,
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  ShieldOff,
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import StatsCard from "@/components/dashboard/StatsCard";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import { adminApi } from "@/lib/adminApiClient";

interface GlobalStats {
  salons: { total: number; active: number };
  users: { total: number; owners: number; customers: number };
  staff: number;
  services: number;
  bookings: { total: number; pending: number; confirmed: number; completed: number; cancelled: number };
  recentSalons: { _id: string; name: string; plan: string; isActive: boolean; createdAt: string }[];
  recentBookings: {
    _id: string;
    status: string;
    timeSlot: string;
    bookingDate: string;
    salonId: { name: string };
    customerId: { name: string; email: string };
    serviceId: { name: string; price: number };
  }[];
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    adminApi
      .get<{ data: GlobalStats }>("/api/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div>
      <AdminHeader title="Global Overview" />
      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex justify-center py-16">
            <Spinner className="w-10 h-10" />
          </div>
        )}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {stats && (
          <>
            {/* Primary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatsCard
                label="Total Salons"
                value={stats.salons.total}
                icon={<Store size={22} />}
                color="violet"
                sub={`${stats.salons.active} active`}
              />
              <StatsCard
                label="Total Users"
                value={stats.users.total}
                icon={<Users size={22} />}
                color="indigo"
                sub={`${stats.users.owners} owners · ${stats.users.customers} customers`}
              />
              <StatsCard
                label="Total Bookings"
                value={stats.bookings.total}
                icon={<CalendarDays size={22} />}
                color="blue"
              />
              <StatsCard
                label="Active Services"
                value={stats.services}
                icon={<Scissors size={22} />}
                color="purple"
              />
            </div>

            {/* Booking Status Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatsCard label="Pending" value={stats.bookings.pending} icon={<Clock size={20} />} color="amber" />
              <StatsCard label="Confirmed" value={stats.bookings.confirmed} icon={<TrendingUp size={20} />} color="blue" />
              <StatsCard label="Completed" value={stats.bookings.completed} icon={<CheckCircle size={20} />} color="emerald" />
              <StatsCard label="Cancelled" value={stats.bookings.cancelled} icon={<XCircle size={20} />} color="violet" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Recent Salons */}
              <Card>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Recent Salons</h2>
                  <a href="/admin/salons" className="text-xs text-violet-600 hover:underline font-medium">View all →</a>
                </div>
                <div className="divide-y divide-slate-50">
                  {stats.recentSalons.map((s) => (
                    <div key={s._id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{s.name}</p>
                          <p className="text-xs text-slate-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={s.plan === "premium" ? "warning" : "default"}>
                          {s.plan}
                        </Badge>
                        {!s.isActive && (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <ShieldOff size={11} /> inactive
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Recent Bookings */}
              <Card>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-900">Recent Bookings</h2>
                  <span className="text-xs text-slate-400">All salons</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {stats.recentBookings.map((b) => (
                    <div key={b._id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{b.customerId?.name || "—"}</p>
                        <p className="text-xs text-slate-400">
                          {b.salonId?.name} · {b.serviceId?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant={bookingStatusBadge(b.status)}>{b.status}</Badge>
                        <p className="text-xs text-slate-400 mt-1">{b.timeSlot}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
