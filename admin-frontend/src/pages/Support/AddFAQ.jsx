import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave, FiX } from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "./SupportManagement.css";

const AddFAQ = ({ isModal = false, preselectedCategoryId = "", onClose, onSuccess }) => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  const [formData, setFormData] = useState({
    category: preselectedCategoryId || "",
    question: "",
    answer: "",
    displayOrder: 0,
    isActive: true,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get("/support/categories");
        if (isMounted && res.data?.success && Array.isArray(res.data?.categories)) {
          setCategories(res.data.categories);
          setFormData((prev) => {
            if (!prev.category && res.data.categories.length > 0) {
              return {
                ...prev,
                category: preselectedCategoryId || res.data.categories[0]._id,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        if (isMounted) {
          toast.error("Failed to load categories for FAQ assignment");
        }
      } finally {
        if (isMounted) {
          setLoadingCategories(false);
        }
      }
    };
    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [preselectedCategoryId]);

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
      const res = await api.post("/support/faqs", formData);

      if (res.data?.success) {
        toast.success(res.data.message || "FAQ created successfully!");
        if (onSuccess) {
          onSuccess(res.data.faq);
        } else {
          navigate("/admin/support");
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create FAQ");
    } finally {
      setSubmitting(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className="support-form-grid">
      <div className="support-form-group">
        <label htmlFor="faq-category">Support Category *</label>
        <select
          id="faq-category"
          value={formData.category}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, category: e.target.value }))
          }
          disabled={loadingCategories}
          required
        >
          {loadingCategories ? (
            <option value="">Loading categories...</option>
          ) : categories.length === 0 ? (
            <option value="">No categories available</option>
          ) : (
            categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.isActive ? "" : "[Inactive]"}
              </option>
            ))
          )}
        </select>
      </div>

      <div className="support-form-group">
        <label htmlFor="faq-question">Question *</label>
        <input
          id="faq-question"
          type="text"
          placeholder="e.g. How can I return my product?"
          value={formData.question}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, question: e.target.value }))
          }
          required
          autoFocus
        />
      </div>

      <div className="support-form-group">
        <label htmlFor="faq-answer">Answer *</label>
        <textarea
          id="faq-answer"
          placeholder="Provide a clear, helpful explanation or step-by-step instructions..."
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
          <label htmlFor="faq-order">Display Order</label>
          <input
            id="faq-order"
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
          disabled={submitting || loadingCategories}
        >
          <FiSave /> {submitting ? "Saving..." : "Save FAQ"}
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
            <h2>Add Frequently Asked Question</h2>
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
          <h2 style={{ margin: "0 0 20px" }}>Create New Support FAQ</h2>
          {formContent}
        </div>
      </div>
    </div>
  );
};

export default AddFAQ;
