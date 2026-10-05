import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "./SupportManagement.css";

const ICON_OPTIONS = [
  { value: "orders", label: "Orders (Shopping Bag)" },
  { value: "payments", label: "Payments (Credit Card)" },
  { value: "delivery", label: "Delivery (Truck)" },
  { value: "returns_refunds", label: "Returns & Refunds (Rotate CCW)" },
  { value: "exchange", label: "Exchange (Repeat)" },
  { value: "warranty", label: "Warranty (Shield)" },
  { value: "account", label: "Account (User Profile)" },
  { value: "products", label: "Products (Package Box)" },
  { value: "stores", label: "Stores (Map Pin)" },
  { value: "installation", label: "Installation & Services (Wrench Tool)" },
  { value: "offers", label: "Offers & Coupons (Tag)" },
  { value: "contact", label: "Contact Support (Headphones)" },
];

const EditCategory = ({ categoryId: propId, isModal = false, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const categoryId = propId || paramId;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "orders",
    displayOrder: 0,
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchCategoryDetails = useCallback(async () => {
    if (!categoryId) return;
    try {
      setLoading(true);
      const res = await api.get(`/support/categories/${categoryId}`);
      if (res.data?.success && res.data?.category) {
        const found = res.data.category;
        setFormData({
          name: found.name || "",
          description: found.description || "",
          icon: found.icon || "orders",
          displayOrder: found.displayOrder ?? 0,
          isActive: found.isActive !== false,
        });
      } else {
        toast.error("Support category not found");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load category details");
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategoryDetails();
  }, [fetchCategoryDetails]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/support/categories/${categoryId}`, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        icon: formData.icon,
        displayOrder: formData.displayOrder,
        isActive: formData.isActive,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "Support category updated!");
        if (onSuccess) {
          onSuccess(res.data.category);
        } else {
          navigate("/admin/support");
        }
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to update support category"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = loading ? (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
      Loading category details...
    </div>
  ) : (
    <form onSubmit={handleSubmit} noValidate className="support-form-grid">
      <div className="support-form-group">
        <label htmlFor="edit-cat-name">Category Name *</label>
        <input
          id="edit-cat-name"
          type="text"
          value={formData.name}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          autoFocus
        />
      </div>

      <div className="support-form-group">
        <label htmlFor="edit-cat-desc">Description</label>
        <textarea
          id="edit-cat-desc"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          rows={3}
        />
      </div>

      <div className="support-form-row">
        <div className="support-form-group">
          <label htmlFor="edit-cat-icon">Icon Identifier</label>
          <select
            id="edit-cat-icon"
            value={formData.icon}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
          >
            {ICON_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="support-form-group">
          <label htmlFor="edit-cat-order">Display Order</label>
          <input
            id="edit-cat-order"
            type="number"
            value={formData.displayOrder}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                displayOrder: parseInt(e.target.value, 10) || 0,
              }))
            }
          />
        </div>
      </div>

      <div className="support-form-group">
        <label className="support-form-checkbox-label">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
            }
          />
          <span>Active (Visible on public Support Help Center)</span>
        </label>
      </div>

      <div className="support-modal-footer" style={{ padding: "18px 0 10px", marginTop: "6px" }}>
        {isModal ? (
          <button
            type="button"
            className="support-btn-secondary"
            onClick={onClose}
          >
            <FiX /> Cancel
          </button>
        ) : (
          <button
            type="button"
            className="support-btn-secondary"
            onClick={() => navigate("/admin/support")}
          >
            <FiArrowLeft /> Back to List
          </button>
        )}

        <button
          type="submit"
          className="support-btn-primary"
          disabled={submitting || loading}
        >
          <FiSave /> {submitting ? "Saving..." : "Update Category"}
        </button>
      </div>
    </form>
  );

  if (isModal) {
    return (
      <div className="support-modal-backdrop" onClick={onClose}>
        <div
          className="support-modal-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="support-modal-header">
            <h2>Edit Support Category</h2>
            <button
              type="button"
              className="support-modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              <FiX />
            </button>
          </div>
          <div className="support-modal-body">{formContent}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="support-admin-container">
      <div className="support-page-form-container">
        <button
          type="button"
          className="support-back-to-list-btn"
          onClick={() => navigate("/admin/support")}
        >
          <FiArrowLeft /> Back to Support Management
        </button>
        <div className="support-table-card" style={{ padding: 28 }}>
          <h2 style={{ margin: "0 0 20px" }}>Edit Support Category</h2>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default EditCategory;
