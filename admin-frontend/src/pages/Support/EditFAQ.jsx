import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "./SupportManagement.css";

const EditFAQ = ({ faqId: propId, isModal = false, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { id: paramId } = useParams();
  const faqId = propId || paramId;

  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    category: "",
    question: "",
    answer: "",
    displayOrder: 0,
    isActive: true,
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchFAQAndCategories = useCallback(async () => {
    if (!faqId) return;
    try {
      setLoading(true);
      const [faqRes, catRes] = await Promise.all([
        api.get(`/support/faqs/${faqId}`),
        api.get("/support/categories"),
      ]);

      if (catRes.data?.success && Array.isArray(catRes.data?.categories)) {
        setCategories(catRes.data.categories);
      }

      if (faqRes.data?.success && faqRes.data?.faq) {
        const f = faqRes.data.faq;
        setFormData({
          category: f.category?._id || f.category || "",
          question: f.question || "",
          answer: f.answer || "",
          displayOrder: f.displayOrder ?? 0,
          isActive: f.isActive !== false,
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load FAQ details");
    } finally {
      setLoading(false);
    }
  }, [faqId]);

  useEffect(() => {
    fetchFAQAndCategories();
  }, [fetchFAQAndCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.category) {
      toast.error("Please select a category");
      return;
    }
    if (!formData.question.trim()) {
      toast.error("Question is required");
      return;
    }
    if (!formData.answer.trim()) {
      toast.error("Answer is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.put(`/support/faqs/${faqId}`, formData);

      if (res.data?.success) {
        toast.success(res.data.message || "FAQ updated successfully!");
        if (onSuccess) {
          onSuccess(res.data.faq);
        } else {
          navigate("/admin/support");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update FAQ");
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = loading ? (
    <div style={{ textAlign: "center", padding: "40px 0", color: "#64748b" }}>
      Loading FAQ details...
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="support-form-grid">
      <div className="support-form-group">
        <label htmlFor="edit-faq-category">Support Category *</label>
        <select
          id="edit-faq-category"
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
          required
        >
          {categories.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} {c.isActive ? "" : "[Inactive]"}
            </option>
          ))}
        </select>
      </div>

      <div className="support-form-group">
        <label htmlFor="edit-faq-question">Question *</label>
        <input
          id="edit-faq-question"
          type="text"
          value={formData.question}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, question: e.target.value }))
          }
          required
          autoFocus
        />
      </div>

      <div className="support-form-group">
        <label htmlFor="edit-faq-answer">Answer *</label>
        <textarea
          id="edit-faq-answer"
          value={formData.answer}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, answer: e.target.value }))
          }
          rows={5}
          required
        />
      </div>

      <div className="support-form-row">
        <div className="support-form-group">
          <label htmlFor="edit-faq-order">Display Order</label>
          <input
            id="edit-faq-order"
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

        <div className="support-form-group" style={{ justifyContent: "center" }}>
          <label className="support-form-checkbox-label">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            <span>Active (Visible on public category FAQ accordion)</span>
          </label>
        </div>
      </div>

      <div className="support-modal-footer" style={{ padding: "16px 0 0" }}>
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
          <FiSave /> {submitting ? "Saving..." : "Update FAQ"}
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
            <h2>Edit Frequently Asked Question</h2>
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
          <h2 style={{ margin: "0 0 20px" }}>Edit Support FAQ</h2>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default EditFAQ;
