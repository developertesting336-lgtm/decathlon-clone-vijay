import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  MdArrowBack,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdCategory,
  MdInventory2,
  MdImage,
  MdDragIndicator,
  MdLink,
  MdUploadFile,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
} from "react-icons/md";

import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/PageBuilder.css";

const PageBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`cached_admin_page_${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(`cached_admin_page_${id}`);
    } catch {
      return true;
    }
  });

  const [draggedIndex, setDraggedIndex] = useState(null);

  /* ========================================
     RESOURCE DATA
  ======================================== */

  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableBanners, setAvailableBanners] = useState([]);

  /* ========================================
     SECTION MODAL
  ======================================== */

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const [sectionName, setSectionName] = useState("");
  const [sectionType, setSectionType] = useState("category");

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedBanners, setSelectedBanners] = useState([]);

  /* ========================================
     CATEGORY SECTION ITEMS (WITH CUSTOM IMAGE)
  ======================================== */
  const [categoryItems, setCategoryItems] = useState([]);
  const [showQuickCreateCategory, setShowQuickCreateCategory] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatImage, setQuickCatImage] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  /* ========================================
     OTHER SECTION ITEMS
  ======================================== */

  const [items, setItems] = useState([]);

  const [savingSection, setSavingSection] = useState(false);

  /* ========================================
     IMAGE URL
  ======================================== */

  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }

    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    if (image.startsWith("/uploads/")) {
      return `${backendUrl}${image}`;
    }

    if (image.startsWith("uploads/")) {
      return `${backendUrl}/${image}`;
    }

    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  /* ========================================
     FETCH PAGE
  ======================================== */

  const fetchPageDetails = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const token = localStorage.getItem("adminToken");

      const response = await api.get(`/pages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const pageData = response.data.page;
      setPage(pageData);
      try {
        sessionStorage.setItem(
          `cached_admin_page_${id}`,
          JSON.stringify(pageData)
        );
      } catch (e) {}
    } catch (error) {
      console.error("Fetch Page Details Error:", error);
      toast.error("Failed to load page builder details");
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     FETCH RESOURCES
  ======================================== */

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [catRes, prodRes, banRes] = await Promise.all([
        api.get("/categories", { headers }),
        api.get("/products?limit=100", { headers }),
        api.get("/banners", { headers }),
      ]);

      setAvailableCategories(catRes.data.categories || []);
      setAvailableProducts(prodRes.data.products || []);
      setAvailableBanners(banRes.data.banners || []);
    } catch (error) {
      console.error("Fetch Resources Error:", error);
    }
  };

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    fetchPageDetails();
    fetchResources();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ========================================
     OPEN ADD MODAL
  ======================================== */

  const handleOpenAddModal = () => {
    setEditingSection(null);

    setSectionName("");
    setSectionType("category");

    setCategoryItems([]);
    setSelectedProducts([]);
    setSelectedBanners([]);

    setItems([]);
    setShowQuickCreateCategory(false);
    setQuickCatName("");
    setQuickCatImage(null);

    setShowSectionModal(true);
  };

  /* ========================================
     OPEN EDIT MODAL
  ======================================== */

  const handleOpenEditModal = (sec) => {
    setEditingSection(sec);

    setSectionName(sec.name || "");
    setSectionType(sec.type || "category");

    if (sec.categoryItems && sec.categoryItems.length > 0) {
      setCategoryItems(
        sec.categoryItems.map((ci) => ({
          categoryId: typeof ci.category === "object" ? ci.category?._id : ci.category,
          customImage: ci.customImage || "",
        }))
      );
    } else {
      setCategoryItems(
        (sec.categories || []).map((c) => ({
          categoryId: typeof c === "object" ? c?._id : c,
          customImage: "",
        }))
      );
    }

    const prodIds = (sec.products || []).map((p) =>
      typeof p === "string" ? p : p._id
    );

    const banIds = (sec.banners || []).map((b) =>
      typeof b === "string" ? b : b._id
    );

    setSelectedProducts(prodIds);
    setSelectedBanners(banIds);

    /*
      IMPORTANT:
      Other Section uses "items"
    */

    setItems(Array.isArray(sec.items) ? sec.items : []);
    setShowQuickCreateCategory(false);
    setQuickCatName("");
    setQuickCatImage(null);

    setShowSectionModal(true);
  };

  /* ========================================
     CATEGORY SECTION ITEM HANDLERS
  ======================================== */

  const handleAddCategoryToSection = (catId) => {
    if (!catId) return;
    if (categoryItems.some((ci) => ci.categoryId === catId)) {
      toast.error("Category is already added to this section.");
      return;
    }
    setCategoryItems((prev) => [...prev, { categoryId: catId, customImage: "" }]);
  };

  const handleRemoveCategoryFromSection = (catId) => {
    setCategoryItems((prev) => prev.filter((ci) => ci.categoryId !== catId));
  };

  const handleMoveCategoryItem = (index, direction) => {
    setCategoryItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleCustomCategoryImageUpload = async (catId, file) => {
    if (!file) return;
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|ico|heic|heif|jfif)$/i.test(
        file.name
      );
    if (!isImage) {
      toast.error("Please select an image file");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("adminToken");
      const res = await api.post("/pages/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const uploadedUrl = res.data.url;
      setCategoryItems((prev) =>
        prev.map((ci) =>
          ci.categoryId === catId ? { ...ci, customImage: uploadedUrl } : ci
        )
      );
      toast.success("Section-specific custom image uploaded");
    } catch (err) {
      console.error("Custom Image Upload Error:", err);
      toast.error(err?.response?.data?.message || "Failed to upload image");
    }
  };

  const handleRemoveCustomCategoryImage = (catId) => {
    setCategoryItems((prev) =>
      prev.map((ci) =>
        ci.categoryId === catId ? { ...ci, customImage: "" } : ci
      )
    );
  };

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!quickCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const trimmed = quickCatName.trim();
    const exists = availableCategories.some(
      (c) => c.name?.toLowerCase().trim() === trimmed.toLowerCase()
    );
    if (exists) {
      toast.error("Category already exists. Use existing category.");
      return;
    }

    try {
      setCreatingCategory(true);
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("name", trimmed);
      if (quickCatImage) {
        formData.append("image", quickCatImage);
      }

      const res = await api.post("/categories", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const newCategory = res.data.category;
      toast.success("Global category created successfully");
      setAvailableCategories((prev) => [...prev, newCategory]);
      handleAddCategoryToSection(newCategory._id);
      setQuickCatName("");
      setQuickCatImage(null);
      setShowQuickCreateCategory(false);
    } catch (err) {
      console.error("Quick Create Category Error:", err);
      toast.error(err?.response?.data?.message || "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  /* ========================================
     ADD OTHER ITEM
  ======================================== */

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        image: "",
        link: "",
      },
    ]);
  };

  /* ========================================
     REMOVE OTHER ITEM
  ======================================== */

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* ========================================
     UPDATE OTHER ITEM
  ======================================== */

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  };

  /* ========================================
     IMAGE UPLOAD
  ======================================== */

  const handleItemImageChange = (index, file) => {
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|ico|heic|heif|jfif)$/i.test(
        file.name
      );
    if (!isImage) {
      toast.error("Please select an image file");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      handleItemChange(index, "image", reader.result);
    };

    reader.readAsDataURL(file);
  };

  /* ========================================
     SAVE SECTION
  ======================================== */

  const handleSaveSection = async (e) => {
    e.preventDefault();

    if (!sectionName.trim()) {
      toast.error("Please enter section name");
      return;
    }

    /*
      Validate Category Section
    */
    if (sectionType === "category") {
      if (categoryItems.length === 0) {
        toast.error("Please add at least one category to this section");
        return;
      }
      const ids = categoryItems.map((ci) => ci.categoryId);
      if (new Set(ids).size !== ids.length) {
        toast.error("Duplicate categories inside the same section are strictly prohibited.");
        return;
      }
    }

    /*
      Validate Other Section
    */

    if (sectionType === "other") {
      if (items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      const invalidItem = items.find(
        (item) => !item.name?.trim() || !item.image
      );

      if (invalidItem) {
        toast.error("Every item needs a name and image");
        return;
      }
    }

    try {
      setSavingSection(true);

      const token = localStorage.getItem("adminToken");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const payload = {
        name: sectionName.trim(),

        type: sectionType,

        categoryItems:
          sectionType === "category"
            ? categoryItems.map((ci, idx) => ({
                category: ci.categoryId,
                link: `/category/${ci.categoryId}`,
                customImage: ci.customImage || "",
                sortOrder: idx,
              }))
            : [],

        categories:
          sectionType === "category" ? categoryItems.map((ci) => ci.categoryId) : [],

        products:
          sectionType === "product" ? selectedProducts : [],

        banners:
          sectionType === "banner" ? selectedBanners : [],

        /*
          OTHER SECTION
        */

        items:
          sectionType === "other"
            ? items.map((item) => ({
                name: item.name.trim(),
                image: item.image,
                link: item.link?.trim() || "",
              }))
            : [],
      };

      if (editingSection) {
        await api.put(
          `/pages/${id}/sections/${editingSection._id}`,
          payload,
          { headers }
        );

        toast.success("Section updated successfully");
      } else {
        await api.post(`/pages/${id}/sections`, payload, {
          headers,
        });

        toast.success("Section added successfully");
      }

      setShowSectionModal(false);

      fetchPageDetails(false);
    } catch (error) {
      console.error("Save Section Error:", error);

      toast.error(
        error?.response?.data?.message || "Failed to save section"
      );
    } finally {
      setSavingSection(false);
    }
  };

  /* ========================================
     TOGGLE SECTION
  ======================================== */

  const handleToggleSectionActive = async (sec) => {
    // 1. Optimistic update
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s._id === sec._id ? { ...s, isActive: !s.isActive } : s
        ),
      };
    });

    try {
      const token = localStorage.getItem("adminToken");

      await api.put(
        `/pages/${id}/sections/${sec._id}`,
        {
          isActive: !sec.isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(
        `Section ${sec.isActive ? "disabled" : "enabled"}`
      );

      fetchPageDetails(false);
    } catch (error) {
      console.error("Toggle Section Error:", error);
      toast.error("Failed to update section");
      fetchPageDetails(false);
    }
  };

  /* ========================================
     DELETE SECTION
  ======================================== */

  const handleDeleteSection = async (sec) => {
    if (
      !window.confirm(
        `Are you sure you want to delete section '${sec.name}'?`
      )
    ) {
      return;
    }

    // 1. Optimistic delete
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: (prev.sections || []).filter((s) => s._id !== sec._id),
      };
    });

    try {
      const token = localStorage.getItem("adminToken");

      await api.delete(`/pages/${id}/sections/${sec._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Section deleted successfully");

      fetchPageDetails(false);
    } catch (error) {
      console.error("Delete Section Error:", error);

      toast.error("Failed to delete section");
      fetchPageDetails(false);
    }
  };

  /* ========================================
     REORDER
  ======================================== */

  const handleSaveReorder = async (updatedSections) => {
    try {
      const token = localStorage.getItem("adminToken");

      const sectionIds = updatedSections.map((s) => s._id);

      setPage((prev) => ({
        ...prev,
        sections: updatedSections,
      }));

      await api.put(
        `/pages/${id}/sections/reorder`,
        {
          sectionIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Section layout order updated");
      fetchPageDetails(false);
    } catch (error) {
      console.error("Reorder Error:", error);

      toast.error("Failed to update section order");

      fetchPageDetails(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);

    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();

    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();

    if (
      draggedIndex === null ||
      draggedIndex === targetIndex
    ) {
      return;
    }

    const sectionsCopy = [...page.sections];

    const [moved] = sectionsCopy.splice(draggedIndex, 1);

    sectionsCopy.splice(targetIndex, 0, moved);

    setDraggedIndex(null);

    handleSaveReorder(sectionsCopy);
  };

  /* ========================================
     PRODUCT SELECTION
  ======================================== */

  const toggleProductSelection = (prodId) => {
    setSelectedProducts((prev) =>
      prev.includes(prodId)
        ? prev.filter((i) => i !== prodId)
        : [...prev, prodId]
    );
  };

  /* ========================================
     BANNER SELECTION
  ======================================== */

  const toggleBannerSelection = (banId) => {
    setSelectedBanners((prev) =>
      prev.includes(banId)
        ? prev.filter((i) => i !== banId)
        : [...prev, banId]
    );
  };

  /* ========================================
     LOADING
  ======================================== */

  if (loading && !page) {
    return (
      <div className="page-builder-loading-skeleton">
        <div className="builder-header-skeleton"></div>
        <div className="builder-sections-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="builder-row-skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="page-builder-error">
        Page not found
      </div>
    );
  }

  /* ========================================
     UI
  ======================================== */

  return (
    <div className="page-builder">

      {/* HEADER */}

      <div className="builder-header">

        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/pages")}
        >
          <MdArrowBack />

          <span>Back to Pages</span>
        </button>

        <div className="builder-title">
          <h2>
            {page.name}

            <span className="builder-slug">
              /{page.slug}
            </span>
          </h2>

          <p>
            Configure sections, content, and order for this page
          </p>
        </div>

        <button
          type="button"
          className="add-section-btn"
          onClick={handleOpenAddModal}
        >
          <MdAdd />

          <span>+ Add Section</span>
        </button>

      </div>

      {/* SECTIONS */}

      <div className="builder-sections-container">

        {page.sections?.length === 0 ? (
          <div className="sections-empty-state">

            <div className="empty-icon">
              🧩
            </div>

            <h3>
              No sections added yet
            </h3>

            <p>
              Click "+ Add Section" to build this page layout
            </p>

            <button
              type="button"
              className="add-section-btn"
              onClick={handleOpenAddModal}
            >
              <MdAdd />

              <span>
                Add First Section
              </span>
            </button>

          </div>
        ) : (
          <div className="sections-list">

            {page.sections.map((sec, idx) => (

              <div
                key={sec._id}
                draggable
                onDragStart={(e) =>
                  handleDragStart(e, idx)
                }
                onDragOver={handleDragOver}
                onDrop={(e) =>
                  handleDrop(e, idx)
                }
                className={`section-row-card ${
                  sec.isActive ? "" : "disabled"
                } ${
                  draggedIndex === idx
                    ? "dragging"
                    : ""
                }`}
              >

                {/* DRAG */}

                <div
                  className="section-drag-handle"
                  title="Drag to reorder"
                >
                  <MdDragIndicator />

                  <span className="section-index">
                    {idx + 1}
                  </span>
                </div>

                {/* INFO */}

                <div className="section-row-info">

                  <div className="section-row-header">

                    <h4>
                      {sec.name}
                    </h4>

                    <span
                      className={`type-tag ${sec.type}`}
                    >

                      {sec.type === "category" && (
                        <MdCategory />
                      )}

                      {sec.type === "product" && (
                        <MdInventory2 />
                      )}

                      {sec.type === "banner" && (
                        <MdImage />
                      )}

                      {sec.type === "other" && (
                        <MdLink />
                      )}

                      <span>
                        {sec.type.toUpperCase()}
                      </span>

                    </span>

                  </div>

                  <div className="section-items-summary">

                    {sec.type === "category" && (
                      <span>
                        {sec.categoryItems?.length || sec.categories?.length || 0}{" "}
                        Categories selected
                      </span>
                    )}

                    {sec.type === "product" && (
                      <span>
                        {sec.products?.length || 0}
                        {" "}
                        Products selected
                      </span>
                    )}

                    {sec.type === "banner" && (
                      <span>
                        {sec.banners?.length || 0}
                        {" "}
                        Banners selected
                      </span>
                    )}

                    {sec.type === "other" && (
                      <span>
                        {sec.items?.length || 0}
                        {" "}
                        Custom items added
                      </span>
                    )}

                  </div>

                </div>

                {/* ACTIONS */}

                <div className="section-row-actions">

                  <button
                    type="button"
                    className={`status-pill ${
                      sec.isActive
                        ? "active"
                        : "inactive"
                    }`}
                    onClick={() =>
                      handleToggleSectionActive(sec)
                    }
                  >
                    {sec.isActive ? (
                      <MdCheckCircle />
                    ) : (
                      <MdCancel />
                    )}

                    <span>
                      {sec.isActive
                        ? "Active"
                        : "Disabled"}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={() =>
                      handleOpenEditModal(sec)
                    }
                    title="Edit Section"
                  >
                    <MdEdit />
                  </button>

                  <button
                    type="button"
                    className="delete-sec-btn"
                    onClick={() =>
                      handleDeleteSection(sec)
                    }
                    title="Delete Section"
                  >
                    <MdDelete />
                  </button>

                </div>

              </div>

            ))}

          </div>
        )}

      </div>

      {/* ========================================
          SECTION MODAL
      ======================================== */}

      {showSectionModal && (

        <div
          className="modal-overlay"
          onClick={() =>
            setShowSectionModal(false)
          }
        >

          <div
            className="modal-container section-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* MODAL HEADER */}

            <div className="modal-header">

              <h3>
                {editingSection
                  ? "Edit Section"
                  : `Add Section to ${page.name}`}
              </h3>

              <button
                type="button"
                className="close-modal-btn"
                onClick={() =>
                  setShowSectionModal(false)
                }
              >
                ✕
              </button>

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSaveSection}
              className="modal-form"
            >

              {/* SECTION NAME */}

              <div className="form-group">

                <label>
                  Section Name *
                </label>

                <input
                  type="text"
                  placeholder="e.g. Popular Categories, Hero Banner"
                  value={sectionName}
                  onChange={(e) =>
                    setSectionName(e.target.value)
                  }
                  required
                />

              </div>

              {/* SECTION TYPE */}

              <div className="form-group">

                <label>
                  Section Type *
                </label>

                <select
                  value={sectionType}
                  onChange={(e) =>
                    setSectionType(e.target.value)
                  }
                >
                  <option value="category">
                    Category Section
                  </option>

                  <option value="product">
                    Product Section
                  </option>

                  <option value="banner">
                    Banner Section
                  </option>

                  <option value="other">
                    Other Section
                  </option>
                </select>

              </div>

              {/* ========================================
                  CATEGORY PICKER
              ======================================== */}

              {sectionType === "category" && (
                <div className="resource-picker-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <label style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}>
                      Categories in this Section ({categoryItems.length} added)
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setShowQuickCreateCategory(!showQuickCreateCategory)
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "#eff6ff",
                        border: "1px solid #93c5fd",
                        color: "#1d4ed8",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <MdAdd />
                      <span>
                        {showQuickCreateCategory
                          ? "Close Quick Category Form"
                          : "+ Quick Create Global Category"}
                      </span>
                    </button>
                  </div>

                  {/* QUICK CREATE GLOBAL CATEGORY FORM */}
                  {showQuickCreateCategory && (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <h5
                        style={{
                          margin: "0 0 10px",
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        Create New Global Category
                      </h5>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                          alignItems: "flex-end",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "4px",
                              display: "block",
                            }}
                          >
                            Category Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Running Gear, Rain Jackets"
                            value={quickCatName}
                            onChange={(e) => setQuickCatName(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div style={{ minWidth: "160px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "4px",
                              display: "block",
                            }}
                          >
                            Default Image (Optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setQuickCatImage(e.target.files?.[0] || null)
                            }
                            style={{ fontSize: "12px" }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleQuickCreateCategory}
                          disabled={creatingCategory}
                          style={{
                            padding: "8px 16px",
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {creatingCategory
                            ? "Creating..."
                            : "Create & Add to Section"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CATEGORY SELECTOR DROPDOWN */}
                  <div
                    style={{
                      marginBottom: "14px",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCategoryToSection(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="" disabled>
                        -- Select an existing global category to add --
                      </option>
                      {availableCategories.map((cat) => (
                        <option
                          key={cat._id}
                          value={cat._id}
                          disabled={categoryItems.some(
                            (ci) => ci.categoryId === cat._id
                          )}
                        >
                          {cat.name}{" "}
                          {categoryItems.some(
                            (ci) => ci.categoryId === cat._id
                          )
                            ? "(Already in Section)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ADDED CATEGORIES LIST WITH CUSTOM IMAGE OVERRIDES */}
                  {categoryItems.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "8px",
                        color: "#64748b",
                        fontSize: "13px",
                        marginBottom: "16px",
                      }}
                    >
                      No categories added to this section yet. Choose from the
                      dropdown above or click on any available category below.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "20px",
                        maxHeight: "340px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {categoryItems.map((ci, index) => {
                        const globalCat = availableCategories.find(
                          (c) => c._id === ci.categoryId
                        );
                        const defaultImg = globalCat?.image
                          ? getImageUrl(globalCat.image)
                          : "";
                        const activeImg = ci.customImage
                          ? getImageUrl(ci.customImage)
                          : defaultImg;

                        return (
                          <div
                            key={ci.categoryId}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              padding: "10px 14px",
                              background: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "13px",
                                fontWeight: "700",
                                color: "#64748b",
                                width: "20px",
                              }}
                            >
                              {index + 1}.
                            </span>

                            {/* PREVIEW THUMBNAIL */}
                            <div
                              style={{
                                width: "44px",
                                height: "44px",
                                borderRadius: "50%",
                                overflow: "hidden",
                                border: "1px solid #cbd5e1",
                                background: "#f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              {activeImg ? (
                                <img
                                  src={activeImg}
                                  alt={globalCat?.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <MdCategory
                                  style={{
                                    fontSize: "22px",
                                    color: "#94a3b8",
                                  }}
                                />
                              )}
                            </div>

                            {/* INFO */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: "700",
                                  fontSize: "14px",
                                  color: "#0f172a",
                                }}
                              >
                                {globalCat?.name || "Category"}
                              </div>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "#64748b",
                                  marginTop: "2px",
                                }}
                              >
                                {ci.customImage ? (
                                  <span
                                    style={{
                                      color: "#2563eb",
                                      fontWeight: "600",
                                    }}
                                  >
                                    ★ Section Custom Image Active
                                  </span>
                                ) : (
                                  <span>Using Global Default Image</span>
                                )}
                              </div>
                            </div>

                            {/* CUSTOM IMAGE BUTTONS */}
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <label
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                  padding: "6px 10px",
                                  background: "#f1f5f9",
                                  border: "1px solid #cbd5e1",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  color: "#334155",
                                }}
                                title="Upload a section-specific image without changing the global category image"
                              >
                                <MdUploadFile />
                                <span>
                                  {ci.customImage
                                    ? "Change Img"
                                    : "Custom Img"}
                                </span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  style={{ display: "none" }}
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) {
                                      handleCustomCategoryImageUpload(
                                        ci.categoryId,
                                        e.target.files[0]
                                      );
                                    }
                                  }}
                                />
                              </label>

                              {ci.customImage && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveCustomCategoryImage(
                                      ci.categoryId
                                    )
                                  }
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#dc2626",
                                    fontSize: "11px",
                                    cursor: "pointer",
                                    padding: "4px",
                                  }}
                                  title="Revert back to default global image"
                                >
                                  Revert
                                </button>
                              )}

                              {/* REORDER UP/DOWN */}
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() =>
                                  handleMoveCategoryItem(index, "up")
                                }
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "4px",
                                  padding: "4px",
                                  cursor:
                                    index === 0 ? "default" : "pointer",
                                  opacity: index === 0 ? 0.3 : 1,
                                }}
                                title="Move Up"
                              >
                                <MdKeyboardArrowUp />
                              </button>
                              <button
                                type="button"
                                disabled={index === categoryItems.length - 1}
                                onClick={() =>
                                  handleMoveCategoryItem(index, "down")
                                }
                                style={{
                                  background: "#f8fafc",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "4px",
                                  padding: "4px",
                                  cursor:
                                    index === categoryItems.length - 1
                                      ? "default"
                                      : "pointer",
                                  opacity:
                                    index === categoryItems.length - 1
                                      ? 0.3
                                      : 1,
                                }}
                                title="Move Down"
                              >
                                <MdKeyboardArrowDown />
                              </button>

                              {/* REMOVE FROM SECTION */}
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveCategoryFromSection(ci.categoryId)
                                }
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#ef4444",
                                  fontSize: "18px",
                                  cursor: "pointer",
                                  padding: "4px",
                                  display: "flex",
                                  alignItems: "center",
                                }}
                                title="Remove from this section"
                              >
                                <MdDelete />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* QUICK ADD GRID */}
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Or click an available category below to add:
                    </label>
                    <div className="resource-picker-grid">
                      {availableCategories.map((cat) => {
                        const isAdded = categoryItems.some(
                          (ci) => ci.categoryId === cat._id
                        );
                        return (
                          <div
                            key={cat._id}
                            className={`picker-card ${
                              isAdded ? "selected" : ""
                            }`}
                            onClick={() => {
                              if (isAdded) {
                                toast.error(
                                  "Category is already added to this section."
                                );
                              } else {
                                handleAddCategoryToSection(cat._id);
                              }
                            }}
                            style={{
                              cursor: isAdded ? "not-allowed" : "pointer",
                              opacity: isAdded ? 0.75 : 1,
                            }}
                          >
                            <div className="picker-img">
                              {cat.image ? (
                                <img
                                  src={getImageUrl(cat.image)}
                                  alt={cat.name}
                                />
                              ) : (
                                <MdCategory />
                              )}
                            </div>
                            <span>
                              {cat.name} {isAdded ? "✓" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================
                  PRODUCT PICKER
              ======================================== */}

              {sectionType === "product" && (

                <div className="resource-picker-group">

                  <label>
                    Select Products (
                    {selectedProducts.length}
                    {" "}selected)
                  </label>

                  <div className="resource-picker-grid">

                    {availableProducts.map(
                      (prod) => (

                        <div
                          key={prod._id}
                          className={`picker-card ${
                            selectedProducts.includes(
                              prod._id
                            )
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            toggleProductSelection(
                              prod._id
                            )
                          }
                        >

                          <div className="picker-img">

                            {prod.images?.[0] ? (
                              <img
                                src={getImageUrl(
                                  prod.images[0]
                                )}
                                alt={prod.name}
                              />
                            ) : (
                              <MdInventory2 />
                            )}

                          </div>

                          <span>
                            {prod.name}
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </div>
              )}

              {/* ========================================
                  BANNER PICKER
              ======================================== */}

              {sectionType === "banner" && (

                <div className="resource-picker-group">

                  <label>
                    Select Banners (
                    {selectedBanners.length}
                    {" "}selected)
                  </label>

                  <div className="resource-picker-grid">

                    {availableBanners.map(
                      (ban) => (

                        <div
                          key={ban._id}
                          className={`picker-card ${
                            selectedBanners.includes(
                              ban._id
                            )
                              ? "selected"
                              : ""
                          }`}
                          onClick={() =>
                            toggleBannerSelection(
                              ban._id
                            )
                          }
                        >

                          <div className="picker-img">

                            {ban.image ? (
                              <img
                                src={getImageUrl(
                                  ban.image
                                )}
                                alt={
                                  ban.title ||
                                  "Banner"
                                }
                              />
                            ) : (
                              <MdImage />
                            )}

                          </div>

                          <span>
                            {ban.title ||
                              "Banner"}
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </div>
              )}

              {/* ========================================
                  OTHER SECTION
              ======================================== */}

              {sectionType === "other" && (

                <div className="other-section-builder">

                  <p className="other-section-description">
                    Upload custom images, enter titles,
                    and optionally add a link for each item.
                  </p>

                  {/* EMPTY */}

                  {items.length === 0 && (

                    <div className="other-empty-state">

                      <MdImage />

                      <p>
                        No items added yet.
                      </p>

                      <span>
                        Use the button below to add
                        your first item.
                      </span>

                    </div>
                  )}

                  {/* ITEMS */}

                  {items.map((item, index) => (

                    <div
                      className="other-item-builder"
                      key={index}
                    >

                      {/* ITEM HEADER */}

                      <div className="other-item-header">

                        <strong>
                          + Item {index + 1}
                        </strong>

                        <button
                          type="button"
                          className="remove-other-item"
                          onClick={() =>
                            handleRemoveItem(index)
                          }
                        >
                          <MdDelete />
                          Remove
                        </button>

                      </div>

                      {/* NAME */}

                      <div className="other-item-fields">

                        <div className="other-field">

                          <label>
                            Item Name *
                          </label>

                          <input
                            type="text"
                            placeholder="e.g. Monsoon Essentials"
                            value={item.name || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "name",
                                e.target.value
                              )
                            }
                          />

                        </div>

                        {/* LINK */}

                        <div className="other-field">

                          <label>
                            Link / Category Route
                            (Optional)
                          </label>

                          <input
                            type="text"
                            placeholder="/monsoon-essentials"
                            value={item.link || ""}
                            onChange={(e) =>
                              handleItemChange(
                                index,
                                "link",
                                e.target.value
                              )
                            }
                          />

                        </div>

                      </div>

                      {/* IMAGE */}

                      <div className="other-image-row">

                        <label className="other-upload-box">

                          <MdImage />

                          <span>
                            {item.image
                              ? "Change Image"
                              : "Upload Image"}
                          </span>

                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                              handleItemImageChange(
                                index,
                                e.target.files?.[0]
                              )
                            }
                          />

                        </label>

                        {/* PREVIEW */}

                        {item.image && (

                          <div className="other-image-preview">

                            <img
                              src={getImageUrl(
                                item.image
                              )}
                              alt={
                                item.name ||
                                "Preview"
                              }
                            />

                          </div>
                        )}

                      </div>

                    </div>

                  ))}

                  {/* ADD ITEM */}

                  <button
                    type="button"
                    className="add-other-item-btn"
                    onClick={handleAddItem}
                  >
                    <MdAdd />

                    <span>
                      Add New Item
                    </span>
                  </button>

                </div>
              )}

              {/* ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() =>
                    setShowSectionModal(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={savingSection}
                >
                  {savingSection
                    ? "Saving..."
                    : editingSection
                    ? "Update Section"
                    : "Add Section"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};

export default PageBuilder;
