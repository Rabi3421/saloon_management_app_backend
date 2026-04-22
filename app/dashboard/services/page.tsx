"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import Header from "@/components/dashboard/Header";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { api } from "@/lib/apiClient";

interface Service {
  _id: string;
  name: string;
  price: number;
  duration: number;
  category: string;
  isActive: boolean;
}

const EMPTY: Partial<Service> = {
  name: "",
  price: 0,
  duration: 30,
  category: "",
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [form, setForm] = useState<Partial<Service>>(EMPTY);
  const [error, setError] = useState("");

  const fetchServices = () => {
    setLoading(true);
    api
      .get<{ data: Service[] }>("/api/services")
      .then((res) => setServices(res.data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchServices, []);

  const openAdd = () => {
    setForm(EMPTY);
    setModal("add");
  };

  const openEdit = (s: Service) => {
    setForm(s);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name || !form.category) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await api.post("/api/services", form);
      } else {
        await api.put(`/api/services/${form._id}`, form);
      }
      fetchServices();
      setModal(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    try {
      await api.delete(`/api/services/${id}`);
      fetchServices();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    }
  };

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <Header title="Services" />
      <div className="p-6 space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <Input
            placeholder="Search services..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search size={15} />}
            className="sm:w-72"
          />
          <Button onClick={openAdd}>
            <Plus size={16} /> Add Service
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">
            {error}
          </p>
        )}

        <Card>
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner className="w-8 h-8" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-slate-400 py-16 text-sm">
              No services found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {["Service Name", "Category", "Price", "Duration", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((s) => (
                    <tr
                      key={s._id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-slate-900">
                        {s.name}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {s.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium">
                        ₹{s.price}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {s.duration} min
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-600 transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(s._id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          >
                            <Trash2 size={15} />
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
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "add" ? "Add New Service" : "Edit Service"}
      >
        <div className="space-y-4">
          <Input
            label="Service Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Haircut"
          />
          <Input
            label="Category"
            value={form.category || ""}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Hair, Nails, Skin"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price (₹)"
              type="number"
              value={form.price || ""}
              onChange={(e) =>
                setForm({ ...form, price: Number(e.target.value) })
              }
            />
            <Input
              label="Duration (min)"
              type="number"
              value={form.duration || ""}
              onChange={(e) =>
                setForm({ ...form, duration: Number(e.target.value) })
              }
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {modal === "add" ? "Create Service" : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
