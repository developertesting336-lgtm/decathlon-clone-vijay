import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiRefreshCw,
  FiLayers,
} from "react-icons/fi";
import {
  MdShoppingBag,
  MdCreditCard,
  MdLocalShipping,
  MdRotateLeft,
  MdSync,
  MdShield,
  MdPerson,
  MdInbox,
  MdLocationOn,
  MdBuild,
  MdLocalOffer,
  MdHeadphones,
} from "react-icons/md";
import toast from "react-hot-toast";
import api from "../../api/axios";
import AddCategory from "./AddCategory";
import EditCategory from "./EditCategory";
import "./SupportManagement.css";

const ICON_MAP = {
  orders: MdShoppingBag,
  payments: MdCreditCard,
  delivery: MdLocalShipping,
  returns_refunds: MdRotateLeft,
  returns: MdRotateLeft,
  exchange: MdSync,
  warranty: MdShield,
  account: MdPerson,
  products: MdInbox,
  stores: MdLocationOn,
  installation: MdBuild,
  services: MdBuild,
  offers: MdLocalOffer,
  contact: MdHeadphones,
};

const CategoryManagement = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | active | inactive

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    category: null,
    deleting: false,
  });

  const [togglingId, setTogglingId] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/support/categories");
      if (res.data?.success && Array.isArray(res.data?.categories)) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load support data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Status toggle
  const handleToggleStatus = async (cat) => {
    const newStatus = !cat.isActive;
    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => (c._id === cat._id ? { ...c, isActive: newStatus } : c))
    );

    try {
      setTogglingId(cat._id);
      const res = await api.patch(`/support/categories/${cat._id}/status`, {
        isActive: newStatus,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "Status updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update category status");
      // Revert optimistic update
      setCategories((prev) =>
        prev.map((c) => (c._id === cat._id ? { ...c, isActive: !newStatus } : c))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Open delete modal
  const openDeleteModal = (category) => {
    setDeleteModal({
      open: true,
      category,
      deleting: false,
    });
  };

  // Confirm delete (Step 8 safety check)
  const confirmDelete = async () => {
    const { category } = deleteModal;
    if (!category) return;

    if (category.faqCount > 0) {
      toast.error(
        "This category contains FAQs. Please remove or move its FAQs before deleting the category."
      );
      return;
    }

    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      const res = await api.delete(`/support/categories/${category._id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "Category deleted");
        setCategories((prev) => prev.filter((c) => c._id !== category._id));
        setDeleteModal({ open: false, category: null, deleting: false });
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "This category contains FAQs. Please remove or move its FAQs before deleting the category."
      );
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase();
    return categories.filter((cat) => {
      // Status filter
      if (statusFilter === "active" && !cat.isActive) return false;
      if (statusFilter === "inactive" && cat.isActive) return false;

      // Search query
      if (!query) return true;
      return (
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query))
      );
    });
  }, [categories, search, statusFilter]);

  return (
    <div className="support-category-management">
      {/* Toolbar & Filters */}
      <div className="support-toolbar">
        <div className="support-search-wrapper">
          <FiSearch className="support-search-icon" />
          <input
            type="text"
            className="support-search-input"
            placeholder="Search categories by name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="support-search-clear"
              onClick={() => setSearch("")}
            >
              <FiX />
            </button>
          )}
        </div>

        <div className="support-filter-group">
          <select
            className="support-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          <button
            type="button"
            className="support-btn-secondary"
            onClick={fetchCategories}
            title="Refresh categories"
          >
            <FiRefreshCw className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="support-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <FiPlus />
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="support-table-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="support-empty-state">
            <FiLayers className="support-empty-icon" />
            <h3>No support categories found</h3>
            <p>
              {search || statusFilter !== "ALL"
                ? "No categories match your search criteria."
                : "Get started by adding your first support category."}
            </p>
            <button
              type="button"
              className="support-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <FiPlus /> Add Category
            </button>
          </div>
        ) : (
          <div className="support-table-responsive">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Category Name</th>
                  <th>Order</th>
                  <th>FAQs</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map((cat) => {
                  const IconComp = ICON_MAP[cat.icon] || MdShoppingBag;
                  return (
                    <tr key={cat._id}>
                      <td>
                        <div className="support-category-cell">
                          <div className="support-category-icon-preview">
                            <IconComp />
                          </div>
                          <div className="support-category-details">
                            <strong>{cat.name}</strong>
                            <span>{cat.description || "No description"}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600 }}>{cat.displayOrder ?? 0}</span>
                      </td>

                      <td>
                        <span className="support-badge category-pill">
                          {cat.faqCount || 0} FAQs
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`support-badge ${cat.isActive ? "active" : "inactive"}`}
                          style={{ border: "none", cursor: "pointer" }}
                          onClick={() => handleToggleStatus(cat)}
                          disabled={togglingId === cat._id}
                          title="Click to toggle status"
                        >
                          {cat.isActive ? <FiCheckCircle /> : null}
                          <span>{cat.isActive ? "Active" : "Inactive"}</span>
                        </button>
                      </td>

                      <td style={{ textAlign: "right" }}>
                        <div
                          className="support-actions-group"
                          style={{ justifyContent: "flex-end" }}
                        >
                          <button
                            type="button"
                            className="support-action-btn edit"
                            onClick={() => setEditCategoryId(cat._id)}
                            title="Edit Category"
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            type="button"
                            className="support-action-btn delete"
                            onClick={() => openDeleteModal(cat)}
                            title="Delete Category"
                          >
                            <FiTrash2 />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <AddCategory
          isModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchCategories();
          }}
        />
      )}

      {/* Edit Category Modal */}
      {editCategoryId && (
        <EditCategory
          isModal
          categoryId={editCategoryId}
          onClose={() => setEditCategoryId(null)}
          onSuccess={() => {
            setEditCategoryId(null);
            fetchCategories();
          }}
        />
      )}

      {/* Delete Confirmation Modal (with Phase 20 Safety check) */}
      {deleteModal.open && deleteModal.category && (
        <div
          className="support-modal-backdrop"
          onClick={() =>
            !deleteModal.deleting &&
            setDeleteModal({ open: false, category: null, deleting: false })
          }
        >
          <div
            className="support-modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="support-modal-header">
              <h2>Confirm Delete Category</h2>
              <button
                type="button"
                className="support-modal-close-btn"
                onClick={() =>
                  setDeleteModal({ open: false, category: null, deleting: false })
                }
              >
                <FiX />
              </button>
            </div>

            <div className="support-modal-body">
              {deleteModal.category.faqCount > 0 ? (
                <div className="support-delete-warning-box">
                  <FiAlertTriangle className="support-delete-warning-icon" />
                  <div>
                    <strong>Cannot Delete Category</strong>
                    <p style={{ margin: "4px 0 0" }}>
                      This category contains FAQs. Please remove or move its FAQs before deleting the category.
                    </p>
                  </div>
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 14.5, color: "#334155" }}>
                  Are you sure you want to permanently delete the category{" "}
                  <strong>"{deleteModal.category.name}"</strong>? This action cannot
                  be undone.
                </p>
              )}
            </div>

            <div className="support-modal-footer">
              <button
                type="button"
                className="support-btn-secondary"
                onClick={() =>
                  setDeleteModal({ open: false, category: null, deleting: false })
                }
                disabled={deleteModal.deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="support-btn-danger"
                onClick={confirmDelete}
                disabled={
                  deleteModal.deleting || deleteModal.category.faqCount > 0
                }
              >
                {deleteModal.deleting ? "Deleting..." : "Delete Category"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;
