"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronDown, Power, Pencil, KeyRound, Trash2 } from "lucide-react";
import AdminHeader from "@/components/admin/AdminHeader";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
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

  // Edit modal
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", phone: "", role: "", isActive: true });
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Reset password modal
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState("");

  // Delete
  const [deleting, setDeleting] = useState<string | null>(null);

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

  const openEdit = (u: User) => {
    setEditUser(u);
    setEditForm({ name: u.name, phone: u.phone || "", role: u.role, isActive: u.isActive });
    setEditError("");
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    setEditError("");
    try {
      await adminApi.put(`/api/admin/users/${editUser._id}`, editForm);
      setEditUser(null);
      fetchUsers();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword.trim()) return;
    setResetting(true);
    setResetError("");
    try {
      await adminApi.put(`/api/admin/users/${resetUser._id}`, { newPassword });
      setResetUser(null);
      setNewPassword("");
    } catch (e: unknown) {
      setResetError(e instanceof Error ? e.message : "Error");
    } finally {
      setResetting(false);
    }
  };

  const handleDelete = async (u: User) => {
    if (!confirm(`Permanently delete user "${u.name}" (${u.email})? This cannot be undone.`)) return;
    setDeleting(u._id);
    try {
      await adminApi.delete(`/api/admin/users/${u._id}`);
      fetchUsers();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setDeleting(null);
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
              className="appearance-none pl-3 pr-8 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
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
                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                            title="Edit user"
                          >
                            <Pencil size={14} />
                          </button>
                          {/* Reset Password */}
                          <button
                            onClick={() => { setResetUser(u); setNewPassword(""); setResetError(""); }}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600 transition-colors"
                            title="Reset password"
                          >
                            <KeyRound size={14} />
                          </button>
                          {/* Toggle Active */}
                          <button
                            onClick={() => toggleActive(u)}
                            className={`p-1.5 rounded-lg transition-colors ${u.isActive ? "hover:bg-red-50 text-red-400" : "hover:bg-emerald-50 text-emerald-600"}`}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            <Power size={14} />
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={deleting === u._id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors disabled:opacity-40"
                            title="Delete user"
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
        <p className="text-xs text-slate-400">{users.length} user(s) found</p>
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={!!editUser} onClose={() => setEditUser(null)} title={`Edit User — ${editUser?.name}`} size="sm">
        <div className="space-y-4">
          {editError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{editError}</p>}
          <Input
            label="Full Name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <Input
            label="Phone"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Role</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
              <option value="customer">Customer</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Active</label>
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
              className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isActive ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.isActive ? "translate-x-5" : ""}`} />
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancel</Button>
            <Button onClick={handleSave} loading={saving} className="bg-violet-700 hover:bg-violet-800 focus:ring-violet-500">Save Changes</Button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal isOpen={!!resetUser} onClose={() => setResetUser(null)} title={`Reset Password — ${resetUser?.name}`} size="sm">
        <div className="space-y-4">
          {resetError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{resetError}</p>}
          <p className="text-sm text-slate-500">Set a new password for <span className="font-medium text-slate-700">{resetUser?.email}</span>. The user will need to use this new password on their next login.</p>
          <Input
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min. 6 characters"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setResetUser(null)}>Cancel</Button>
            <Button
              onClick={handleResetPassword}
              loading={resetting}
              disabled={newPassword.length < 6}
              className="bg-amber-600 hover:bg-amber-700 focus:ring-amber-500"
            >
              Reset Password
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}


interface SalonRef {
  _id: string;
  name: string;
  email: string;
}

