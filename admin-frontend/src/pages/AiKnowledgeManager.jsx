import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import {
  MdSmartToy,
  MdAdd,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdSearch,
  MdCheckCircle,
  MdCancel,
  MdInventory2,
  MdCategory,
  MdLocalOffer,
  MdClose,
} from "react-icons/md";
import api from "../api/axios";
import "../styles/AiKnowledgeManager.css";

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "orders", label: "Orders & Tracking" },
  { value: "returns", label: "Returns & Exchanges" },
  { value: "refund", label: "Refunds & Reversals" },
  { value: "payment", label: "Payment & UPI/COD" },
  { value: "account", label: "Account & Profile" },
  { value: "products", label: "Product & Availability" },
  { value: "cart", label: "Cart & Checkout" },
  { value: "wishlist", label: "Wishlist" },
  { value: "coupons", label: "Coupons & Vouchers" },
  { value: "offers", label: "Discounts & Offers" },
  { value: "sizing", label: "Size Guides & Fitting" },
  { value: "delivery", label: "Delivery & Pincodes" },
  { value: "pickup", label: "Click & Collect" },
  { value: "store", label: "Stores & Workshops" },
  { value: "sports_advice", label: "Sports & Gear Advice" },
  { value: "warranty", label: "Warranty & Repairs" },
  { value: "cancellation", label: "Cancellations" },
  { value: "technical_support", label: "Technical Support" },
  { value: "membership", label: "Decathlon Membership" },
  { value: "shipping", label: "Shipping Policies" },
  { value: "general", label: "General & Support" },
];

const emptyForm = {
  topic: "",
  category: "orders",
  keywords: "",
  answer: "",
  isActive: true,
};

const AiKnowledgeManager = () => {
  const [knowledgeList, setKnowledgeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Fetch Live DB Stats and Knowledge List
  const fetchData = async () => {
    setLoading(true);
    try {
      const [knowledgeRes, statsRes] = await Promise.all([
        api.get("/ai/knowledge"),
        api.get("/ai/stats"),
      ]);

      if (knowledgeRes.data?.success) {
        setKnowledgeList(knowledgeRes.data.data || []);
      }
      if (statsRes.data?.success) {
        setStats(statsRes.data.stats);
      }
    } catch (err) {
      console.error("Fetch AI Data Error:", err);
      toast.error("Failed to load live database knowledge");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered knowledge
  const filteredList = knowledgeList.filter((item) => {
    const matchesCat =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && item.isActive) ||
      (statusFilter === "inactive" && !item.isActive);
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      item.topic?.toLowerCase().includes(query) ||
      item.answer?.toLowerCase().includes(query) ||
      (item.keywords || []).some((kw) => kw.toLowerCase().includes(query));
    return matchesCat && matchesStatus && matchesSearch;
  });

  // Open Add Modal
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      topic: item.topic || "",
      category: item.category || "general",
      keywords: (item.keywords || []).join(", "),
      answer: item.answer || "",
      isActive: item.isActive !== false,
    });
    setIsModalOpen(true);
  };

  // Save Knowledge (Create or Update in MongoDB)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.topic.trim() || !formData.answer.trim()) {
      toast.error("Please provide both a topic and an answer.");
      return;
    }

    // Client-side duplicate check
    const trimmedTopic = formData.topic.trim().toLowerCase();
    const duplicate = knowledgeList.find(
      (k) =>
        k.topic?.trim().toLowerCase() === trimmedTopic &&
        (!editingId || k._id !== editingId)
    );
    if (duplicate) {
      toast.error(
        `A topic named "${formData.topic.trim()}" already exists in "${duplicate.category}". Please enter a unique topic.`
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        keywords: formData.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
      };

      if (editingId) {
        const res = await api.put(`/ai/knowledge/${editingId}`, payload);
        if (res.data?.success) {
          toast.success("Knowledge updated in database!");
        }
      } else {
        const res = await api.post("/ai/knowledge", payload);
        if (res.data?.success) {
          toast.success("New dynamic knowledge saved to database!");
        }
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Error saving knowledge item");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active Status
  const handleToggleActive = async (item) => {
    try {
      const updated = !item.isActive;
      await api.put(`/ai/knowledge/${item._id}`, { isActive: updated });
      toast.success(`Knowledge ${updated ? "activated" : "deactivated"}`);
      setKnowledgeList((prev) =>
        prev.map((k) => (k._id === item._id ? { ...k, isActive: updated } : k))
      );
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  // Delete Knowledge from MongoDB
  const handleDelete = async (id, topic) => {
    if (!window.confirm(`Are you sure you want to delete "${topic}" from MongoDB?`)) {
      return;
    }

    try {
      const res = await api.delete(`/ai/knowledge/${id}`);
      if (res.data?.success) {
        toast.success("Knowledge item deleted from database");
        setKnowledgeList((prev) => prev.filter((k) => k._id !== id));
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete knowledge item");
    }
  };

  return (
    <div className="ai-knowledge-page">
      {/* HEADER */}
      <div className="ai-knowledge-header">
        <div>
          <div className="title-with-badge">
            <h1>Dynamic AI Knowledge Base</h1>
            <span className="live-db-badge">
              <span className="pulse-dot"></span> LIVE MONGODB
            </span>
          </div>
          <p>
            Real-time Decathlon AI brain grounded directly in your MongoDB
            database. Changes take effect instantly in the chatbot.
          </p>
        </div>

        <div className="ai-knowledge-header-actions">
          <button
            type="button"
            className="refresh-ai-btn"
            onClick={fetchData}
            title="Refresh live data"
          >
            <MdRefresh /> Refresh
          </button>
          <button
            type="button"
            className="add-ai-btn"
            onClick={handleOpenAdd}
          >
            <MdAdd /> Add Topic
          </button>
        </div>
      </div>

      {/* LIVE DATABASE METRICS */}
      {stats && (
        <div className="ai-stats-grid">
          <div className="ai-stat-card">
            <div className="stat-icon-wrapper products-icon">
              <MdInventory2 />
            </div>
            <div>
              <div className="stat-value">{stats.totalProducts}</div>
              <div className="stat-label">Live Products in DB</div>
            </div>
          </div>

          <div className="ai-stat-card">
            <div className="stat-icon-wrapper categories-icon">
              <MdCategory />
            </div>
            <div>
              <div className="stat-value">{stats.totalCategories}</div>
              <div className="stat-label">Sports Categories</div>
            </div>
          </div>

          <div className="ai-stat-card">
            <div className="stat-icon-wrapper ai-icon">
              <MdSmartToy />
            </div>
            <div>
              <div className="stat-value">{knowledgeList.length}</div>
              <div className="stat-label">Active AI Knowledge Topics</div>
            </div>
          </div>

          <div className="ai-stat-card">
            <div className="stat-icon-wrapper brands-icon">
              <MdLocalOffer />
            </div>
            <div>
              <div className="stat-value">{stats.brandsCount}</div>
              <div className="stat-label">Live Brands in Catalog</div>
            </div>
          </div>
        </div>
      )}

      {/* CONTROLS (SEARCH, STATUS & CATEGORY TABS) */}
      <div className="ai-controls-bar">
        <div className="ai-controls-top">
          <div className="ai-search-box">
            <MdSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search topics, answers, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchTerm("")}
              >
                <MdClose />
              </button>
            )}
          </div>

          <div className="ai-status-filters">
            <button
              type="button"
              className={`status-filter-btn ${statusFilter === "all" ? "active" : ""}`}
              onClick={() => setStatusFilter("all")}
            >
              All ({knowledgeList.length})
            </button>
            <button
              type="button"
              className={`status-filter-btn active-filter ${statusFilter === "active" ? "active" : ""}`}
              onClick={() => setStatusFilter("active")}
            >
              Active ({knowledgeList.filter((k) => k.isActive).length})
            </button>
            <button
              type="button"
              className={`status-filter-btn inactive-filter ${statusFilter === "inactive" ? "active" : ""}`}
              onClick={() => setStatusFilter("inactive")}
            >
              Inactive ({knowledgeList.filter((k) => !k.isActive).length})
            </button>
          </div>
        </div>

        <div className="ai-category-tabs">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`cat-tab ${
                selectedCategory === c.value ? "active" : ""
              }`}
              onClick={() => setSelectedCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* KNOWLEDGE LIST TABLE */}
      <div className="ai-table-container">
        {loading ? (
          <div className="ai-loading-state">
            <div className="spinner"></div>
            <p>Loading real-time knowledge from MongoDB...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="ai-empty-state">
            <MdSmartToy className="empty-icon" />
            <h3>No Knowledge Topics Found</h3>
            <p>
              {searchTerm
                ? "Try searching for a different keyword."
                : "Add your first dynamic topic to expand the AI's intelligence!"}
            </p>
            <button
              type="button"
              className="add-ai-btn"
              onClick={handleOpenAdd}
            >
              <MdAdd /> Add Knowledge Topic
            </button>
          </div>
        ) : (
          <table className="ai-table">
            <thead>
              <tr>
                <th>Topic & Category</th>
                <th>Keywords</th>
                <th>Database Answer (Markdown)</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((item) => (
                <tr key={item._id}>
                  <td className="topic-col">
                    <div className="topic-title">{item.topic}</div>
                    <span className={`cat-pill cat-${item.category}`}>
                      {item.category.replace("_", " ")}
                    </span>
                  </td>

                  <td className="keywords-col">
                    <div className="keywords-tags">
                      {(item.keywords || []).slice(0, 5).map((kw, idx) => (
                        <span key={idx} className="kw-tag">
                          {kw}
                        </span>
                      ))}
                      {(item.keywords || []).length > 5 && (
                        <span className="kw-more">
                          +{item.keywords.length - 5} more
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="answer-col">
                    <div className="answer-preview">{item.answer}</div>
                  </td>

                  <td className="status-col">
                    <button
                      type="button"
                      className={`status-badge ${
                        item.isActive ? "active" : "inactive"
                      }`}
                      onClick={() => handleToggleActive(item)}
                      title="Click to toggle status"
                    >
                      {item.isActive ? (
                        <>
                          <MdCheckCircle /> Active
                        </>
                      ) : (
                        <>
                          <MdCancel /> Inactive
                        </>
                      )}
                    </button>
                  </td>

                  <td className="actions-col">
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="action-btn edit-btn"
                        onClick={() => handleOpenEdit(item)}
                        title="Edit Knowledge"
                      >
                        <MdEdit />
                      </button>
                      <button
                        type="button"
                        className="action-btn delete-btn"
                        onClick={() => handleDelete(item._id, item.topic)}
                        title="Delete from Database"
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

      {/* ADD / EDIT MODAL */}
      {isModalOpen && (
        <div className="ai-modal-overlay">
          <div className="ai-modal-card">
            <div className="ai-modal-header">
              <h2>
                {editingId ? "Edit AI Knowledge Topic" : "Add Dynamic AI Topic"}
              </h2>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSave} className="ai-modal-form">
              <div className="form-group">
                <label>Topic Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Marathon Training Gear Advice"
                  value={formData.topic}
                  onChange={(e) =>
                    setFormData({ ...formData, topic: e.target.value })
                  }
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <div className="status-toggle-wrapper">
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            isActive: e.target.checked,
                          })
                        }
                      />
                      <span className="slider round"></span>
                    </label>
                    <span className="toggle-label">
                      {formData.isActive ? "Active (Live in Chat)" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Keywords (Comma separated) *</label>
                <input
                  type="text"
                  placeholder="e.g. marathon, 42k, 21k, race, kiprun, long run, endurance"
                  value={formData.keywords}
                  onChange={(e) =>
                    setFormData({ ...formData, keywords: e.target.value })
                  }
                />
                <small className="form-hint">
                  Keywords and 2-word phrases used to match user queries in real-time.
                </small>
              </div>

              <div className="form-group">
                <label>AI Answer (Supports Markdown) *</label>
                <textarea
                  rows={6}
                  required
                  placeholder="Type the verified answer. You can use markdown like **bold**, *italics*, and bullet points."
                  value={formData.answer}
                  onChange={(e) =>
                    setFormData({ ...formData, answer: e.target.value })
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-btn"
                  disabled={saving}
                >
                  {saving ? "Saving to Database..." : "Save to MongoDB"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiKnowledgeManager;
