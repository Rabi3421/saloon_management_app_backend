"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Scissors,
  Users2,
  Clock,
  CheckCircle,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import Header from "@/components/dashboard/Header";
import StatsCard from "@/components/dashboard/StatsCard";
import Badge, { bookingStatusBadge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import Card from "@/components/ui/Card";
import { api } from "@/lib/apiClient";

interface StatsData {
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
  };
  totalServices: number;
  totalStaff: number;
  totalCustomers: number;
  recentBookings: RecentBooking[];
}

interface RecentBooking {
  _id: string;
  status: string;
  timeSlot: string;
  bookingDate: string;
  customerId: { name: string; email: string };
  serviceId: { name: string; price: number };
  staffId: { name: string };
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get<{ data: StatsData }>("/api/dashboard/stats")
      .then((res) => setStats(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Overview" />
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatsCard
                label="Total Bookings"
                value={stats.bookings.total}
                icon={<CalendarDays size={22} />}
                color="indigo"
              />
              <StatsCard
                label="Active Services"
                value={stats.totalServices}
                icon={<Scissors size={22} />}
                color="purple"
              />
              <StatsCard
                label="Staff Members"
                value={stats.totalStaff}
                icon={<Users2 size={22} />}
                color="blue"
              />
              <StatsCard
                label="Total Customers"
                value={stats.totalCustomers}
                icon={<UserCheck size={22} />}
                color="emerald"
              />
            </div>

            {/* Booking Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatsCard
                label="Pending"
                value={stats.bookings.pending}
                icon={<Clock size={22} />}
                color="amber"
                sub="Awaiting confirmation"
              />
              <StatsCard
                label="Confirmed"
                value={stats.bookings.confirmed}
                icon={<TrendingUp size={22} />}
                color="blue"
                sub="Upcoming appointments"
              />
              <StatsCard
                label="Completed"
                value={stats.bookings.completed}
                icon={<CheckCircle size={22} />}
                color="emerald"
                sub="Successfully served"
              />
            </div>

            {/* Recent Bookings Table */}
            <Card>
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="text-base font-semibold text-slate-900">
                  Recent Bookings
                </h2>
                <p className="text-sm text-slate-500">Latest 5 bookings</p>
              </div>
              <div className="overflow-x-auto">
                {stats.recentBookings.length === 0 ? (
                  <p className="text-center text-slate-400 py-10 text-sm">
                    No bookings yet
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Customer
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Staff
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Date & Time
                        </th>
                        <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {stats.recentBookings.map((b) => (
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
                            {b.serviceId?.price !== undefined && (
                              <p className="text-xs text-slate-400">
                                ₹{b.serviceId.price}
                              </p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-slate-700">
                            {b.staffId?.name || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-slate-700">
                              {new Date(b.bookingDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-400">
                              {b.timeSlot}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant={bookingStatusBadge(b.status)}>
                              {b.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
