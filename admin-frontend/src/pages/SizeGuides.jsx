import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdRefresh } from "react-icons/md";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/AdminExtras.css";

const EMPTY_FORM = {
  name: "",
  category: "",
  gender: "Unisex",
  description: "",
  measurementsJson: JSON.stringify([{ size: "S", chest: "36", waist: "30" }], null, 2),
  isActive: true,
};

const SizeGuides = () => {
  const [guides, setGuides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [guidesRes, catsRes] = await Promise.all([
        api.get("/size-guides?all=true"),
        api.get("/categories"),
      ]);
      setGuides(guidesRes.data?.sizeGuides || []);
      setCategories(catsRes.data?.categories || []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load size guides");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guides;
    return guides.filter(
      (g) =>
        (g.name || "").toLowerCase().includes(q) ||
        (g.category?.name || "").toLowerCase().includes(q) ||
        (g.gender || "").toLowerCase().includes(q)
    );
  }, [guides, search]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (guide) => {
    setEditingId(guide._id);
    setForm({
      name: guide.name || "",
      category: guide.category?._id || guide.category || "",
      gender: guide.gender || "Unisex",
      description: guide.description || "",
      measurementsJson: JSON.stringify(guide.measurements || [], null, 2),
      isActive: guide.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    let measurements;
    try {
      measurements = JSON.parse(form.measurementsJson);
      if (!Array.isArray(measurements) || measurements.length === 0) {
        toast.error("Measurements must be a non-empty JSON array");
        return;
      }
    } catch {
      toast.error("Measurements JSON is invalid");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name.trim(),
        category: form.category || null,
        gender: form.gender,
        description: form.description.trim(),
        measurements,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.put(`/size-guides/${editingId}`, payload);
        toast.success("Size guide updated");
      } else {
        await api.post("/size-guides", payload);
        toast.success("Size guide created");
      }
      setModalOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save size guide");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/size-guides/${id}`);
      toast.success("Size guide deleted");
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete size guide");
    }
  };

  return (
    <div className="admin-extras-page">
      <div className="extras-header">
        <div>
          <h1>Size Guides</h1>
          <p>{guides.length} size charts configured for storefront categories</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="extras-btn-secondary" onClick={fetchData}>
            <MdRefresh /> Refresh
          </button>
          <button type="button" className="extras-btn-primary" onClick={openCreate}>
            <MdAdd /> Add Size Guide
          </button>
        </div>
      </div>

      <div className="extras-toolbar">
        <input
          type="text"
          className="extras-input"
          placeholder="Search by guide name, category, or gender..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="extras-card">
        <div className="extras-table-wrap">
          {loading ? (
            <div className="extras-empty">Loading size guides...</div>
          ) : filtered.length === 0 ? (
            <div className="extras-empty">No size guides found.</div>
          ) : (
            <table className="extras-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Gender</th>
                  <th>Sizes</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 100).map((g) => (
                  <tr key={g._id}>
                    <td>
                      <strong>{g.name}</strong>
                      {g.description && (
                        <div style={{ color: "#64748b", fontSize: 12 }}>{g.description}</div>
                      )}
                    </td>
                    <td>{g.category?.name || "General"}</td>
                    <td>{g.gender || "Unisex"}</td>
                    <td>{(g.measurements || []).map((m) => m.size).join(", ") || "—"}</td>
                    <td>
                      <span className={`extras-badge ${g.isActive ? "green" : "gray"}`}>
                        {g.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          className="extras-btn-secondary"
                          onClick={() => openEdit(g)}
                        >
                          <MdEdit /> Edit
                        </button>
                        <button
                          type="button"
                          className="extras-btn-danger"
                          onClick={() => handleDelete(g._id)}
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="extras-modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="extras-modal" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: 0 }}>{editingId ? "Edit Size Guide" : "New Size Guide"}</h2>
            <form className="extras-form-grid" onSubmit={handleSave}>
              <label>
                Guide Name
                <input
                  className="extras-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>

              <label>
                Category
                <select
                  className="extras-select"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  <option value="">General / Unassigned</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Gender
                <select
                  className="extras-select"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="Unisex">Unisex</option>
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="All">All</option>
                </select>
              </label>

              <label>
                Description
                <input
                  className="extras-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </label>

              <label>
                Measurements (JSON Array)
                <textarea
                  rows={6}
                  className="extras-textarea"
                  value={form.measurementsJson}
                  onChange={(e) => setForm({ ...form, measurementsJson: e.target.value })}
                />
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                Active
              </label>

              <div className="extras-modal-actions">
                <button
                  type="button"
                  className="extras-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="extras-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : "Save Size Guide"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SizeGuides;
