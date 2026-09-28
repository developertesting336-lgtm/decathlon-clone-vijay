import React, { useEffect, useState } from "react";

import { Link } from "react-router-dom";

import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdClose,
  MdVisibility,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/Banners.css";

const Banners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    title: "",
  });

  const [viewBanner, setViewBanner] = useState(null);

  const fetchBanners = async () => {
    try {
      setLoading(true);

      const response = await api.get("/banners");

      setBanners(response.data.banners || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load banners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const getImageUrl = (image) => {
    if (!image) {
      return "";
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
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

    return image;
  };

  const getBannerType = (type) => {
    if (type === "coupon") {
      return "Coupon Banner";
    }

    if (type === "promo") {
      return "Promo Banner";
    }

    if (type === "promo2") {
      return "Promo Banner 2";
    }

    return type;
  };

  const openDeleteModal = (banner) => {
    setDeleteModal({
      open: true,
      id: banner._id,
      title: banner.title || getBannerType(banner.type),
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      id: null,
      title: "",
    });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/banners/${deleteModal.id}`);

      setBanners((prev) =>
        prev.filter((banner) => banner._id !== deleteModal.id),
      );

      closeDeleteModal();

      toast.success("Banner deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete banner");
    }
  };

  return (
    <>
      <div className="banners-page">
        <div className="banners-header">
          <div>
            <h1>Banners</h1>

            <p>Manage homepage banners</p>
          </div>

          <div className="banners-header-actions">
            <button
              type="button"
              className="refresh-banners-btn"
              onClick={fetchBanners}
            >
              <MdRefresh />
              Refresh
            </button>

            <Link to="/banners/add" className="add-banner-btn">
              <MdAdd />
              Add Banner
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="banners-loading">Loading banners...</div>
        ) : (
          <div className="banners-grid">
            {banners.length === 0 ? (
              <div className="empty-banners">No banners found</div>
            ) : (
              banners.map((banner) => (
                <div className="banner-card" key={banner._id}>
                  <div className="banner-image-wrapper">
                    {banner.image || banner.images?.[0] ? (
                      <img
                        src={getImageUrl(banner.images?.[0] || banner.image)}
                        alt={banner.title || getBannerType(banner.type)}
                        onError={(e) => {
                          e.currentTarget.style.display = "none";

                          const fallback =
                            e.currentTarget.parentElement?.querySelector(
                              ".banner-no-image",
                            );

                          if (fallback) {
                            fallback.style.display = "flex";
                          }
                        }}
                      />
                    ) : null}

                    <div
                      className="banner-no-image"
                      style={{
                        display: banner.image || banner.images?.[0] ? "none" : "flex",
                      }}
                    >
                      No Image
                    </div>

                    {banner.images && banner.images.length > 1 && (
                      <span className="banner-count-badge">
                        {banner.images.length} Images
                      </span>
                    )}

                    <span
                      className={
                        banner.isActive
                          ? "banner-status active"
                          : "banner-status inactive"
                      }
                    >
                      {banner.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="banner-card-content">
                    <div className="banner-card-info">
                      <h3>{banner.title || "Untitled Banner"}</h3>

                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "4px" }}>
                        <span>{getBannerType(banner.type)}</span>
                        {banner.subcategory && (
                          <span
                            style={{
                              background: "#e0f2fe",
                              color: "#0369a1",
                              padding: "2px 8px",
                              borderRadius: "4px",
                              fontSize: "11px",
                              fontWeight: "600",
                            }}
                          >
                            {banner.subcategory}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="banner-actions">
                      <button
                        type="button"
                        className="banner-view-btn"
                        title="View Banner"
                        onClick={() => setViewBanner(banner)}
                      >
                        <MdVisibility />
                      </button>

                      <Link
                        to={`/banners/edit/${banner._id}`}
                        className="banner-edit-btn"
                        title="Edit Banner"
                      >
                        <MdEdit />
                      </Link>

                      <button
                        type="button"
                        className="banner-delete-btn"
                        title="Delete Banner"
                        onClick={() => openDeleteModal(banner)}
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {viewBanner && (
        <div
          className="banner-view-modal-overlay"
          onClick={() => setViewBanner(null)}
        >
          <div
            className="banner-view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="banner-modal-close"
              onClick={() => setViewBanner(null)}
            >
              <MdClose />
            </button>

            {/* If multiple images, show all previews */}
            {viewBanner.images && viewBanner.images.length > 1 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "10px",
                  maxHeight: "260px",
                  overflowY: "auto",
                  padding: "10px 0",
                }}
              >
                {viewBanner.images.map((imgUrl, i) => (
                  <div
                    key={i}
                    style={{
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: "1px solid #ddd",
                      aspectRatio: "16/9",
                    }}
                  >
                    <img
                      src={getImageUrl(imgUrl)}
                      alt={`Banner ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="banner-view-image">
                {viewBanner.image || viewBanner.images?.[0] ? (
                  <img
                    src={getImageUrl(viewBanner.images?.[0] || viewBanner.image)}
                    alt={viewBanner.title || "Banner"}
                  />
                ) : (
                  <div className="banner-no-image">No Image</div>
                )}
              </div>
            )}

            <div className="banner-view-content">
              <h2>{viewBanner.title || "Untitled Banner"}</h2>

              {viewBanner.subcategory && (
                <div className="banner-view-row">
                  <span>Subcategory</span>
                  <strong>{viewBanner.subcategory}</strong>
                </div>
              )}

              <div className="banner-view-row">
                <span>Type</span>
                <strong>{getBannerType(viewBanner.type)}</strong>
              </div>

              <div className="banner-view-row">
                <span>Status</span>
                <strong>{viewBanner.isActive ? "Active" : "Inactive"}</strong>
              </div>

              <div className="banner-view-row">
                <span>Link</span>
                <strong>{viewBanner.link || "-"}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="banner-delete-modal-overlay" onClick={closeDeleteModal}>
          <div
            className="banner-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="banner-delete-close"
              onClick={closeDeleteModal}
            >
              <MdClose />
            </button>

            <div className="banner-delete-icon">
              <MdDelete />
            </div>

            <h2>Delete Banner?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteModal.title}</strong>?
            </p>

            <span>This action cannot be undone.</span>

            <div className="banner-delete-actions">
              <button
                type="button"
                className="banner-cancel-btn"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="banner-confirm-delete-btn"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Banners;
