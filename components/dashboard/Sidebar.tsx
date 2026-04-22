"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Scissors,
  CalendarDays,
  Users2,
  Store,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { removeToken } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/dashboard/services", label: "Services", icon: Scissors },
  { href: "/dashboard/staff", label: "Staff", icon: Users2 },
  { href: "/dashboard/profile", label: "Salon Profile", icon: Store },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    removeToken();
    router.push("/login");
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-64 flex flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/60">
        <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center">
          <Scissors size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">SalonOS</p>
          <p className="text-[11px] text-slate-400">Management Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          Main Menu
        </p>
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon
                size={18}
                className={cn(
                  isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{label}</span>
              {isActive && (
                <ChevronRight size={14} className="text-indigo-300" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-700/60">
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
