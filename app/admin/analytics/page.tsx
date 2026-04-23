"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, CalendarDays, IndianRupee,
  Store, RefreshCw, ChevronDown, X,
} from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";
import { cn } from "@/lib/utils";

// ── Types ───────────────────────────────────────────────────────────────────
interface Summary {
  totalBookings: number;
  bookingChange: number;
  totalRevenue: number;
  paidCount: number;
  unpaidRevenue: number;
  newUsers: number;
  userChange: number;
  totalSalons: number;
  totalStaff: number;
}
interface StatusBreakdown { pending: number; confirmed: number; completed: number; cancelled: number }
interface TimePoint { _id: string; count: number; revenue: number }
interface TopSalon  { _id: string; name: string; bookings: number; revenue: number }
interface TopStaff  { _id: string; name: string; specialization: string; bookings: number }
interface SlotData  { slot: string; count: number }
interface PayGroup  { count: number; revenue: number }
interface PayBreakdown { paid: PayGroup; unpaid: PayGroup }

interface Analytics {
  meta: { salonId: string | null; salonName: string | null };
  summary: Summary;
  statusBreakdown: StatusBreakdown;
  timeSeries: TimePoint[];
  topSalons: TopSalon[];
  topStaff: TopStaff[];
  popularSlots: SlotData[];
  paymentBreakdown: PayBreakdown;
}

// ── Constants ────────────────────────────────────────────────────────────────
const PERIODS = [
  { label: "Today",        value: "day"    },
  { label: "Last 7 Days",  value: "week"   },
  { label: "This Month",   value: "month"  },
  { label: "This Year",    value: "year"   },
  { label: "Custom Range", value: "custom" },
];

const STATUS_COLORS: Record<string, string> = {
  pending:   "#f59e0b",
  confirmed: "#3b82f6",
  completed: "#10b981",
  cancelled: "#ef4444",
};

const VIOLET = "#7c3aed";
const VIOLET_LIGHT = "#a78bfa";
const EMERALD = "#10b981";

// ── Helper components ────────────────────────────────────────────────────────
function KpiCard({
  label, value, sub, change, icon, color = "violet",
}: {
  label: string; value: string; sub?: string;
  change?: number; icon: React.ReactNode; color?: string;
}) {
  const up   = (change ?? 0) >= 0;
  const colorMap: Record<string, string> = {
    violet:  "bg-violet-50 text-violet-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber:   "bg-amber-50 text-amber-600",
    blue:    "bg-blue-50 text-blue-600",
    purple:  "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-xl", colorMap[color])}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
        {change !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-semibold mt-1", up ? "text-emerald-600" : "text-red-500")}>
            {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(change)}% vs prev period
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3">{children}</h2>;
}

// ── Main page ────────────────────────────────────────────────────────────────
interface SalonOption { _id: string; name: string; city?: string }

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [period,  setPeriod]  = useState("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate,   setToDate]   = useState("");
  const [salonId,  setSalonId]  = useState("");
  const [salons,   setSalons]   = useState<SalonOption[]>([]);
  const [salonOpen, setSalonOpen] = useState(false);

  const fetch = useCallback((p: string, from?: string, to?: string, sid?: string) => {
    setLoading(true);
    setError("");
    const params: Record<string, string> = { period: p };
    if (p === "custom" && from && to) { params.from = from; params.to = to; }
    if (sid) params.salonId = sid;
    adminApi
      .get<{ data: Analytics }>("/api/admin/analytics", params)
      .then((r) => setData(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) { router.replace("/admin/login"); return; }
    // Fetch salons list for the dropdown
    adminApi
      .get<{ data: SalonOption[] }>("/api/admin/salons")
      .then((r) => setSalons(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
    fetch("month");
  }, [fetch, router]);

  const handlePeriodChange = (p: string) => {
    setPeriod(p);
    if (p !== "custom") fetch(p, undefined, undefined, salonId);
  };

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return;
    fetch("custom", fromDate, toDate, salonId);
  };

  const handleSalonChange = (id: string) => {
    setSalonId(id);
    setSalonOpen(false);
    if (period !== "custom") fetch(period, undefined, undefined, id);
    else if (fromDate && toDate) fetch("custom", fromDate, toDate, id);
  };

  const s = data?.summary;

  // Fill time-series gaps so chart looks continuous
  const chartData = data?.timeSeries.map((t) => ({
    label: t._id,
    Bookings: t.count,
    Revenue:  t.revenue,
  })) ?? [];

  // Pie chart data
  const pieData = data ? [
    { name: "Completed", value: data.statusBreakdown.completed, color: STATUS_COLORS.completed },
    { name: "Confirmed", value: data.statusBreakdown.confirmed, color: STATUS_COLORS.confirmed },
    { name: "Pending",   value: data.statusBreakdown.pending,   color: STATUS_COLORS.pending   },
    { name: "Cancelled", value: data.statusBreakdown.cancelled, color: STATUS_COLORS.cancelled },
  ].filter((d) => d.value > 0) : [];

  return (
    <div>
      <AdminHeader title="Analytics" />
      <div className="p-6 space-y-6">

        {/* ── Period selector ────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-xl p-1 gap-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                  period === p.value
                    ? "bg-white text-violet-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >{p.label}</button>
            ))}
          </div>

          {period === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              <button
                onClick={handleCustomApply}
                disabled={!fromDate || !toDate}
                className="px-4 py-1.5 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors"
              >Apply</button>
            </div>
          )}

          <button
            onClick={() => fetch(period, fromDate, toDate, salonId)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors ml-auto"
            title="Refresh"
          >
            <RefreshCw size={15} />
          </button>

          {/* ── Salon filter dropdown ──────────────────────────────── */}
          {salons.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setSalonOpen((o) => !o)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all",
                  salonId
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-violet-400"
                )}
              >
                <Store size={13} />
                {salonId ? (salons.find((s) => s._id === salonId)?.name ?? "Salon") : "All Salons"}
                <ChevronDown size={12} className={cn("transition-transform", salonOpen && "rotate-180")} />
              </button>

              {salonOpen && (
                <div className="absolute right-0 mt-1 w-60 bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1 max-h-72 overflow-y-auto">
                  <button
                    onClick={() => handleSalonChange("")}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center justify-between",
                      !salonId && "text-violet-700 bg-violet-50"
                    )}
                  >
                    All Salons
                    {!salonId && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                  </button>
                  <div className="border-t border-slate-100 my-1" />
                  {salons.map((s) => (
                    <button
                      key={s._id}
                      onClick={() => handleSalonChange(s._id)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between",
                        salonId === s._id && "bg-violet-50"
                      )}
                    >
                      <div>
                        <p className={cn("text-xs font-semibold", salonId === s._id ? "text-violet-700" : "text-slate-800")}>{s.name}</p>
                        {s.city && <p className="text-[10px] text-slate-400">{s.city}</p>}
                      </div>
                      {salonId === s._id && <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-24"><Spinner className="w-10 h-10" /></div>
        ) : !data ? null : (
          <>
            {/* ── Active salon context banner ────────────────────────── */}
            {data.meta.salonId && data.meta.salonName && (
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-200 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white shrink-0">
                  <Store size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-violet-500 font-medium">Viewing analytics for</p>
                  <p className="text-sm font-bold text-violet-900 truncate">{data.meta.salonName}</p>
                </div>
                <button
                  onClick={() => handleSalonChange("")}
                  className="p-1.5 rounded-lg hover:bg-violet-100 text-violet-500 transition-colors"
                  title="Clear filter"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            {/* ── KPI row ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                label="Total Bookings"
                value={s!.totalBookings.toLocaleString()}
                change={s!.bookingChange}
                icon={<CalendarDays size={20} />}
                color="violet"
              />
              <KpiCard
                label="Revenue Collected"
                value={`₹${s!.totalRevenue.toLocaleString()}`}
                sub={`₹${s!.unpaidRevenue.toLocaleString()} pending`}
                icon={<IndianRupee size={20} />}
                color="emerald"
              />
              <KpiCard
                label="New Customers"
                value={s!.newUsers.toLocaleString()}
                change={s!.userChange}
                icon={<Users size={20} />}
                color="blue"
              />
              <KpiCard
                label={data.meta.salonId ? "This Salon" : "Active Salons"}
                value={s!.totalSalons.toLocaleString()}
                sub={`${s!.totalStaff} active staff`}
                icon={<Store size={20} />}
                color="purple"
              />
            </div>

            {/* ── Booking status mini-KPIs ──────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Completed", key: "completed", color: "bg-emerald-500" },
                { label: "Confirmed", key: "confirmed", color: "bg-blue-500"    },
                { label: "Pending",   key: "pending",   color: "bg-amber-500"   },
                { label: "Cancelled", key: "cancelled", color: "bg-red-500"     },
              ].map(({ label, key, color }) => (
                <div key={key} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-3">
                  <div className={cn("w-3 h-3 rounded-full shrink-0", color)} />
                  <div>
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-xl font-bold text-slate-900">
                      {data.statusBreakdown[key as keyof StatusBreakdown]}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Time-series charts ────────────────────────────────── */}
            {chartData.length > 0 && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {/* Bookings over time */}
                <Card className="p-5">
                  <SectionTitle>Bookings Over Time</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                        labelStyle={{ fontWeight: 600, color: "#1e293b" }}
                      />
                      <Line
                        type="monotone" dataKey="Bookings" stroke={VIOLET}
                        strokeWidth={2.5} dot={{ r: 3, fill: VIOLET }} activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </Card>

                {/* Revenue over time */}
                <Card className="p-5">
                  <SectionTitle>Revenue Over Time (₹)</SectionTitle>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                        formatter={(v) => [`₹${Number(v).toLocaleString()}`, "Revenue"]}
                        labelStyle={{ fontWeight: 600, color: "#1e293b" }}
                      />
                      <Bar dataKey="Revenue" fill={VIOLET} radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* ── Booking status + payment breakdown ───────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* Donut: booking status */}
              <Card className="p-5">
                <SectionTitle>Booking Status Distribution</SectionTitle>
                {pieData.length === 0 ? (
                  <p className="text-sm text-slate-400 py-12 text-center">No bookings in this period</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={180} height={180}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                            <span className="text-slate-600">{d.name}</span>
                          </div>
                          <span className="font-bold text-slate-900">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>

              {/* Payment breakdown */}
              <Card className="p-5">
                <SectionTitle>Payment Breakdown</SectionTitle>
                <div className="space-y-4 mt-2">
                  {[
                    { label: "Paid",   d: data.paymentBreakdown.paid,   color: "bg-emerald-500", textColor: "text-emerald-700", bg: "bg-emerald-50" },
                    { label: "Unpaid", d: data.paymentBreakdown.unpaid, color: "bg-amber-400",   textColor: "text-amber-700",   bg: "bg-amber-50"   },
                  ].map(({ label, d, color, textColor, bg }) => {
                    const total = data.paymentBreakdown.paid.count + data.paymentBreakdown.unpaid.count;
                    const pct   = total === 0 ? 0 : Math.round((d.count / total) * 100);
                    return (
                      <div key={label} className={cn("rounded-xl p-4", bg)}>
                        <div className="flex items-center justify-between mb-2">
                          <p className={cn("text-sm font-semibold", textColor)}>{label}</p>
                          <p className={cn("text-xs font-medium", textColor)}>{pct}%</p>
                        </div>
                        <div className="w-full bg-white/60 rounded-full h-2 mb-2">
                          <div className={cn("h-2 rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>{d.count} bookings</span>
                          <span className="font-semibold">₹{d.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>

            {/* ── Top salons + top staff ────────────────────────────── */}
            <div className={cn("grid grid-cols-1 gap-5", data.meta.salonId ? "" : "xl:grid-cols-2")}>
              {/* Top Salons — only shown when viewing all salons */}
              {!data.meta.salonId && (
                <Card className="p-5">
                  <SectionTitle>Top Salons by Bookings</SectionTitle>
                  {data.topSalons.length === 0 ? (
                    <p className="text-sm text-slate-400 py-8 text-center">No data</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart
                        data={data.topSalons.map((s) => ({ name: s.name.length > 14 ? s.name.slice(0, 14) + "…" : s.name, Bookings: s.bookings, Revenue: s.revenue }))}
                        layout="vertical"
                        margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} width={90} />
                        <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                        <Bar dataKey="Bookings" fill={VIOLET} radius={[0, 5, 5, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </Card>
              )}

              {/* Top Staff */}
              <Card className="p-5">
                <SectionTitle>Top Staff by Bookings{data.meta.salonName ? ` — ${data.meta.salonName}` : ""}</SectionTitle>
                {data.topStaff.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">No data</p>
                ) : (
                  <div className="space-y-2.5 mt-1">
                    {data.topStaff.slice(0, 6).map((s, i) => {
                      const max = data.topStaff[0].bookings;
                      const pct = max === 0 ? 0 : Math.round((s.bookings / max) * 100);
                      return (
                        <div key={s._id} className="flex items-center gap-3">
                          <span className="w-5 text-xs font-bold text-slate-400 text-right">{i + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs shrink-0">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between mb-0.5">
                              <p className="text-xs font-semibold text-slate-800 truncate">{s.name}</p>
                              <p className="text-xs font-bold text-violet-700 ml-2 shrink-0">{s.bookings}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                                <div className="bg-violet-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                              </div>
                              <p className="text-[10px] text-slate-400 shrink-0 w-14 truncate">{s.specialization}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Popular time slots ────────────────────────────────── */}
            {data.popularSlots.length > 0 && (
              <Card className="p-5">
                <SectionTitle>Popular Booking Time Slots</SectionTitle>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={data.popularSlots.map((s) => ({ slot: s.slot, Bookings: s.count }))}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="slot" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} />
                    <Bar dataKey="Bookings" fill={VIOLET_LIGHT} radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
