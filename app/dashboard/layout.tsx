import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";

export const metadata: Metadata = {
  title: "SalonOS Dashboard",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-64">
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
