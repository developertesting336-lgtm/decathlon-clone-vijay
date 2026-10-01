import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBack,
  MdClose,
  MdSearch,
  MdSave,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/Coupons.css";

const EditCoupon = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
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
    newUserDays: "7",
    inactiveDays: "30",
    assignedUsers: [],
    categories: [],
    products: [],
    priority: "0",
    userGroup: "all_users",
    minimumOrders: "5",
    minimumSpend: "10000",
  });

  const [formErrors, setFormErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer selection states for selected_users
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Category selection states
  const [availableCategories, setAvailableCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");

  // Product selection states
  const [availableProducts, setAvailableProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");

  // Fetch available customers
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const res = await api.get("/auth/admin/users");
        if (res.data?.users && Array.isArray(res.data.users)) {
          setAvailableUsers(res.data.users);
        }
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch categories and products
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoadingCategories(true);
        const res = await api.get("/categories");
        const list = res.data?.categories || res.data || [];
        if (Array.isArray(list)) {
          setAvailableCategories(list);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        setLoadingCategories(false);
      }
    };

    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const res = await api.get("/products?admin=true&limit=1000");
        const list = res.data?.products || res.data?.data || res.data || [];
        if (Array.isArray(list)) {
          setAvailableProducts(list);
        }
      } catch (err) {
        console.error("Failed to load products:", err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchCategories();
    fetchProducts();
  }, []);

  // Fetch coupon by ID
  useEffect(() => {
    const fetchCoupon = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/coupons/${id}`);
        if (res.data?.coupon) {
          const coupon = res.data.coupon;
          let formattedDate = "";
          if (coupon.expiryDate) {
            formattedDate = new Date(coupon.expiryDate).toISOString().split("T")[0];
          }

          const assigned = Array.isArray(coupon.assignedUsers)
            ? coupon.assignedUsers.map((u) =>
                typeof u === "object" && u?._id ? u._id.toString() : u.toString()
              )
            : [];

          const catList = Array.isArray(coupon.categories)
            ? coupon.categories.map((c) =>
                typeof c === "object" && c?._id ? c._id.toString() : c.toString()
              )
            : [];

          const prodList = Array.isArray(coupon.products)
            ? coupon.products.map((p) =>
                typeof p === "object" && p?._id ? p._id.toString() : p.toString()
              )
            : [];

          const rawGroup =
            coupon.eligibilityRules?.userGroup ||
            coupon.eligibilityRules?.group ||
            "all_users";
          const minOrders =
            coupon.eligibilityRules?.minimumOrders !== undefined &&
            coupon.eligibilityRules?.minimumOrders !== null
              ? String(coupon.eligibilityRules.minimumOrders)
              : "5";
          const minSpend =
            coupon.eligibilityRules?.minimumSpend !== undefined &&
            coupon.eligibilityRules?.minimumSpend !== null
              ? String(coupon.eligibilityRules.minimumSpend)
              : "10000";

          setFormData({
            code: coupon.code || "",
            discountType: coupon.discountType || "percentage",
            discountValue: String(coupon.discountValue ?? ""),
            minimumOrderValue: String(coupon.minimumOrderValue ?? "0"),
            maximumDiscount:
              coupon.maximumDiscount !== null && coupon.maximumDiscount !== undefined
                ? String(coupon.maximumDiscount)
                : "",
            expiryDate: formattedDate,
            usageLimit: String(coupon.usageLimit ?? "0"),
            isActive: coupon.isActive !== false,
            distributionType: coupon.distributionType || "global",
            perUserLimit: String(coupon.perUserLimit ?? "1"),
            priority: String(coupon.priority ?? "0"),
            newUserDays: String(coupon.newUserDays ?? "7"),
            inactiveDays: String(coupon.inactiveDays ?? "30"),
            assignedUsers: assigned,
            categories: catList,
            products: prodList,
            userGroup: rawGroup,
            minimumOrders: minOrders,
            minimumSpend: minSpend,
          });
        } else {
          toast.error("Coupon not found");
          navigate("/coupons");
        }
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to load coupon");
        navigate("/coupons");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchCoupon();
    }
  }, [id, navigate]);

  // Form input change handler
  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: field === "code" ? value.toUpperCase().trimStart() : value,
    }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  // Customer selection helpers
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

  // Filtered customer list
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

  // Category selection helpers
  const handleToggleCategory = (catId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.categories) ? [...prev.categories] : [];
      const index = current.indexOf(catId);
      let updated;
      if (index > -1) {
        updated = current.filter((id) => id !== catId);
      } else {
        updated = [...current, catId];
      }
      return { ...prev, categories: updated };
    });
    if (formErrors.categories) {
      setFormErrors((prev) => ({ ...prev, categories: "" }));
    }
  };

  const handleRemoveCategory = (catId) => {
    setFormData((prev) => ({
      ...prev,
      categories: (prev.categories || []).filter((id) => id !== catId),
    }));
  };

  const handleClearAllCategories = () => {
    setFormData((prev) => ({ ...prev, categories: [] }));
  };

  const handleSelectAllFilteredCategories = (filteredList) => {
    setFormData((prev) => {
      const set = new Set(prev.categories || []);
      filteredList.forEach((c) => set.add(c._id));
      return { ...prev, categories: Array.from(set) };
    });
    if (formErrors.categories) {
      setFormErrors((prev) => ({ ...prev, categories: "" }));
    }
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return availableCategories;
    const q = categorySearch.trim().toLowerCase();
    return availableCategories.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const sub = (c.subcategory || "").toLowerCase();
      return name.includes(q) || sub.includes(q);
    });
  }, [availableCategories, categorySearch]);

  // Product selection helpers
  const handleToggleProduct = (prodId) => {
    setFormData((prev) => {
      const current = Array.isArray(prev.products) ? [...prev.products] : [];
      const index = current.indexOf(prodId);
      let updated;
      if (index > -1) {
        updated = current.filter((id) => id !== prodId);
      } else {
        updated = [...current, prodId];
      }
      return { ...prev, products: updated };
    });
    if (formErrors.products) {
      setFormErrors((prev) => ({ ...prev, products: "" }));
    }
  };

  const handleRemoveProduct = (prodId) => {
    setFormData((prev) => ({
      ...prev,
      products: (prev.products || []).filter((id) => id !== prodId),
    }));
  };

  const handleClearAllProducts = () => {
    setFormData((prev) => ({ ...prev, products: [] }));
  };

  const handleSelectAllFilteredProducts = (filteredList) => {
    setFormData((prev) => {
      const set = new Set(prev.products || []);
      filteredList.forEach((p) => set.add(p._id));
      return { ...prev, products: Array.from(set) };
    });
    if (formErrors.products) {
      setFormErrors((prev) => ({ ...prev, products: "" }));
    }
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.trim().toLowerCase();
    return availableProducts.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const brand = (p.brand || "").toLowerCase();
      return name.includes(q) || brand.includes(q);
    });
  }, [availableProducts, productSearch]);

  // Form validation
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

    if (formData.priority !== "") {
      const prio = Number(formData.priority);
      if (isNaN(prio) || prio < 0) {
        errors.priority = "Priority cannot be negative";
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

    if (formData.distributionType === "category_based") {
      if (!Array.isArray(formData.categories) || formData.categories.length === 0) {
        errors.categories = "Please select at least one category for category_based distribution";
      }
    }

    if (formData.distributionType === "product_based") {
      if (!Array.isArray(formData.products) || formData.products.length === 0) {
        errors.products = "Please select at least one product for product_based distribution";
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

  // Submit update
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!validateForm()) {
      toast.error("Please fill all required fields correctly");
      return;
    }

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
        priority: Math.max(0, parseInt(formData.priority, 10) || 0),
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
        categories:
          formData.distributionType === "category_based" ? formData.categories : [],
        products:
          formData.distributionType === "product_based" ? formData.products : [],
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

      const res = await api.put(`/coupons/${id}`, payload);

      if (res.data?.success) {
        toast.success(`Coupon '${payload.code}' updated successfully`);
        navigate("/coupons");
      }
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update coupon";
      toast.error(msg);
      if (msg.toLowerCase().includes("code already exists")) {
        setFormErrors((prev) => ({ ...prev, code: "Coupon code already exists" }));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="coupons-page" style={{ padding: "80px 20px", textAlign: "center" }}>
        <div className="table-loading-spinner" style={{ margin: "0 auto 16px" }} />
        <p style={{ color: "#64748b", fontSize: "15px" }}>Loading coupon details...</p>
      </div>
    );
  }

  return (
    <div className="coupons-page">
      {/* HEADER */}
      <div className="coupons-header" style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            type="button"
            className="refresh-coupon-btn"
            onClick={() => navigate("/coupons")}
            title="Back to coupons"
          >
            <MdArrowBack />
            <span>Back</span>
          </button>
          <div>
            <h1>Edit Coupon: {formData.code}</h1>
            <p>Update coupon configuration, limits, and customer eligibility</p>
          </div>
        </div>
      </div>

      {/* FORM CARD */}
      <div
        className="coupons-table-card"
        style={{ padding: "30px", maxWidth: "960px", margin: "0 auto" }}
      >
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Coupon Code */}
            <div className="form-group col-span-2">
              <label htmlFor="code">
                Coupon Code <span className="req">*</span>
              </label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => handleInputChange("code", e.target.value)}
                className={formErrors.code ? "has-error" : ""}
                disabled={submitting}
                style={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: "1px" }}
              />
              {formErrors.code && (
                <span className="field-error-text">{formErrors.code}</span>
              )}
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
                Global Usage Limit <span className="optional-tag">(0 = Unlimited)</span>
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
                Max times a single user can redeem this coupon (Default: 1).
              </small>
            </div>

            {/* Priority */}
            <div className="form-group">
              <label htmlFor="priority">
                Priority
              </label>
              <input
                id="priority"
                type="number"
                min="0"
                placeholder="0"
                value={formData.priority}
                onChange={(e) => handleInputChange("priority", e.target.value)}
                className={formErrors.priority ? "has-error" : ""}
                disabled={submitting}
              />
              {formErrors.priority && (
                <span className="field-error-text">{formErrors.priority}</span>
              )}
              <small className="field-hint">
                Higher priority coupons are prioritized and sorted first (Default: 0).
              </small>
            </div>

            {/* Distribution Type */}
            <div className="form-group col-span-2">
              <label className="field-group-title">
                Distribution Type <span className="req">*</span>
              </label>
              <div className="distribution-type-options">
                {[
                  { id: "global", label: "Global", desc: "All Users" },
                  { id: "new_user", label: "New User", desc: "First-time buyers" },
                  { id: "inactive_user", label: "Inactive User", desc: "Returning customers" },
                  { id: "selected_users", label: "Selected Users", desc: "Targeted accounts" },
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
                  : formData.distributionType === "category_based"
                  ? "Category Based distribution is active. Customer cart must contain products from the selected categories."
                  : formData.distributionType === "product_based"
                  ? "Product Based distribution is active. Customer cart must contain at least one of the selected products."
                  : "Select a distribution type."}
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
                  <label htmlFor="userGroup" className="field-group-title">
                    Customer Group / Segment <span className="req">*</span>
                  </label>
                  <select
                    id="userGroup"
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
                    <label htmlFor="minimumOrders">
                      Minimum Orders <span className="req">*</span>
                    </label>
                    <input
                      id="minimumOrders"
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
                    <label htmlFor="minimumSpend">
                      Minimum Spend (₹) <span className="req">*</span>
                    </label>
                    <input
                      id="minimumSpend"
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
                    <label htmlFor="userGroupNewUserDays">
                      New User Eligibility Days <span className="req">*</span>
                    </label>
                    <input
                      id="userGroupNewUserDays"
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
                    <label htmlFor="userGroupInactiveDays">
                      Inactive User Days <span className="req">*</span>
                    </label>
                    <input
                      id="userGroupInactiveDays"
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

            {/* Category Picker (distributionType === "category_based") */}
            {formData.distributionType === "category_based" && (
              <div className="form-group col-span-2 user-picker-container">
                <div className="user-picker-header">
                  <div>
                    <label className="field-group-title">
                      Select Categories <span className="req">*</span>
                    </label>
                    <span className="user-picker-subtitle">
                      Choose which product categories are eligible for this coupon
                    </span>
                  </div>
                  <span className="selected-user-count-badge">
                    {formData.categories?.length || 0} Categories Selected
                  </span>
                </div>

                {/* Selected Category Chips */}
                {formData.categories?.length > 0 && (
                  <div className="user-picker-selected-summary">
                    <div className="user-chips-wrap">
                      {formData.categories.map((catId) => {
                        const cat = availableCategories.find((c) => c._id === catId);
                        return (
                          <div key={catId} className="user-chip">
                            <span className="user-chip-name">
                              {cat?.name || "Category"}
                              {cat?.subcategory ? ` (${cat.subcategory})` : ""}
                            </span>
                            <button
                              type="button"
                              className="chip-remove-btn"
                              onClick={() => handleRemoveCategory(catId)}
                              title="Remove category"
                              disabled={submitting}
                            >
                              <MdClose />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="clear-all-users-btn"
                      onClick={handleClearAllCategories}
                      disabled={submitting}
                    >
                      Clear All Categories
                    </button>
                  </div>
                )}

                {/* Search Bar & Actions */}
                <div className="user-picker-search-bar">
                  <div className="user-search-input-wrap">
                    <MdSearch className="user-search-icon" />
                    <input
                      type="text"
                      placeholder="Search categories by name or subcategory..."
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      disabled={submitting}
                    />
                    {categorySearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setCategorySearch("")}
                      >
                        <MdClose />
                      </button>
                    )}
                  </div>
                  <div className="user-picker-actions">
                    <button
                      type="button"
                      className="picker-action-btn"
                      onClick={() => handleSelectAllFilteredCategories(filteredCategories)}
                      disabled={submitting || filteredCategories.length === 0}
                    >
                      Select All Filtered ({filteredCategories.length})
                    </button>
                  </div>
                </div>

                {/* Scrollable Category List */}
                <div className="user-picker-list-card">
                  {loadingCategories ? (
                    <div className="user-picker-loading">
                      <div className="table-loading-spinner" />
                      <span>Loading categories list...</span>
                    </div>
                  ) : filteredCategories.length === 0 ? (
                    <div className="user-picker-empty">
                      <p>
                        {categorySearch
                          ? `No categories found matching "${categorySearch}"`
                          : "No categories found in database."}
                      </p>
                    </div>
                  ) : (
                    <div className="user-picker-scroll-list">
                      {filteredCategories.map((cat) => {
                        const isSelected = formData.categories?.includes(cat._id);
                        return (
                          <label
                            key={cat._id}
                            className={`user-picker-item ${isSelected ? "selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCategory(cat._id)}
                              disabled={submitting}
                            />
                            <div className="user-picker-avatar" style={{ background: "#f0fdf4", color: "#16a34a" }}>
                              {(cat.name?.[0] || "C").toUpperCase()}
                            </div>
                            <div className="user-picker-info">
                              <span className="user-picker-name">
                                {cat.name}
                              </span>
                              {cat.subcategory && (
                                <span className="user-picker-email">
                                  Subcategory: {cat.subcategory}
                                </span>
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

                {formErrors.categories && (
                  <span className="field-error-text">{formErrors.categories}</span>
                )}
                <small className="field-hint">
                  Customer cart must contain products belonging to at least one of these selected categories.
                </small>
              </div>
            )}

            {/* Product Picker (distributionType === "product_based") */}
            {formData.distributionType === "product_based" && (
              <div className="form-group col-span-2 user-picker-container">
                <div className="user-picker-header">
                  <div>
                    <label className="field-group-title">
                      Select Products <span className="req">*</span>
                    </label>
                    <span className="user-picker-subtitle">
                      Choose which products are eligible for this coupon
                    </span>
                  </div>
                  <span className="selected-user-count-badge">
                    {formData.products?.length || 0} Products Selected
                  </span>
                </div>

                {/* Selected Product Chips */}
                {formData.products?.length > 0 && (
                  <div className="user-picker-selected-summary">
                    <div className="user-chips-wrap">
                      {formData.products.map((prodId) => {
                        const prod = availableProducts.find((p) => p._id === prodId);
                        return (
                          <div key={prodId} className="user-chip">
                            <span className="user-chip-name">
                              {prod?.name || "Product"}
                              {prod?.price ? ` (₹${prod.price})` : ""}
                            </span>
                            <button
                              type="button"
                              className="chip-remove-btn"
                              onClick={() => handleRemoveProduct(prodId)}
                              title="Remove product"
                              disabled={submitting}
                            >
                              <MdClose />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="clear-all-users-btn"
                      onClick={handleClearAllProducts}
                      disabled={submitting}
                    >
                      Clear All Products
                    </button>
                  </div>
                )}

                {/* Search Bar & Actions */}
                <div className="user-picker-search-bar">
                  <div className="user-search-input-wrap">
                    <MdSearch className="user-search-icon" />
                    <input
                      type="text"
                      placeholder="Search products by name or brand..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      disabled={submitting}
                    />
                    {productSearch && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setProductSearch("")}
                      >
                        <MdClose />
                      </button>
                    )}
                  </div>
                  <div className="user-picker-actions">
                    <button
                      type="button"
                      className="picker-action-btn"
                      onClick={() => handleSelectAllFilteredProducts(filteredProducts)}
                      disabled={submitting || filteredProducts.length === 0}
                    >
                      Select All Filtered ({filteredProducts.length})
                    </button>
                  </div>
                </div>

                {/* Scrollable Product List */}
                <div className="user-picker-list-card">
                  {loadingProducts ? (
                    <div className="user-picker-loading">
                      <div className="table-loading-spinner" />
                      <span>Loading products list...</span>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="user-picker-empty">
                      <p>
                        {productSearch
                          ? `No products found matching "${productSearch}"`
                          : "No products found in database."}
                      </p>
                    </div>
                  ) : (
                    <div className="user-picker-scroll-list">
                      {filteredProducts.map((prod) => {
                        const isSelected = formData.products?.includes(prod._id);
                        return (
                          <label
                            key={prod._id}
                            className={`user-picker-item ${isSelected ? "selected" : ""}`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleProduct(prod._id)}
                              disabled={submitting}
                            />
                            {prod.images?.[0]?.url || prod.images?.[0] ? (
                              <img
                                src={typeof prod.images[0] === "string" ? prod.images[0] : prod.images[0]?.url}
                                alt={prod.name}
                                style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "6px" }}
                              />
                            ) : (
                              <div className="user-picker-avatar" style={{ background: "#eff6ff", color: "#2563eb" }}>
                                {(prod.name?.[0] || "P").toUpperCase()}
                              </div>
                            )}
                            <div className="user-picker-info">
                              <span className="user-picker-name">
                                {prod.name}
                              </span>
                              <span className="user-picker-email">
                                {prod.brand ? `${prod.brand} • ` : ""}₹{prod.price || 0}
                              </span>
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

                {formErrors.products && (
                  <span className="field-error-text">{formErrors.products}</span>
                )}
                <small className="field-hint">
                  Customer cart must contain at least one of these selected products.
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

          {/* ACTIONS */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "30px",
              paddingTop: "20px",
              borderTop: "1px solid #e2e8f0",
            }}
          >
            <button
              type="button"
              className="refresh-coupon-btn"
              onClick={() => navigate("/coupons")}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="add-coupon-btn"
              disabled={submitting}
            >
              <MdSave />
              <span>{submitting ? "Saving Changes..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCoupon;
