import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdAdd,
  MdLayers,
  MdArrowForward,
  MdCheckCircle,
  MdCancel,
  MdDelete,
  MdSearch,
  MdEdit,
  MdUploadFile,
} from "react-icons/md";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/Pages.css";

const Pages = () => {
  const navigate = useNavigate();

  const [pages, setPages] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_admin_pages");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("cached_admin_pages");
    } catch {
      return true;
    }
  });

  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [pageName, setPageName] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageDescription, setPageDescription] = useState("");
  const [pageImage, setPageImage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPages = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await api.get("/pages", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = response.data.pages || [];
      setPages(data);
      try {
        sessionStorage.setItem("cached_admin_pages", JSON.stringify(data));
      } catch (e) {}
    } catch (error) {
      console.error("Fetch Pages Error:", error);
      toast.error(error?.response?.data?.message || "Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleOpenAddModal = () => {
    setEditingPage(null);
    setPageName("");
    setPageSlug("");
    setPageDescription("");
    setPageImage("");
    setShowModal(true);
  };

  const handleOpenEditModal = (page) => {
    setEditingPage(page);
    setPageName(page.name || "");
    setPageSlug(page.slug || "");
    setPageDescription(page.description || "");
    setPageImage(page.image || "");
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|ico|heic|heif|jfif)$/i.test(
        file.name
      );

    if (!isImage) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("adminToken");
      const res = await api.post("/pages/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setPageImage(res.data.url);
      toast.success("Page image uploaded successfully");
    } catch (err) {
      console.error("Image Upload Error:", err);
      toast.error(err?.response?.data?.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSavePage = async (e) => {
    e.preventDefault();
    if (!pageName.trim()) {
      toast.error("Please enter a page name");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("adminToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        name: pageName.trim(),
        slug: pageSlug.trim() || undefined,
        description: pageDescription.trim(),
        image: pageImage.trim(),
      };

      if (editingPage) {
        const response = await api.put(`/pages/${editingPage._id}`, payload, { headers });
        toast.success(response.data?.message || "Page updated successfully");
      } else {
        const response = await api.post("/pages", payload, { headers });
        toast.success(response.data?.message || "Page created successfully");
      }

      setShowModal(false);
      fetchPages(false);
    } catch (error) {
      console.error("Save Page Error:", error);
      toast.error(error?.response?.data?.message || "Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (page) => {
    setPages((prev) =>
      prev.map((p) => (p._id === page._id ? { ...p, isActive: !p.isActive } : p))
    );

    try {
      const token = localStorage.getItem("adminToken");
      await api.put(
        `/pages/${page._id}`,
        { isActive: !page.isActive },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Page '${page.name}' ${page.isActive ? "disabled" : "enabled"}`);
      fetchPages(false);
    } catch (error) {
      console.error("Toggle Page Active Error:", error);
      toast.error("Failed to update page status");
      fetchPages(false);
    }
  };

  const handleDeletePage = async (page) => {
    if (page.slug === "home") {
      toast.error("The default Home page cannot be deleted");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete page '${page.name}'?`)) {
      return;
    }

    setPages((prev) => prev.filter((p) => p._id !== page._id));

    try {
      const token = localStorage.getItem("adminToken");
      await api.delete(`/pages/${page._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Page deleted successfully");
      fetchPages(false);
    } catch (error) {
      console.error("Delete Page Error:", error);
      toast.error(error?.response?.data?.message || "Failed to delete page");
      fetchPages(false);
    }
  };

  const query = searchQuery.toLowerCase().trim();
  const filteredPages = pages.filter((page) =>
    (page.name && page.name.toLowerCase().includes(query)) ||
    (page.slug && page.slug.toLowerCase().includes(query)) ||
    (page.description && page.description.toLowerCase().includes(query))
  );

  return (
    <div className="pages-management">
      {/* HEADER */}
      <div className="pages-header">
        <div>
          <h2>Pages</h2>
          <p>Manage all store pages, routes, and custom dynamic builders</p>
        </div>

        <button
          type="button"
          className="add-page-btn"
          onClick={handleOpenAddModal}
        >
          <MdAdd />
          <span>Add New Page</span>
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="pages-controls">
        <div className="pages-search">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search pages by name, slug, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* PAGES LIST */}
      {loading && pages.length === 0 ? (
        <div className="pages-skeleton-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="pages-skeleton-card"></div>
          ))}
        </div>
      ) : filteredPages.length === 0 ? (
        <div className="pages-empty">No pages found matching "{searchQuery}"</div>
      ) : (
        <div className="pages-grid">
          {filteredPages.map((page) => (
            <div className="page-card" key={page._id}>
              <div className="page-card-header">
                <div className="page-card-title">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {page.image && (
                      <img
                        src={page.image}
                        alt={page.name}
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          objectFit: "cover",
                        }}
                      />
                    )}
                    <h3>{page.name}</h3>
                  </div>
                  <span className="page-slug-badge">/{page.slug}</span>
                </div>

                <div className="page-card-actions">
                  <button
                    type="button"
                    className={`status-pill ${page.isActive ? "active" : "inactive"}`}
                    onClick={() => handleToggleActive(page)}
                    title="Toggle active status"
                  >
                    {page.isActive ? <MdCheckCircle /> : <MdCancel />}
                    <span>{page.isActive ? "Active" : "Disabled"}</span>
                  </button>

                  <button
                    type="button"
                    className="edit-page-btn"
                    onClick={() => handleOpenEditModal(page)}
                    title="Edit page details"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#3548c4",
                      fontSize: "18px",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <MdEdit />
                  </button>

                  {page.slug !== "home" && (
                    <button
                      type="button"
                      className="delete-page-btn"
                      onClick={() => handleDeletePage(page)}
                      title="Delete page"
                    >
                      <MdDelete />
                    </button>
                  )}
                </div>
              </div>

              <p className="page-description">
                {page.description || "No description provided"}
              </p>

              <div className="page-card-footer">
                <div className="section-count-info">
                  <MdLayers />
                  <span>{page.sections?.length || 0} Section(s)</span>
                </div>

                <button
                  type="button"
                  className="open-builder-btn"
                  onClick={() => navigate(`/pages/builder/${page._id}`)}
                >
                  <span>Page Builder</span>
                  <MdArrowForward />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD / EDIT PAGE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPage ? `Edit Page: ${editingPage.name}` : "Create New Page"}</h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePage} className="modal-form">
              <div className="form-group">
                <label>Page Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Monsoon Essentials, Running"
                  value={pageName}
                  onChange={(e) => {
                    setPageName(e.target.value);
                    if (!editingPage && !pageSlug) {
                      // auto-fill slug proposal
                      setPageSlug(
                        e.target.value
                          .toLowerCase()
                          .trim()
                          .replace(/[^a-z0-9]+/g, "-")
                      );
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Page Slug (URL Identifier)</label>
                <input
                  type="text"
                  placeholder="e.g. monsoon-essentials (lowercase letters, hyphens)"
                  value={pageSlug}
                  onChange={(e) => setPageSlug(e.target.value)}
                />
                <small style={{ color: "#666", fontSize: "12px", marginTop: "4px" }}>
                  Accessible at: <code>/{pageSlug || "your-slug"}</code> and <code>/page/{pageSlug || "your-slug"}</code>
                </small>
              </div>

              <div className="form-group">
                <label>Page Image / Banner Icon</label>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="text"
                    placeholder="Image URL or upload file below..."
                    value={pageImage}
                    onChange={(e) => setPageImage(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <label
                    className="upload-label"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "8px 12px",
                      background: "#f1f5f9",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: 600,
                    }}
                  >
                    <MdUploadFile />
                    {uploadingImage ? "Uploading..." : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                {pageImage && (
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <img
                      src={pageImage}
                      alt="Preview"
                      style={{ width: "40px", height: "40px", borderRadius: "6px", objectFit: "cover" }}
                    />
                    <button
                      type="button"
                      onClick={() => setPageImage("")}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  placeholder="Page purpose or details..."
                  value={pageDescription}
                  onChange={(e) => setPageDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="submit-btn" disabled={saving}>
                  {saving ? "Saving..." : editingPage ? "Update Page" : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pages;

