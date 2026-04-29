"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Users,
  Users2,
  CalendarDays,
  BarChart2,
  ShieldCheck,
  LogOut,
  ChevronRight,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Global Overview", icon: LayoutDashboard },
  { href: "/admin/salons", label: "All Salons", icon: Store },
  { href: "/admin/users", label: "All Users", icon: Users },
  { href: "/admin/staff", label: "Staff Management", icon: Users2 },
  { href: "/admin/bookings", label: "All Bookings", icon: CalendarDays },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
    router.push("/admin/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-gray-950 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
          <Scissors size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">SalonOS</p>
          <p className="text-[11px] text-violet-400 font-semibold uppercase tracking-wider">
            Super Admin
          </p>
        </div>
      </div>

      {/* Admin badge */}
      <div className="mx-4 mt-4 px-3 py-2.5 bg-violet-950/60 rounded-xl border border-violet-900/40 flex items-center gap-2">
        <ShieldCheck size={16} className="text-violet-400 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-violet-300">Admin Access</p>
          <p className="text-[10px] text-violet-500">Full system control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5 mt-2">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Administration
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  isActive
                    ? "text-white"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{label}</span>
              {isActive && (
                <ChevronRight size={14} className="text-violet-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
