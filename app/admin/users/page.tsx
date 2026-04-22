"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Power } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { adminApi } from "@/lib/adminApiClient";

interface SalonRef {
  _id: string;
  name: string;
  email: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  salonId: SalonRef | null;
}

const ROLES = ["", "owner", "staff", "customer"];

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [error, setError] = useState("");

  const fetchUsers = (q?: string, role?: string) => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (q ?? search) params.search = q ?? search;
    if (role ?? roleFilter) params.role = role ?? roleFilter;
    adminApi
      .get<{ data: User[] }>("/api/admin/users", params)
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!localStorage.getItem("admin_token")) {
      router.replace("/admin/login");
      return;
    }
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleActive = async (u: User) => {
    if (!confirm(`${u.isActive ? "Deactivate" : "Activate"} user "${u.name}"?`)) return;
    try {
      await adminApi.put(`/api/admin/users/${u._id}`, { isActive: !u.isActive });
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const roleBadge = (role: string) => {
    const map: Record<string, "purple" | "info" | "default"> = {
      owner: "purple",
      staff: "info",
      customer: "default",
    };
    return map[role] || "default";
  };

  return (
    <div>
      <AdminHeader title="All Users" />
      <div className="p-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); fetchUsers(e.target.value, roleFilter); }}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); fetchUsers(search, e.target.value); }}
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r || "All Roles"}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16"><Spinner className="w-8 h-8" /></div>
          ) : users.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["User", "Email", "Phone", "Role", "Salon", "Status", "Joined", "Actions"].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-slate-900">{u.name}</p>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{u.email}</td>
                      <td className="px-5 py-3 text-slate-500">{u.phone || "—"}</td>
                      <td className="px-5 py-3">
                        <Badge variant={roleBadge(u.role)}>{u.role}</Badge>
                      </td>
                      <td className="px-5 py-3">
                        {u.salonId ? (
                          <a
                            href={`/admin/salons/${(u.salonId as SalonRef)._id}`}
                            className="text-indigo-600 hover:underline text-xs font-medium"
                          >
                            {(u.salonId as SalonRef).name}
                          </a>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <Badge variant={u.isActive ? "success" : "danger"}>{u.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="px-5 py-3 text-slate-400 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`p-1.5 rounded-lg transition-colors ${u.isActive ? "hover:bg-red-50 text-red-500" : "hover:bg-emerald-50 text-emerald-600"}`}
                          title={u.isActive ? "Deactivate" : "Activate"}
                        >
                          <Power size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <p className="text-xs text-slate-400">{users.length} user(s) found</p>
      </div>
    </div>
  );
}
