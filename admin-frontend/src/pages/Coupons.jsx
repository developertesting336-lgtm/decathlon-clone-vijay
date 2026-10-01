import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdClose,
  MdSearch,
  MdChevronLeft,
  MdChevronRight,
  MdLocalOffer,
  MdCheckCircle,
  MdCancel,
  MdAccessTime,
  MdContentCopy,
  MdWarning,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../api/axios";
import { getPaginationRange } from "../utils/pagination";
import "../styles/Coupons.css";

const COUPONS_PER_PAGE = 10;

const initialForm = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minimumOrderValue: "0",
  maximumDiscount: "",
  expiryDate: "",
  usageLimit: "0",
  isActive: true,
  distributionType: "global",
  perUserLimit: "1",
  priority: "0",
  newUserDays: "7",
  inactiveDays: "30",
  assignedUsers: [],
  categories: [],
  products: [],
  userGroup: "all_users",
  minimumOrders: "5",
  minimumSpend: "10000",
};

const Coupons = () => {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" | "edit"
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  // Customer selection states for selected_users distribution
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Delete modal
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    coupon: null,
    deleting: false,
  });

  // Fetch all coupons
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const res = await api.get("/coupons");
      if (res.data?.success && Array.isArray(res.data?.coupons)) {
        setCoupons(res.data.coupons);
      } else {
        setCoupons([]);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  // Fetch available customers for selected_users distribution
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await api.get("/auth/admin/users");
      if (res.data?.users && Array.isArray(res.data.users)) {
        setAvailableUsers(res.data.users);
      }
    } catch (err) {
      console.error("Failed to load users for coupon assignment:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
    fetchUsers();
  }, []);

  // Check if a coupon is expired
  const isExpired = (expiryDate) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  // Summary statistics
  const stats = useMemo(() => {
    const total = coupons.length;
    let active = 0;
    let expired = 0;
    let inactive = 0;

    coupons.forEach((c) => {
      const exp = isExpired(c.expiryDate);
      if (exp) {
        expired++;
      } else if (c.isActive) {
        active++;
      } else {
        inactive++;
      }
    });

    return { total, active, expired, inactive };
  }, [coupons]);

  // Filter and search
  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      // Search filter (by code)
      if (search.trim()) {
        const query = search.trim().toLowerCase();
        if (!coupon.code?.toLowerCase().includes(query)) {
          return false;
        }
      }

      const expired = isExpired(coupon.expiryDate);

      // Status / Type filter
      switch (filterType) {
        case "ACTIVE":
          return coupon.isActive && !expired;
        case "INACTIVE":
          return !coupon.isActive;
        case "EXPIRED":
          return expired;
        case "PERCENTAGE":
          return coupon.discountType === "percentage";
        case "FLAT":
          return coupon.discountType === "flat";
        default:
          return true;
      }
    });
  }, [coupons, search, filterType]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCoupons.length / COUPONS_PER_PAGE));
  const paginatedCoupons = useMemo(() => {
    const startIndex = (currentPage - 1) * COUPONS_PER_PAGE;
    return filteredCoupons.slice(startIndex, startIndex + COUPONS_PER_PAGE);
  }, [filteredCoupons, currentPage]);

  const paginationRange = useMemo(() => {
    return getPaginationRange(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // Handle create coupon navigation
  const handleOpenCreate = () => {
    setModalMode("create");
    setEditingId(null);
    navigate("/coupons/add");
  };

  // Handle edit coupon navigation
  const handleOpenEdit = (coupon) => {
    setModalMode("edit");
    setEditingId(coupon._id);
    navigate(`/coupons/edit/${coupon._id}`);
  };

  // Customer selection helper functions for selected_users
  const handleToggleUser = (userId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.assignedUsers) ? [...prev.assignedUsers] : [];
      const index = current.indexOf(userId);
      let updated;
      if (index > -1) {
        updated = current.filter((id) => id !== userId);
      } else {
        updated = [...current, userId];
      }
      return { ...prev, assignedUsers: updated };
    });
    if (formErrors.assignedUsers) {
      setFormErrors((prev) => ({ ...prev, assignedUsers: "" }));
    }
  };

  const handleRemoveUser = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: (prev.assignedUsers || []).filter((id) => id !== userId),
    }));
  };

  const handleClearAllUsers = () => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: [],
    }));
  };

  const handleSelectAllFiltered = (filteredList) => {
    setFormData((prev) => {
      const set = new Set(prev.assignedUsers || []);
      filteredList.forEach((u) => set.add(u._id));
      return {
        ...prev,
        assignedUsers: Array.from(set),
      };
    });
    if (formErrors.assignedUsers) {
      setFormErrors((prev) => ({ ...prev, assignedUsers: "" }));
    }
  };

  // Filtered customer list based on search query
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return availableUsers;
    const q = userSearch.trim().toLowerCase();
    return availableUsers.filter((u) => {
      const name = (u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      const phone = (u.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [availableUsers, userSearch]);

  // Form field change handler
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "code" ? value.toUpperCase().trimStart() : value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    const code = formData.code.trim();
    if (!code) {
      errors.code = "Coupon code is required";
    }

    const val = Number(formData.discountValue);
    if (!formData.discountValue || isNaN(val) || val <= 0) {
      errors.discountValue = "Discount value must be greater than 0";
    } else if (formData.discountType === "percentage" && val > 100) {
      errors.discountValue = "Percentage discount cannot exceed 100%";
    }

    if (formData.minimumOrderValue !== "") {
      const mov = Number(formData.minimumOrderValue);
      if (isNaN(mov) || mov < 0) {
        errors.minimumOrderValue = "Minimum order value cannot be negative";
      }
    }

    if (formData.maximumDiscount !== "") {
      const maxD = Number(formData.maximumDiscount);
      if (isNaN(maxD) || maxD < 0) {
        errors.maximumDiscount = "Maximum discount cannot be negative";
      }
    }

    if (!formData.expiryDate) {
      errors.expiryDate = "Expiry date is required";
    } else {
      const exp = new Date(formData.expiryDate);
      if (isNaN(exp.getTime())) {
        errors.expiryDate = "Invalid expiry date";
      }
    }

    if (formData.usageLimit !== "") {
      const limit = Number(formData.usageLimit);
      if (isNaN(limit) || limit < 0) {
        errors.usageLimit = "Usage limit cannot be negative";
      }
    }

    if (formData.perUserLimit !== "") {
      const perUser = Number(formData.perUserLimit);
      if (isNaN(perUser) || perUser < 1) {
        errors.perUserLimit = "Per-user limit must be at least 1";
      }
    }

    if (formData.distributionType === "new_user") {
      const days = Number(formData.newUserDays);
      if (!formData.newUserDays || isNaN(days) || days <= 0 || !Number.isInteger(days)) {
        errors.newUserDays = "New user eligibility days must be a positive integer";
      }
    }

    if (formData.distributionType === "inactive_user") {
      const days = Number(formData.inactiveDays);
      if (!formData.inactiveDays || isNaN(days) || days <= 0 || !Number.isInteger(days)) {
        errors.inactiveDays = "Inactive User Days must be a positive integer";
      }
    }

    if (formData.distributionType === "selected_users") {
      if (!Array.isArray(formData.assignedUsers) || formData.assignedUsers.length === 0) {
        errors.assignedUsers = "Please select at least one customer for selected_users distribution";
      }
    }

    if (formData.distributionType === "user_group") {
      const ug = formData.userGroup || "all_users";
      if (ug === "frequent_buyers") {
        const mo = Number(formData.minimumOrders);
        if (!formData.minimumOrders || isNaN(mo) || mo <= 0 || !Number.isInteger(mo)) {
          errors.minimumOrders = "Minimum orders must be a positive integer";
        }
      } else if (ug === "high_value_customers") {
        const ms = Number(formData.minimumSpend);
        if (!formData.minimumSpend || isNaN(ms) || ms <= 0) {
          errors.minimumSpend = "Minimum spend must be greater than 0";
        }
      } else if (ug === "new_users") {
        const days = Number(formData.newUserDays);
        if (!formData.newUserDays || isNaN(days) || days <= 0 || !Number.isInteger(days)) {
          errors.newUserDays = "New user eligibility days must be a positive integer";
        }
      } else if (ug === "returning_users" || ug === "inactive_customers") {
        const days = Number(formData.inactiveDays);
        if (!formData.inactiveDays || isNaN(days) || days <= 0 || !Number.isInteger(days)) {
          errors.inactiveDays = "Inactive User Days must be a positive integer";
        }
      } else if (ug === "custom") {
        if (!Array.isArray(formData.assignedUsers) || formData.assignedUsers.length === 0) {
          errors.assignedUsers = "Please select at least one customer for custom user group";
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit form (create or edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) return;

    try {
      setSubmitting(true);

      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minimumOrderValue: Number(formData.minimumOrderValue || 0),
        maximumDiscount:
          formData.maximumDiscount !== "" ? Number(formData.maximumDiscount) : null,
        expiryDate: new Date(formData.expiryDate).toISOString(),
        usageLimit: Number(formData.usageLimit || 0),
        isActive: Boolean(formData.isActive),
        distributionType: formData.distributionType || "global",
        perUserLimit: Math.max(1, Number(formData.perUserLimit) || 1),
        newUserDays:
          formData.distributionType === "new_user" ||
          (formData.distributionType === "user_group" && formData.userGroup === "new_users")
            ? Math.max(1, parseInt(formData.newUserDays, 10) || 7)
            : 0,
        inactiveDays:
          formData.distributionType === "inactive_user" ||
          (formData.distributionType === "user_group" &&
            (formData.userGroup === "returning_users" || formData.userGroup === "inactive_customers"))
            ? Math.max(1, parseInt(formData.inactiveDays, 10) || 30)
            : 0,
        assignedUsers:
          formData.distributionType === "selected_users" ||
          (formData.distributionType === "user_group" && formData.userGroup === "custom")
            ? formData.assignedUsers
            : [],
        eligibilityRules:
          formData.distributionType === "user_group"
            ? {
                userGroup: formData.userGroup || "all_users",
                group: formData.userGroup || "all_users",
                minimumOrders:
                  formData.userGroup === "frequent_buyers"
                    ? Math.max(1, parseInt(formData.minimumOrders, 10) || 5)
                    : 0,
                minimumSpend:
                  formData.userGroup === "high_value_customers"
                    ? Math.max(1, Number(formData.minimumSpend) || 10000)
                    : 0,
              }
            : {
                userGroup: "",
                group: "",
                minimumOrders: 0,
                minimumSpend: 0,
              },
      };

      if (modalMode === "create") {
        const res = await api.post("/coupons", payload);
        if (res.data?.success) {
          toast.success(`Coupon '${payload.code}' created successfully`);
          setModalOpen(false);
          await fetchCoupons();
        }
      } else {
        const res = await api.put(`/coupons/${editingId}`, payload);
        if (res.data?.success) {
          toast.success(`Coupon '${payload.code}' updated successfully`);
          setModalOpen(false);
          await fetchCoupons();
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save coupon";
      toast.error(msg);
      if (msg.toLowerCase().includes("code already exists")) {
        setFormErrors((prev) => ({ ...prev, code: "Coupon code already exists" }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle active status
  const handleToggleActive = async (coupon) => {
    const newActive = !coupon.isActive;

    // Optimistic UI update
    setCoupons((prev) =>
      prev.map((c) => (c._id === coupon._id ? { ...c, isActive: newActive } : c))
    );

    try {
      setTogglingId(coupon._id);
      await api.put(`/coupons/${coupon._id}`, { isActive: newActive });
      toast.success(
        `Coupon '${coupon.code}' ${newActive ? "activated" : "deactivated"}`
      );
    } catch (err) {
      // Revert on error
      setCoupons((prev) =>
        prev.map((c) => (c._id === coupon._id ? { ...c, isActive: !newActive } : c))
      );
      toast.error(err.response?.data?.message || "Failed to update coupon status");
    } finally {
      setTogglingId(null);
    }
  };

  // Delete coupon
  const handleConfirmDelete = async () => {
    if (!deleteModal.coupon) return;
    try {
      setDeleteModal((prev) => ({ ...prev, deleting: true }));
      await api.delete(`/coupons/${deleteModal.coupon._id}`);
      toast.success(`Coupon '${deleteModal.coupon.code}' deleted successfully`);
      setDeleteModal({ open: false, coupon: null, deleting: false });
      await fetchCoupons();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete coupon");
      setDeleteModal((prev) => ({ ...prev, deleting: false }));
    }
  };

  // Copy code to clipboard
  const handleCopyCode = (code) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code);
      toast.success(`Copied '${code}' to clipboard!`, { id: "coupon-copied" });
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="coupons-page">
      {/* 1. HEADER */}
      <div className="coupons-header">
        <div>
          <h1>Coupon Management</h1>
          <p>Create, manage and monitor discount vouchers for store promotions</p>
        </div>
        <div className="coupons-header-actions">
          <button
            type="button"
            className="refresh-coupon-btn"
            onClick={fetchCoupons}
            disabled={loading}
            title="Refresh coupon list"
          >
            <MdRefresh className={loading ? "spin" : ""} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            className="add-coupon-btn"
            onClick={handleOpenCreate}
          >
            <MdAdd />
            <span>Create Coupon</span>
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="coupons-stats-grid">
        <div className="coupon-stat-card stat-total">
          <div className="stat-icon-wrap">
            <MdLocalOffer />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Coupons</span>
            <strong className="stat-number">{stats.total}</strong>
          </div>
        </div>

        <div className="coupon-stat-card stat-active">
          <div className="stat-icon-wrap">
            <MdCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Active Coupons</span>
            <strong className="stat-number">{stats.active}</strong>
          </div>
        </div>

        <div className="coupon-stat-card stat-expired">
          <div className="stat-icon-wrap">
            <MdAccessTime />
          </div>
          <div className="stat-info">
            <span className="stat-label">Expired Coupons</span>
            <strong className="stat-number">{stats.expired}</strong>
          </div>
        </div>

        <div className="coupon-stat-card stat-inactive">
          <div className="stat-icon-wrap">
            <MdCancel />
          </div>
          <div className="stat-info">
            <span className="stat-label">Inactive Coupons</span>
            <strong className="stat-number">{stats.inactive}</strong>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR (SEARCH & FILTERS) */}
      <div className="coupons-toolbar">
        <div className="coupon-search-box">
          <MdSearch />
          <input
            type="text"
            placeholder="Search by coupon code..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => {
                setSearch("");
                setCurrentPage(1);
              }}
            >
              <MdClose />
            </button>
          )}
        </div>

        <div className="coupon-filter-tabs">
          {[
            { id: "ALL", label: "All" },
            { id: "ACTIVE", label: "Active" },
            { id: "INACTIVE", label: "Inactive" },
            { id: "PERCENTAGE", label: "Percentage" },
            { id: "FLAT", label: "Flat" },
            { id: "EXPIRED", label: "Expired" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`filter-tab-btn ${filterType === tab.id ? "active" : ""}`}
              onClick={() => {
                setFilterType(tab.id);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. TABLE */}
      <div className="coupons-table-card">
        <div className="table-responsive">
          <table className="coupons-table">
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Type</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Max Disc</th>
                <th>Audience</th>
                <th>Per User</th>
                <th>Expiry</th>
                <th>Usage</th>
                <th>Status</th>
                <th className="th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="td-empty">
                    <div className="table-loading-spinner" />
                    <span>Loading coupons...</span>
                  </td>
                </tr>
              ) : paginatedCoupons.length === 0 ? (
                <tr>
                  <td colSpan="11" className="td-empty">
                    <MdLocalOffer className="empty-icon" />
                    <h4>No coupons found</h4>
                    <p>
                      {search || filterType !== "ALL"
                        ? "Try clearing your search or changing filters"
                        : "Create your first coupon using the 'Create Coupon' button"}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCoupons.map((coupon) => {
                  const expired = isExpired(coupon.expiryDate);
                  return (
                    <tr key={coupon._id} className={expired ? "row-expired" : ""}>
                      {/* Code */}
                      <td>
                        <div className="coupon-code-cell">
                          <strong className="code-text">{coupon.code}</strong>
                          <button
                            type="button"
                            className="copy-code-btn"
                            title="Copy code"
                            onClick={() => handleCopyCode(coupon.code)}
                          >
                            <MdContentCopy />
                          </button>
                        </div>
                        {coupon.priority > 0 && (
                          <span style={{ fontSize: "10.5px", color: "#4f46e5", fontWeight: 600, display: "block", marginTop: "2px" }}>
                            Prio: {coupon.priority}
                          </span>
                        )}
                      </td>

                      {/* Type */}
                      <td>
                        <span className={`type-badge type-${coupon.discountType}`}>
                          {coupon.discountType === "percentage" ? "% Percent" : "₹ Flat"}
                        </span>
                      </td>

                      {/* Value */}
                      <td>
                        <strong className="discount-val-text">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : `₹${Number(coupon.discountValue).toLocaleString("en-IN")}`}
                        </strong>
                      </td>

                      {/* Min Order */}
                      <td>
                        {coupon.minimumOrderValue > 0 ? (
                          `₹${Number(coupon.minimumOrderValue).toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-muted">None</span>
                        )}
                      </td>

                      {/* Max Discount */}
                      <td>
                        {coupon.maximumDiscount > 0 ? (
                          `₹${Number(coupon.maximumDiscount).toLocaleString("en-IN")}`
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>

                      {/* Distribution */}
                      <td>
                        <span className={`dist-badge dist-${coupon.distributionType || "global"}`}>
                          {coupon.distributionType === "new_user"
                            ? `New (${coupon.newUserDays || 7}d)`
                            : coupon.distributionType === "inactive_user"
                            ? `Inactive (${coupon.inactiveDays || 30}d)`
                            : coupon.distributionType === "selected_users"
                            ? `Selected (${coupon.assignedUsers?.length || 0})`
                            : coupon.distributionType === "category_based"
                            ? `Category (${coupon.categories?.length || 0})`
                            : coupon.distributionType === "product_based"
                            ? `Product (${coupon.products?.length || 0})`
                            : coupon.distributionType === "user_group"
                            ? (() => {
                                const rawGroup =
                                  coupon.eligibilityRules?.userGroup ||
                                  coupon.eligibilityRules?.group;
                                const groupMap = {
                                  all_users: "All Users",
                                  new_users: "New Users",
                                  returning_users: "Returning Users",
                                  frequent_buyers: "Frequent Buyers",
                                  high_value_customers: "High Value",
                                  inactive_customers: "Inactive",
                                  custom: "Custom",
                                };
                                const gName =
                                  groupMap[rawGroup] ||
                                  (rawGroup ? rawGroup.replace("_", " ") : "Segment");
                                return `User Group (${gName})`;
                              })()
                            : coupon.distributionType === "global" || !coupon.distributionType
                            ? "Global"
                            : coupon.distributionType.replace("_", " ")}
                        </span>
                      </td>

                      {/* Per-User Limit */}
                      <td>
                        <span className="per-user-limit-text">
                          {coupon.perUserLimit || 1}x
                        </span>
                      </td>

                      {/* Expiry */}
                      <td>
                        <div className="expiry-cell">
                          <span className={expired ? "date-expired" : "date-active"}>
                            {formatDate(coupon.expiryDate)}
                          </span>
                          {expired && <span className="expired-pill">Expired</span>}
                        </div>
                      </td>

                      {/* Usage */}
                      <td>
                        <div className="usage-cell">
                          <span className="usage-count-text">
                            <strong>{coupon.usedCount || 0}</strong> /{" "}
                            {coupon.usageLimit > 0 ? coupon.usageLimit : "∞"}
                          </span>
                          {coupon.usageLimit > 0 && (
                            <div className="usage-progress-bar">
                              <div
                                className="usage-progress-fill"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((coupon.usedCount || 0) / coupon.usageLimit) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <button
                          type="button"
                          className={`status-toggle-btn ${
                            coupon.isActive ? "status-active" : "status-inactive"
                          }`}
                          onClick={() => handleToggleActive(coupon)}
                          disabled={togglingId === coupon._id}
                          title={
                            coupon.isActive
                              ? "Click to deactivate coupon"
                              : "Click to activate coupon"
                          }
                        >
                          {coupon.isActive ? (
                            <>
                              <span className="status-dot dot-active" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <span className="status-dot dot-inactive" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="td-actions">
                        <div className="action-buttons-group">
                          <button
                            type="button"
                            className="action-btn edit-btn"
                            onClick={() => handleOpenEdit(coupon)}
                            title="Edit coupon"
                          >
                            <MdEdit />
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            onClick={() =>
                              setDeleteModal({
                                open: true,
                                coupon,
                                deleting: false,
                              })
                            }
                            title="Delete coupon"
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
          <div className="coupons-pagination">
            <span className="pagination-info">
              Showing {(currentPage - 1) * COUPONS_PER_PAGE + 1} to{" "}
              {Math.min(currentPage * COUPONS_PER_PAGE, filteredCoupons.length)} of{" "}
              {filteredCoupons.length} coupons
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <MdChevronLeft />
              </button>

              {paginationRange.map((p, idx) => {
                if (typeof p === "string") {
                  return (
                    <span key={`ellipsis-${idx}`} className="page-ellipsis">
                      ...
                    </span>
                  );
                }
                return (
                  <button
                    key={p}
                    type="button"
                    className={`page-num-btn ${currentPage === p ? "active" : ""}`}
                    onClick={() => setCurrentPage(p)}
                  >
                    {p}
                  </button>
                );
              })}

              <button
                type="button"
                className="page-nav-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <MdChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================
          CREATE / EDIT MODAL
          ========================================================= */}
      {modalOpen && (
        <div
          className="admin-modal-overlay"
          onClick={submitting ? undefined : () => setModalOpen(false)}
        >
          <div
            className="admin-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="admin-modal-header">
              <h3>
                {modalMode === "create" ? "Create New Coupon" : `Edit Coupon: ${formData.code}`}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal-form">
              <div className="form-grid">
                {/* Coupon Code */}
                <div className="form-group col-span-2">
                  <label htmlFor="couponCode">
                    Coupon Code <span className="req">*</span>
                  </label>
                  <input
                    id="couponCode"
                    type="text"
                    placeholder="e.g. SUMMER50"
                    value={formData.code}
                    onChange={(e) => handleInputChange("code", e.target.value)}
                    maxLength={30}
                    className={formErrors.code ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.code && (
                    <span className="field-error-text">{formErrors.code}</span>
                  )}
                  <small className="field-hint">
                    Codes are automatically converted to uppercase.
                  </small>
                </div>

                {/* Discount Type */}
                <div className="form-group">
                  <label htmlFor="discountType">
                    Discount Type <span className="req">*</span>
                  </label>
                  <select
                    id="discountType"
                    value={formData.discountType}
                    onChange={(e) => handleInputChange("discountType", e.target.value)}
                    disabled={submitting}
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div className="form-group">
                  <label htmlFor="discountValue">
                    {formData.discountType === "percentage"
                      ? "Percentage Discount (%)"
                      : "Flat Discount Amount (₹)"}{" "}
                    <span className="req">*</span>
                  </label>
                  <input
                    id="discountValue"
                    type="number"
                    min="0"
                    max={formData.discountType === "percentage" ? "100" : undefined}
                    step="any"
                    placeholder={formData.discountType === "percentage" ? "e.g. 20" : "e.g. 200"}
                    value={formData.discountValue}
                    onChange={(e) => handleInputChange("discountValue", e.target.value)}
                    className={formErrors.discountValue ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.discountValue && (
                    <span className="field-error-text">{formErrors.discountValue}</span>
                  )}
                </div>

                {/* Minimum Order Value */}
                <div className="form-group">
                  <label htmlFor="minOrder">Minimum Order Value (₹)</label>
                  <input
                    id="minOrder"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0 for no minimum"
                    value={formData.minimumOrderValue}
                    onChange={(e) => handleInputChange("minimumOrderValue", e.target.value)}
                    className={formErrors.minimumOrderValue ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.minimumOrderValue && (
                    <span className="field-error-text">{formErrors.minimumOrderValue}</span>
                  )}
                </div>

                {/* Maximum Discount */}
                <div className="form-group">
                  <label htmlFor="maxDiscount">
                    Maximum Discount (₹){" "}
                    <span className="optional-tag">
                      {formData.discountType === "percentage" ? "(Cap)" : "(Optional)"}
                    </span>
                  </label>
                  <input
                    id="maxDiscount"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="Leave empty for uncapped"
                    value={formData.maximumDiscount}
                    onChange={(e) => handleInputChange("maximumDiscount", e.target.value)}
                    className={formErrors.maximumDiscount ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.maximumDiscount && (
                    <span className="field-error-text">{formErrors.maximumDiscount}</span>
                  )}
                </div>

                {/* Expiry Date */}
                <div className="form-group">
                  <label htmlFor="expiryDate">
                    Expiry Date <span className="req">*</span>
                  </label>
                  <input
                    id="expiryDate"
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => handleInputChange("expiryDate", e.target.value)}
                    className={formErrors.expiryDate ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.expiryDate && (
                    <span className="field-error-text">{formErrors.expiryDate}</span>
                  )}
                </div>

                {/* Usage Limit */}
                <div className="form-group">
                  <label htmlFor="usageLimit">
                    Usage Limit <span className="optional-tag">(0 = Unlimited)</span>
                  </label>
                  <input
                    id="usageLimit"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.usageLimit}
                    onChange={(e) => handleInputChange("usageLimit", e.target.value)}
                    className={formErrors.usageLimit ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.usageLimit && (
                    <span className="field-error-text">{formErrors.usageLimit}</span>
                  )}
                </div>

                {/* Per-User Limit */}
                <div className="form-group">
                  <label htmlFor="perUserLimit">
                    Per-User Limit <span className="req">*</span>
                  </label>
                  <input
                    id="perUserLimit"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formData.perUserLimit}
                    onChange={(e) => handleInputChange("perUserLimit", e.target.value)}
                    className={formErrors.perUserLimit ? "has-error" : ""}
                    disabled={submitting}
                  />
                  {formErrors.perUserLimit && (
                    <span className="field-error-text">{formErrors.perUserLimit}</span>
                  )}
                  <small className="field-hint">
                    Max times a single user can redeem (Default: 1).
                  </small>
                </div>

                {/* Distribution Type */}
                <div className="form-group col-span-2">
                  <label className="field-group-title">
                    Distribution Type <span className="req">*</span>
                  </label>
                  <div className="distribution-type-options">
                    {[
                      { id: "global", label: "Global", desc: "All Users (Active in Step 2)" },
                      { id: "new_user", label: "New User", desc: "First-time buyers (Active in Step 3)" },
                      { id: "inactive_user", label: "Inactive User", desc: "Returning customers (Active in Step 4)" },
                      { id: "selected_users", label: "Selected Users", desc: "Targeted accounts (Active in Step 5)" },
                      { id: "user_group", label: "User Group", desc: "VIP / Segments" },
                      { id: "category_based", label: "Category Based", desc: "Specific category" },
                      { id: "product_based", label: "Product Based", desc: "Specific products" },
                    ].map((type) => (
                      <label
                        key={type.id}
                        className={`distribution-radio-card ${
                          formData.distributionType === type.id ? "selected" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="distributionType"
                          value={type.id}
                          checked={formData.distributionType === type.id}
                          onChange={(e) => handleInputChange("distributionType", e.target.value)}
                          disabled={submitting}
                        />
                        <div className="radio-content">
                          <span className="radio-title">{type.label}</span>
                          <small className="radio-desc">{type.desc}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                  <small className="field-hint">
                    {formData.distributionType === "global"
                      ? "Global distribution is active. Any eligible customer can redeem this coupon."
                      : formData.distributionType === "new_user"
                      ? "New User distribution is active. Only customers with accounts created within the specified days can redeem this coupon."
                      : formData.distributionType === "inactive_user"
                      ? "Inactive User distribution is active. Only customers who have been inactive for at least the specified days can redeem this coupon."
                      : formData.distributionType === "selected_users"
                      ? "Selected Users distribution is active. Only specifically assigned customers can view and redeem this coupon."
                      : formData.distributionType === "user_group"
                      ? "User Group distribution is active. Only customers matching the selected group/segment rules can redeem this coupon."
                      : "This distribution rule will be activated in upcoming steps."}
                  </small>
                </div>

                {/* New User Eligibility Days */}
                {formData.distributionType === "new_user" && (
                  <div className="form-group col-span-2">
                    <label htmlFor="newUserDays">
                      New User Eligibility Days <span className="req">*</span>
                    </label>
                    <input
                      id="newUserDays"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 7"
                      value={formData.newUserDays}
                      onChange={(e) => handleInputChange("newUserDays", e.target.value)}
                      className={formErrors.newUserDays ? "has-error" : ""}
                      disabled={submitting}
                    />
                    {formErrors.newUserDays && (
                      <span className="field-error-text">{formErrors.newUserDays}</span>
                    )}
                    <small className="field-hint">
                      A customer can use the coupon if their account age is &le; this number of days (e.g. 7).
                    </small>
                  </div>
                )}

                {/* Inactive User Days */}
                {formData.distributionType === "inactive_user" && (
                  <div className="form-group col-span-2">
                    <label htmlFor="inactiveDays">
                      Inactive User Days <span className="req">*</span>
                    </label>
                    <input
                      id="inactiveDays"
                      type="number"
                      min="1"
                      step="1"
                      placeholder="e.g. 30"
                      value={formData.inactiveDays}
                      onChange={(e) => handleInputChange("inactiveDays", e.target.value)}
                      className={formErrors.inactiveDays ? "has-error" : ""}
                      disabled={submitting}
                    />
                    {formErrors.inactiveDays && (
                      <span className="field-error-text">{formErrors.inactiveDays}</span>
                    )}
                    <small className="field-hint">
                      Customer is eligible when they have not logged in for at least this number of days (e.g. 30).
                    </small>
                  </div>
                )}

                {/* User Group / Customer Segment (Step 6) */}
                {formData.distributionType === "user_group" && (
                  <div
                    className="form-group col-span-2"
                    style={{
                      background: "#f8fafc",
                      padding: "16px",
                      borderRadius: "12px",
                      border: "1px solid #e2e8f0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "14px",
                    }}
                  >
                    <div>
                      <label htmlFor="modalUserGroup" className="field-group-title">
                        Customer Group / Segment <span className="req">*</span>
                      </label>
                      <select
                        id="modalUserGroup"
                        value={formData.userGroup || "all_users"}
                        onChange={(e) => handleInputChange("userGroup", e.target.value)}
                        disabled={submitting}
                        style={{
                          width: "100%",
                          height: "42px",
                          borderRadius: "10px",
                          border: "1px solid #cbd5e1",
                          padding: "0 14px",
                          background: "#fff",
                          fontSize: "13.5px",
                        }}
                      >
                        <option value="all_users">All Users</option>
                        <option value="new_users">New Users</option>
                        <option value="returning_users">Returning Users</option>
                        <option value="inactive_customers">Inactive Customers</option>
                        <option value="frequent_buyers">Frequent Buyers</option>
                        <option value="high_value_customers">High Value Customers</option>
                        <option value="custom">Custom</option>
                      </select>
                      <small className="field-hint" style={{ marginTop: "4px", display: "block" }}>
                        {formData.userGroup === "all_users" && "All authenticated customers are eligible."}
                        {formData.userGroup === "new_users" && "Customers with new accounts created within the specified days."}
                        {formData.userGroup === "returning_users" && "Customers returning after a period of inactivity."}
                        {formData.userGroup === "inactive_customers" && "Customers inactive for at least the specified days."}
                        {formData.userGroup === "frequent_buyers" && "Customers who have placed at least a minimum number of completed orders."}
                        {formData.userGroup === "high_value_customers" && "Customers whose qualifying completed orders total at least the minimum spend."}
                        {formData.userGroup === "custom" && "Specifically assigned customers in this custom segment."}
                      </small>
                    </div>

                    {/* Frequent Buyers: Minimum Orders */}
                    {formData.userGroup === "frequent_buyers" && (
                      <div>
                        <label htmlFor="modalMinimumOrders">
                          Minimum Orders <span className="req">*</span>
                        </label>
                        <input
                          id="modalMinimumOrders"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 5"
                          value={formData.minimumOrders}
                          onChange={(e) => handleInputChange("minimumOrders", e.target.value)}
                          className={formErrors.minimumOrders ? "has-error" : ""}
                          disabled={submitting}
                          style={{
                            width: "100%",
                            height: "42px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            padding: "0 14px",
                            background: "#fff",
                            fontSize: "13.5px",
                          }}
                        />
                        {formErrors.minimumOrders && (
                          <span className="field-error-text">{formErrors.minimumOrders}</span>
                        )}
                        <small className="field-hint">
                          Customer is eligible when successful/completed orders &ge; minimumOrders (e.g. 5).
                        </small>
                      </div>
                    )}

                    {/* High Value Customers: Minimum Spend */}
                    {formData.userGroup === "high_value_customers" && (
                      <div>
                        <label htmlFor="modalMinimumSpend">
                          Minimum Spend (₹) <span className="req">*</span>
                        </label>
                        <input
                          id="modalMinimumSpend"
                          type="number"
                          min="1"
                          step="any"
                          placeholder="e.g. 10000"
                          value={formData.minimumSpend}
                          onChange={(e) => handleInputChange("minimumSpend", e.target.value)}
                          className={formErrors.minimumSpend ? "has-error" : ""}
                          disabled={submitting}
                          style={{
                            width: "100%",
                            height: "42px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            padding: "0 14px",
                            background: "#fff",
                            fontSize: "13.5px",
                          }}
                        />
                        {formErrors.minimumSpend && (
                          <span className="field-error-text">{formErrors.minimumSpend}</span>
                        )}
                        <small className="field-hint">
                          Customer is eligible when qualifying completed orders total &ge; minimumSpend (e.g. ₹10,000).
                        </small>
                      </div>
                    )}

                    {/* New Users: New User Days */}
                    {formData.userGroup === "new_users" && (
                      <div>
                        <label htmlFor="modalUserGroupNewUserDays">
                          New User Eligibility Days <span className="req">*</span>
                        </label>
                        <input
                          id="modalUserGroupNewUserDays"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 7"
                          value={formData.newUserDays}
                          onChange={(e) => handleInputChange("newUserDays", e.target.value)}
                          className={formErrors.newUserDays ? "has-error" : ""}
                          disabled={submitting}
                          style={{
                            width: "100%",
                            height: "42px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            padding: "0 14px",
                            background: "#fff",
                            fontSize: "13.5px",
                          }}
                        />
                        {formErrors.newUserDays && (
                          <span className="field-error-text">{formErrors.newUserDays}</span>
                        )}
                        <small className="field-hint">
                          A customer can use the coupon if their account age is &le; this number of days (e.g. 7).
                        </small>
                      </div>
                    )}

                    {/* Returning Users / Inactive Customers: Inactive Days */}
                    {(formData.userGroup === "returning_users" || formData.userGroup === "inactive_customers") && (
                      <div>
                        <label htmlFor="modalUserGroupInactiveDays">
                          Inactive User Days <span className="req">*</span>
                        </label>
                        <input
                          id="modalUserGroupInactiveDays"
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 30"
                          value={formData.inactiveDays}
                          onChange={(e) => handleInputChange("inactiveDays", e.target.value)}
                          className={formErrors.inactiveDays ? "has-error" : ""}
                          disabled={submitting}
                          style={{
                            width: "100%",
                            height: "42px",
                            borderRadius: "10px",
                            border: "1px solid #cbd5e1",
                            padding: "0 14px",
                            background: "#fff",
                            fontSize: "13.5px",
                          }}
                        />
                        {formErrors.inactiveDays && (
                          <span className="field-error-text">{formErrors.inactiveDays}</span>
                        )}
                        <small className="field-hint">
                          Customer is eligible when they have not logged in for at least this number of days (e.g. 30).
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Users / Custom Segment Customer Selection Interface */}
                {(formData.distributionType === "selected_users" ||
                  (formData.distributionType === "user_group" && formData.userGroup === "custom")) && (
                  <div className="form-group col-span-2 selected-users-section">
                    <div className="selected-users-header">
                      <label className="field-group-title">
                        Select Customers <span className="req">*</span>
                      </label>
                      <span className="selected-count-badge">
                        Selected Customers: <strong>{formData.assignedUsers?.length || 0}</strong>
                      </span>
                    </div>

                    {/* Selected Customers Chips */}
                    {formData.assignedUsers?.length > 0 && (
                      <div className="selected-users-chips-wrap">
                        <div className="selected-users-chips-list">
                          {formData.assignedUsers.map((userId) => {
                            const userObj = availableUsers.find((u) => u._id === userId);
                            const displayName = userObj?.name || "Customer";
                            const displayEmail = userObj?.email || userObj?.phone || userId.slice(-6);
                            return (
                              <span key={userId} className="selected-user-chip">
                                <span className="chip-check">✓</span>
                                <span className="chip-text">
                                  <strong>{displayName}</strong>
                                  <span className="chip-email"> - {displayEmail}</span>
                                </span>
                                <button
                                  type="button"
                                  className="chip-remove-btn"
                                  title="Remove customer"
                                  onClick={() => handleRemoveUser(userId)}
                                  disabled={submitting}
                                >
                                  <MdClose />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                        <button
                          type="button"
                          className="clear-all-users-btn"
                          onClick={handleClearAllUsers}
                          disabled={submitting}
                        >
                          Clear All
                        </button>
                      </div>
                    )}

                    {/* Customer Search & Quick Actions */}
                    <div className="user-picker-search-bar">
                      <div className="user-search-input-wrap">
                        <MdSearch className="user-search-icon" />
                        <input
                          type="text"
                          placeholder="Search customers by name, email, or phone..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          disabled={submitting}
                        />
                        {userSearch && (
                          <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => setUserSearch("")}
                          >
                            <MdClose />
                          </button>
                        )}
                      </div>
                      <div className="user-picker-actions">
                        <button
                          type="button"
                          className="picker-action-btn"
                          onClick={() => handleSelectAllFiltered(filteredUsers)}
                          disabled={submitting || filteredUsers.length === 0}
                        >
                          Select All Filtered ({filteredUsers.length})
                        </button>
                      </div>
                    </div>

                    {/* Scrollable Customer List */}
                    <div className="user-picker-list-card">
                      {loadingUsers ? (
                        <div className="user-picker-loading">
                          <div className="table-loading-spinner" />
                          <span>Loading customers list...</span>
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <div className="user-picker-empty">
                          <p>
                            {userSearch
                              ? `No customers found matching "${userSearch}"`
                              : "No customers found in database."}
                          </p>
                        </div>
                      ) : (
                        <div className="user-picker-scroll-list">
                          {filteredUsers.map((user) => {
                            const isSelected = formData.assignedUsers?.includes(user._id);
                            return (
                              <label
                                key={user._id}
                                className={`user-picker-item ${isSelected ? "selected" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleUser(user._id)}
                                  disabled={submitting}
                                />
                                <div className="user-picker-avatar">
                                  {(user.name?.[0] || user.email?.[0] || "U").toUpperCase()}
                                </div>
                                <div className="user-picker-info">
                                  <span className="user-picker-name">
                                    {user.name || "Unnamed Customer"}
                                  </span>
                                  <span className="user-picker-email">
                                    {user.email || "No email"}
                                  </span>
                                  {user.phone && (
                                    <span className="user-picker-phone">• {user.phone}</span>
                                  )}
                                </div>
                                {isSelected && (
                                  <span className="user-selected-indicator">Selected</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {formErrors.assignedUsers && (
                      <span className="field-error-text">{formErrors.assignedUsers}</span>
                    )}
                    <small className="field-hint">
                      Only the selected customers will be eligible to view and apply this coupon.
                    </small>
                  </div>
                )}

                {/* Active Checkbox */}
                <div className="form-group col-span-2 checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleInputChange("isActive", e.target.checked)}
                      disabled={submitting}
                    />
                    <span>Active (Customers can use this coupon when active and unexpired)</span>
                  </label>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="modal-cancel-btn"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-save-btn"
                  disabled={submitting}
                >
                  {submitting
                    ? modalMode === "create"
                      ? "Creating..."
                      : "Saving..."
                    : modalMode === "create"
                    ? "Create Coupon"
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          DELETE CONFIRMATION MODAL
          ========================================================= */}
      {deleteModal.open && (
        <div
          className="admin-modal-overlay"
          onClick={deleteModal.deleting ? undefined : () => setDeleteModal({ open: false, coupon: null, deleting: false })}
        >
          <div
            className="admin-modal-content delete-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="delete-modal-icon">
              <MdWarning />
            </div>
            <h3>Delete Coupon?</h3>
            <p>
              Are you sure you want to permanently delete coupon{" "}
              <strong>"{deleteModal.coupon?.code}"</strong>? This action cannot be
              undone.
            </p>
            <div className="delete-modal-actions">
              <button
                type="button"
                className="modal-cancel-btn"
                onClick={() => setDeleteModal({ open: false, coupon: null, deleting: false })}
                disabled={deleteModal.deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-danger-btn"
                onClick={handleConfirmDelete}
                disabled={deleteModal.deleting}
              >
                {deleteModal.deleting ? "Deleting..." : "Yes, Delete Coupon"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
