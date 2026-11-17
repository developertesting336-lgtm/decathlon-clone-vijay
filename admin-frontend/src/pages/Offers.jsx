import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdClose,
  MdSearch,
  MdFilterList,
  MdLocalOffer,
  MdCheckCircle,
  MdAccessTime,
  MdBlock,
  MdSchedule,
  MdInfo,
  MdToggleOn,
  MdToggleOff,
  MdFlashOn,
  MdCategory,
  MdInventory2,
  MdPublic,
} from "react-icons/md";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/Offers.css";

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalOffers, setTotalOffers] = useState(0);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [targetTypeFilter, setTargetTypeFilter] = useState("all");

  // Reference data for creation/editing
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation Modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });

  // Offer Form State
  const initialForm = {
    title: "",
    description: "",
    bannerText: "",
    badgeLabel: "Flash Deal",
    targetType: "product",
    applicableProducts: [],
    applicableCategories: [],
    discountType: "percentage",
    discountValue: "",
    maxDiscountAmount: "",
    startDate: "",
    endDate: "",
    priority: 10,
    isActive: true,
  };
  const [formData, setFormData] = useState(initialForm);

  // Product search filter inside modal
  const [productSearch, setProductSearch] = useState("");

  const fetchOffers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (targetTypeFilter !== "all") params.targetType = targetTypeFilter;
      if (search.trim()) params.search = search.trim();

      const response = await api.get("/offers/admin", { params });
      setOffers(response.data.offers || []);
      setTotalOffers(response.data.totalOffers || 0);
    } catch (error) {
      console.error("Fetch offers error:", error);
      toast.error(error.response?.data?.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, targetTypeFilter]);

  const fetchReferenceData = async () => {
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products?limit=100"),
        api.get("/categories"),
      ]);
      setAvailableProducts(prodRes.data?.products || []);
      setAvailableCategories(catRes.data?.categories || catRes.data || []);
    } catch (error) {
      console.warn("Could not load reference products/categories:", error.message);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  useEffect(() => {
    fetchReferenceData();
  }, []);

  const openCreateModal = () => {
    const now = new Date();
    const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const pad = (n) => String(n).padStart(2, "0");
    const formatForInput = (d) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setEditingOffer(null);
    setFormData({
      ...initialForm,
      startDate: formatForInput(now),
      endDate: formatForInput(inThreeDays),
    });
    setProductSearch("");
    setIsModalOpen(true);
  };

  const openEditModal = (offer) => {
    const pad = (n) => String(n).padStart(2, "0");
    const formatForInput = (d) => {
      if (!d) return "";
      const date = new Date(d);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    };

    setEditingOffer(offer);
    setFormData({
      title: offer.title || "",
      description: offer.description || "",
      bannerText: offer.bannerText || "",
      badgeLabel: offer.badgeLabel || "Special Deal",
      targetType: offer.targetType || "product",
      applicableProducts: (offer.applicableProducts || []).map((p) => p._id || p),
      applicableCategories: (offer.applicableCategories || []).map((c) => c._id || c),
      discountType: offer.discountType || "percentage",
      discountValue: offer.discountValue ?? "",
      maxDiscountAmount: offer.maxDiscountAmount ?? "",
      startDate: formatForInput(offer.startDate),
      endDate: formatForInput(offer.endDate),
      priority: offer.priority ?? 10,
      isActive: offer.isActive !== undefined ? offer.isActive : true,
    });
    setProductSearch("");
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const toggleProductSelection = (productId) => {
    setFormData((prev) => {
      const exists = prev.applicableProducts.includes(productId);
      return {
        ...prev,
        applicableProducts: exists
          ? prev.applicableProducts.filter((id) => id !== productId)
          : [...prev.applicableProducts, productId],
      };
    });
  };

  const toggleCategorySelection = (categoryId) => {
    setFormData((prev) => {
      const exists = prev.applicableCategories.includes(categoryId);
      return {
        ...prev,
        applicableCategories: exists
          ? prev.applicableCategories.filter((id) => id !== categoryId)
          : [...prev.applicableCategories, categoryId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      return toast.error("Offer title is required");
    }
    if (!formData.discountValue || Number(formData.discountValue) <= 0) {
      return toast.error("Please enter a valid discount value");
    }
    if (!formData.startDate || !formData.endDate) {
      return toast.error("Start and End dates are required");
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      return toast.error("End date must be after start date");
    }

    if (formData.targetType === "product" && formData.applicableProducts.length === 0) {
      return toast.error("Please select at least one product for this offer");
    }
    if (formData.targetType === "category" && formData.applicableCategories.length === 0) {
      return toast.error("Please select at least one category for this offer");
    }

    const payload = {
      ...formData,
      discountValue: Number(formData.discountValue),
      maxDiscountAmount: formData.maxDiscountAmount ? Number(formData.maxDiscountAmount) : null,
      priority: Number(formData.priority) || 1,
    };

    try {
      setSubmitting(true);
      if (editingOffer) {
        await api.put(`/offers/admin/${editingOffer._id}`, payload);
        toast.success("Offer updated successfully!");
      } else {
        await api.post("/offers/admin", payload);
        toast.success("Offer created successfully!");
      }
      setIsModalOpen(false);
      fetchOffers();
    } catch (error) {
      console.error("Save offer error:", error);
      toast.error(error.response?.data?.message || "Failed to save offer");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (offerId) => {
    try {
      await api.patch(`/offers/admin/${offerId}/toggle`);
      toast.success("Offer status toggled");
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to toggle offer status");
    }
  };

  const handleDeleteOffer = async () => {
    if (!deleteModal.id) return;
    try {
      await api.delete(`/offers/admin/${deleteModal.id}`);
      toast.success("Offer deleted successfully");
      setDeleteModal({ open: false, id: null, title: "" });
      fetchOffers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete offer");
    }
  };

  const filteredModalProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const term = productSearch.toLowerCase();
    return availableProducts.filter((p) => p.name?.toLowerCase().includes(term));
  }, [availableProducts, productSearch]);

  const getStatusBadge = (status, isActive) => {
    if (!isActive) {
      return <span className="offer-badge disabled"><MdBlock /> Disabled</span>;
    }
    switch (status) {
      case "active":
        return <span className="offer-badge active"><MdCheckCircle /> Active</span>;
      case "scheduled":
        return <span className="offer-badge scheduled"><MdSchedule /> Scheduled</span>;
      case "expired":
        return <span className="offer-badge expired"><MdAccessTime /> Expired</span>;
      default:
        return <span className="offer-badge">{status}</span>;
    }
  };

  const formatScheduleDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return new Date(dateStr).toLocaleDateString();
    }
  };

  const getScopeBadge = (offer) => {
    if (offer.targetType === "product") {
      const prods = offer.applicableProducts || [];
      const count = prods.length;
      if (count === 0) {
        return (
          <span className="offer-scope-pill product">
            <MdInventory2 /> No Products
          </span>
        );
      }
      const fullList = prods.map((p) => p.name || "Product").join(", ");
      if (count <= 2) {
        return (
          <span className="offer-scope-pill product" title={fullList}>
            <MdInventory2 /> <span className="scope-text">{fullList}</span>
          </span>
        );
      }
      const leadingNames = prods.slice(0, 2).map((p) => p.name || "Product").join(", ");
      return (
        <span className="offer-scope-pill product" title={fullList}>
          <MdInventory2 />
          <span className="scope-text">{leadingNames}</span>
          <span className="scope-more-count">+{count - 2} more</span>
        </span>
      );
    }
    if (offer.targetType === "category") {
      const cats = offer.applicableCategories || [];
      const count = cats.length;
      if (count === 0) {
        return (
          <span className="offer-scope-pill category">
            <MdCategory /> No Categories
          </span>
        );
      }
      const fullList = cats.map((c) => c.name || "Category").join(", ");
      if (count <= 2) {
        return (
          <span className="offer-scope-pill category" title={fullList}>
            <MdCategory /> <span className="scope-text">{fullList}</span>
          </span>
        );
      }
      const leadingNames = cats.slice(0, 2).map((c) => c.name || "Category").join(", ");
      return (
        <span className="offer-scope-pill category" title={fullList}>
          <MdCategory />
          <span className="scope-text">{leadingNames}</span>
          <span className="scope-more-count">+{count - 2} more</span>
        </span>
      );
    }
    return (
      <span className="offer-scope-pill sitewide">
        <MdPublic /> Sitewide
      </span>
    );
  };

  return (
    <div className="offers-manager-page">
      {/* Page Header */}
      <div className="offers-page-header">
        <div className="header-titles">
          <h1>
            <MdLocalOffer /> Offers & Promotions Engine
            {totalOffers > 0 && <span className="offers-count-badge">({totalOffers})</span>}
          </h1>
          <p>
            Manage product offers, category deals, scheduling, and automatic priority conflict resolution.
          </p>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="offers-btn refresh-btn"
            onClick={fetchOffers}
            disabled={loading}
            title="Refresh Offers"
          >
            <MdRefresh className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="offers-btn create-btn"
            onClick={openCreateModal}
          >
            <MdAdd />
            <span>Create New Offer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="offers-filter-bar">
        <div className="search-input-wrap">
          <MdSearch />
          <input
            type="text"
            placeholder="Search offers by title, banner text, badge..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => setSearch("")}
            >
              <MdClose />
            </button>
          )}
        </div>

        <div className="filter-dropdowns">
          <div className="filter-group">
            <span className="filter-label"><MdFilterList /> Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>

          <div className="filter-group">
            <span className="filter-label">Scope:</span>
            <select
              value={targetTypeFilter}
              onChange={(e) => setTargetTypeFilter(e.target.value)}
            >
              <option value="all">All Scopes</option>
              <option value="product">Specific Products</option>
              <option value="category">Category Offers</option>
              <option value="sitewide">Sitewide</option>
            </select>
          </div>
        </div>
      </div>

      {/* Offers Table */}
      <div className="offers-table-card">
        {loading ? (
          <div className="offers-loading-state">
            <div className="spinner"></div>
            <p>Loading offers...</p>
          </div>
        ) : offers.length === 0 ? (
          <div className="offers-empty-state">
            <MdLocalOffer className="empty-icon" />
            <h3>No Offers Found</h3>
            <p>Create your first product or category promotion to activate automated discounts.</p>
            <button
              type="button"
              className="offers-btn create-btn"
              onClick={openCreateModal}
            >
              <MdAdd /> Create Offer
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="offers-table">
              <thead>
                <tr>
                  <th>Offer Details</th>
                  <th>Target Scope</th>
                  <th>Discount</th>
                  <th>Priority</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer._id}>
                    <td>
                      <div className="offer-title-col">
                        <strong className="offer-name">{offer.title}</strong>
                        {offer.bannerText && (
                          <span className="offer-banner-preview">{offer.bannerText}</span>
                        )}
                        <span className="offer-badge-tag">{offer.badgeLabel || "Deal"}</span>
                      </div>
                    </td>
                    <td>{getScopeBadge(offer)}</td>
                    <td>
                      <div className="offer-discount-col">
                        <strong className="discount-val">
                          {offer.discountType === "percentage"
                            ? `${offer.discountValue}% OFF`
                            : `₹${offer.discountValue} OFF`}
                        </strong>
                        {offer.maxDiscountAmount && (
                          <span className="discount-cap">Cap: ₹{offer.maxDiscountAmount}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`priority-badge ${offer.priority >= 15 ? "high" : ""}`}>
                        <MdFlashOn /> P{offer.priority}
                      </span>
                    </td>
                    <td>
                      <div className="schedule-col">
                        <div className="date-row">
                          <span className="date-label">Start:</span>
                          <span className="date-val">{formatScheduleDate(offer.startDate)}</span>
                        </div>
                        <div className="date-row">
                          <span className="date-label">End:</span>
                          <span className="date-val">{formatScheduleDate(offer.endDate)}</span>
                        </div>
                      </div>
                    </td>
                    <td>{getStatusBadge(offer.status, offer.isActive)}</td>
                    <td>
                      <div className="actions-cell">
                        <button
                          type="button"
                          className="action-icon-btn toggle"
                          onClick={() => handleToggleStatus(offer._id)}
                          title={offer.isActive ? "Deactivate Offer" : "Activate Offer"}
                        >
                          {offer.isActive ? <MdToggleOn className="toggle-on" /> : <MdToggleOff className="toggle-off" />}
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn edit"
                          onClick={() => openEditModal(offer)}
                          title="Edit Offer"
                        >
                          <MdEdit />
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn delete"
                          onClick={() => setDeleteModal({ open: true, id: offer._id, title: offer.title })}
                          title="Delete Offer"
                        >
                          <MdDelete />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="offer-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="offer-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="offer-modal-header">
              <div className="modal-title-group">
                <h3>{editingOffer ? "Edit Offer" : "Create New Offer"}</h3>
                <p>Configure product or category discounts, scheduling, and priority conflict resolution.</p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="offer-modal-form">
              <div className="modal-form-scrollable">
                {/* 1. Basic Info */}
                <div className="form-section">
                  <h4 className="section-title">1. Basic Offer Details</h4>
                  <div className="form-row">
                    <div className="form-group flex-2">
                      <label>Offer Title *</label>
                      <input
                        type="text"
                        name="title"
                        placeholder="e.g. Monsoon Running Fest"
                        value={formData.title}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>Badge Label</label>
                      <input
                        type="text"
                        name="badgeLabel"
                        placeholder="e.g. Flash Deal"
                        value={formData.badgeLabel}
                        onChange={handleFormChange}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Promotional Banner Text</label>
                    <input
                      type="text"
                      name="bannerText"
                      placeholder="e.g. Flat 20% off on all Cardio Equipment this weekend!"
                      value={formData.bannerText}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <textarea
                      name="description"
                      rows="2"
                      placeholder="Internal remarks or customer-facing details..."
                      value={formData.description}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>

                {/* 2. Target Scope */}
                <div className="form-section">
                  <h4 className="section-title">2. Target Scope</h4>
                  <div className="scope-radio-row">
                    <label className={`scope-radio-card ${formData.targetType === "product" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="product"
                        checked={formData.targetType === "product"}
                        onChange={handleFormChange}
                      />
                      <MdInventory2 className="scope-icon" />
                      <strong>Specific Products</strong>
                      <span>Select individual items</span>
                    </label>

                    <label className={`scope-radio-card ${formData.targetType === "category" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="category"
                        checked={formData.targetType === "category"}
                        onChange={handleFormChange}
                      />
                      <MdCategory className="scope-icon" />
                      <strong>Entire Category</strong>
                      <span>Apply to category items</span>
                    </label>

                    <label className={`scope-radio-card ${formData.targetType === "sitewide" ? "selected" : ""}`}>
                      <input
                        type="radio"
                        name="targetType"
                        value="sitewide"
                        checked={formData.targetType === "sitewide"}
                        onChange={handleFormChange}
                      />
                      <MdPublic className="scope-icon" />
                      <strong>Sitewide</strong>
                      <span>Applies to all products</span>
                    </label>
                  </div>

                  {/* Product Picker */}
                  {formData.targetType === "product" && (
                    <div className="picker-container">
                      <div className="picker-header">
                        <label>Select Products ({formData.applicableProducts.length} selected):</label>
                        <input
                          type="text"
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="picker-search-input"
                        />
                      </div>
                      <div className="picker-list">
                        {filteredModalProducts.map((p) => {
                          const isSelected = formData.applicableProducts.includes(p._id);
                          return (
                            <div
                              key={p._id}
                              className={`picker-item ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleProductSelection(p._id)}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                              />
                              <span className="picker-item-name">{p.name}</span>
                              <span className="picker-item-price">₹{p.price}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category Picker */}
                  {formData.targetType === "category" && (
                    <div className="picker-container">
                      <label>Select Categories ({formData.applicableCategories.length} selected):</label>
                      <div className="picker-chips-grid">
                        {availableCategories.map((c) => {
                          const isSelected = formData.applicableCategories.includes(c._id);
                          return (
                            <button
                              key={c._id}
                              type="button"
                              className={`picker-chip ${isSelected ? "selected" : ""}`}
                              onClick={() => toggleCategorySelection(c._id)}
                            >
                              {c.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Discount Settings */}
                <div className="form-section">
                  <h4 className="section-title">3. Discount Configuration</h4>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Discount Type *</label>
                      <select
                        name="discountType"
                        value={formData.discountType}
                        onChange={handleFormChange}
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="flat">Flat Amount (₹)</option>
                      </select>
                    </div>

                    <div className="form-group flex-1">
                      <label>
                        {formData.discountType === "percentage" ? "Discount Percentage (%) *" : "Discount Amount (₹) *"}
                      </label>
                      <input
                        type="number"
                        name="discountValue"
                        min="1"
                        max={formData.discountType === "percentage" ? "90" : "50000"}
                        placeholder={formData.discountType === "percentage" ? "e.g. 25" : "e.g. 300"}
                        value={formData.discountValue}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    {formData.discountType === "percentage" && (
                      <div className="form-group flex-1">
                        <label>Max Discount Cap (₹)</label>
                        <input
                          type="number"
                          name="maxDiscountAmount"
                          placeholder="e.g. 1000 (optional)"
                          value={formData.maxDiscountAmount}
                          onChange={handleFormChange}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Scheduling & Priority */}
                <div className="form-section">
                  <h4 className="section-title">4. Offer Scheduling & Priority Conflict Resolution</h4>
                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleFormChange}
                        required
                      />
                    </div>

                    <div className="form-group flex-1">
                      <label>End Date & Time *</label>
                      <input
                        type="datetime-local"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleFormChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <div className="priority-slider-header">
                      <label>
                        Offer Priority: <strong>{formData.priority}</strong> / 100
                      </label>
                      <span className="priority-hint">
                        <MdInfo /> Higher priority wins when multiple offers collide.
                      </span>
                    </div>
                    <input
                      type="range"
                      name="priority"
                      min="1"
                      max="100"
                      value={formData.priority}
                      onChange={handleFormChange}
                      className="priority-range"
                    />
                  </div>

                  <div className="checkbox-row">
                    <label className="active-checkbox-label">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleFormChange}
                      />
                      <span>Active (Offer is enabled and eligible to run)</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="offer-modal-footer">
                <button
                  type="button"
                  className="modal-btn cancel-btn"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn submit-btn"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : editingOffer ? "Update Offer" : "Create Offer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && (
        <div className="offer-modal-overlay" onClick={() => setDeleteModal({ open: false, id: null, title: "" })}>
          <div className="delete-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="delete-modal-icon">
              <MdDelete />
            </div>
            <h3>Delete Offer?</h3>
            <p>
              Are you sure you want to delete <strong>"{deleteModal.title}"</strong>? Any products currently discounted under this offer will automatically revert to their standard pricing.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="modal-btn cancel-btn"
                onClick={() => setDeleteModal({ open: false, id: null, title: "" })}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-btn delete-confirm-btn"
                onClick={handleDeleteOffer}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offers;
