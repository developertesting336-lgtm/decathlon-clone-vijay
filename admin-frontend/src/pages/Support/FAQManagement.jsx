import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSearch,
  FiX,
  FiCheckCircle,
  FiHelpCircle,
  FiRefreshCw,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";
import AddFAQ from "./AddFAQ";
import EditFAQ from "./EditFAQ";
import "./SupportManagement.css";

const FAQManagement = () => {
  const [faqs, setFaqs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL"); // ALL | active | inactive

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editFaqId, setEditFaqId] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    faq: null,
    deleting: false,
  });

  const [togglingId, setTogglingId] = useState(null);

  // Fetch all categories for filter dropdown
  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get("/support/categories");
      if (res.data?.success && Array.isArray(res.data?.categories)) {
        setCategories(res.data.categories);
      }
    } catch (err) {
      console.error("Failed to load categories for FAQ filter:", err);
    }
  }, []);

  // Fetch FAQs from API
  const fetchFaqs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/support/faqs", {
        params: {
          limit: 200,
        },
      });
      if (res.data?.success && Array.isArray(res.data?.faqs)) {
        setFaqs(res.data.faqs);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Unable to load support data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchFaqs();
  }, [fetchCategories, fetchFaqs]);

  // Toggle active status
  const handleToggleStatus = async (faq) => {
    const newStatus = !faq.isActive;
    // Optimistic update
    setFaqs((prev) =>
      prev.map((f) => (f._id === faq._id ? { ...f, isActive: newStatus } : f))
    );

    try {
      setTogglingId(faq._id);
      const res = await api.patch(`/support/faqs/${faq._id}/status`, {
        isActive: newStatus,
      });
      if (res.data?.success) {
        toast.success(res.data.message || "FAQ status updated");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update FAQ status");
      // Revert optimistic update
      setFaqs((prev) =>
        prev.map((f) => (f._id === faq._id ? { ...f, isActive: !newStatus } : f))
      );
    } finally {
      setTogglingId(null);
    }
  };

  // Delete FAQ confirmation
  const confirmDelete = async () => {
    const { faq } = deleteModal;
    if (!faq) return;

    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      const res = await api.delete(`/support/faqs/${faq._id}`);
      if (res.data?.success) {
        toast.success(res.data.message || "FAQ deleted");
        setFaqs((prev) => prev.filter((f) => f._id !== faq._id));
        setDeleteModal({ open: false, faq: null, deleting: false });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete FAQ");
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Filtered FAQs (Phase 11: search question & answer, filter by category and active/inactive)
  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return faqs.filter((faq) => {
      // Category filter
      if (categoryFilter !== "ALL") {
        const catId = faq.category?._id || faq.category;
        if (String(catId) !== String(categoryFilter)) return false;
      }

      // Status filter
      if (statusFilter === "active" && !faq.isActive) return false;
      if (statusFilter === "inactive" && faq.isActive) return false;

      // Search query filter (searches question and answer)
      if (!query) return true;
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    });
  }, [faqs, search, categoryFilter, statusFilter]);

  return (
    <div className="support-faq-management">
      {/* Toolbar / Filters (Phase 11) */}
      <div className="support-toolbar">
        <div className="support-search-wrapper">
          <FiSearch className="support-search-icon" />
          <input
            type="text"
            className="support-search-input"
            placeholder="Search FAQs..."
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
          {/* Category Dropdown */}
          <select
            className="support-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Status Dropdown */}
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
            onClick={fetchFaqs}
            title="Refresh FAQs"
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
            <span>Add FAQ</span>
          </button>
        </div>
      </div>

      {/* FAQs Table Card */}
      <div className="support-table-card">
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
            Loading FAQs...
          </div>
        ) : filteredFaqs.length === 0 ? (
          <div className="support-empty-state">
            <FiHelpCircle className="support-empty-icon" />
            <h3>No FAQs found</h3>
            <p>
              {search || categoryFilter !== "ALL" || statusFilter !== "ALL"
                ? "No FAQs match your search or filter criteria."
                : "Create FAQs to help customers with their common queries."}
            </p>
            <button
              type="button"
              className="support-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <FiPlus /> Add FAQ
            </button>
          </div>
        ) : (
          <div className="support-table-responsive">
            <table className="support-table">
              <thead>
                <tr>
                  <th>Question & Answer Preview</th>
                  <th>Category</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaqs.map((faq) => {
                  const catName = faq.category?.name || "Uncategorized";
                  return (
                    <tr key={faq._id}>
                      <td style={{ maxWidth: 440 }}>
                        <div className="support-faq-question-cell">
                          <strong>{faq.question}</strong>
                          <p>{faq.answer}</p>
                        </div>
                      </td>

                      <td>
                        <span className="support-badge category-pill">
                          {catName}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontWeight: 600 }}>{faq.displayOrder ?? 0}</span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className={`support-badge ${faq.isActive ? "active" : "inactive"}`}
                          style={{ border: "none", cursor: "pointer" }}
                          onClick={() => handleToggleStatus(faq)}
                          disabled={togglingId === faq._id}
                          title="Click to toggle status"
                        >
                          {faq.isActive ? <FiCheckCircle /> : null}
                          <span>{faq.isActive ? "Active" : "Inactive"}</span>
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
                            onClick={() => setEditFaqId(faq._id)}
                            title="Edit FAQ"
                          >
                            <FiEdit2 />
                          </button>

                          <button
                            type="button"
                            className="support-action-btn delete"
                            onClick={() =>
                              setDeleteModal({ open: true, faq, deleting: false })
                            }
                            title="Delete FAQ"
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

      {/* Add FAQ Modal */}
      {showAddModal && (
        <AddFAQ
          isModal
          preselectedCategoryId={
            categoryFilter !== "ALL" ? categoryFilter : ""
          }
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchFaqs();
          }}
        />
      )}

      {/* Edit FAQ Modal */}
      {editFaqId && (
        <EditFAQ
          isModal
          faqId={editFaqId}
          onClose={() => setEditFaqId(null)}
          onSuccess={() => {
            setEditFaqId(null);
            fetchFaqs();
          }}
        />
      )}

      {/* Delete FAQ Confirmation Modal */}
      {deleteModal.open && deleteModal.faq && (
        <div
          className="support-modal-backdrop"
          onClick={() =>
            !deleteModal.deleting &&
            setDeleteModal({ open: false, faq: null, deleting: false })
          }
        >
          <div
            className="support-modal-card"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="support-modal-header">
              <h2>Confirm Delete FAQ</h2>
              <button
                type="button"
                className="support-modal-close-btn"
                onClick={() =>
                  setDeleteModal({ open: false, faq: null, deleting: false })
                }
              >
                <FiX />
              </button>
            </div>

            <div className="support-modal-body">
              <p style={{ margin: "0 0 10px", fontSize: 14.5, color: "#334155" }}>
                Are you sure you want to delete this FAQ?
              </p>
              <div
                style={{
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: 8,
                  fontSize: 13.5,
                  color: "#0f172a",
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                }}
              >
                "{deleteModal.faq.question}"
              </div>
            </div>

            <div className="support-modal-footer">
              <button
                type="button"
                className="support-btn-secondary"
                onClick={() =>
                  setDeleteModal({ open: false, faq: null, deleting: false })
                }
                disabled={deleteModal.deleting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="support-btn-danger"
                onClick={confirmDelete}
                disabled={deleteModal.deleting}
              >
                {deleteModal.deleting ? "Deleting..." : "Delete FAQ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FAQManagement;
