import React, { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MdArrowBack, MdCloudUpload, MdClose } from "react-icons/md";
import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/banner/EditBanner.css";

const EditBanner = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Existing images saved in database (URLs)
  const [existingImages, setExistingImages] = useState([]);

  // Newly selected files to upload { file, preview, id }
  const [newImages, setNewImages] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const getImageUrl = (imagePath) => {
    if (!imagePath) return "";
    if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
      return imagePath;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (imagePath.startsWith("/uploads/")) return `${backendUrl}${imagePath}`;
    if (imagePath.startsWith("uploads/")) return `${backendUrl}/${imagePath}`;
    return imagePath;
  };

  const fetchBanner = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/banners");
      const banners = response.data.banners || [];
      const banner = banners.find((item) => item._id === id);

      if (!banner) {
        toast.error("Banner not found");
        navigate("/banners");
        return;
      }

      setTitle(banner.title || "");
      setLink(banner.link || "");
      setSubcategory(banner.subcategory || "");
      setIsActive(banner.isActive ?? true);

      // Load existing images array, fallback to single image
      const imgs =
        Array.isArray(banner.images) && banner.images.length > 0
          ? banner.images
          : banner.image
          ? [banner.image]
          : [];

      setExistingImages(imgs);
    } catch (error) {
      console.error("Fetch Banner Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to load banner"
      );
      navigate("/banners");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBanner();
  }, [fetchBanner]);

  /*
  ========================================
  ADD NEW IMAGES
  ========================================
  */
  const handleNewImagesChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newItems = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setNewImages((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  /*
  ========================================
  REMOVE EXISTING IMAGE
  ========================================
  */
  const removeExistingImage = (indexToRemove) => {
    setExistingImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  /*
  ========================================
  REMOVE NEW IMAGE
  ========================================
  */
  const removeNewImage = (indexToRemove) => {
    setNewImages((prev) => {
      const item = prev[indexToRemove];
      if (item && item.preview) {
        URL.revokeObjectURL(item.preview);
      }
      return prev.filter((_, idx) => idx !== indexToRemove);
    });
  };

  /*
  ========================================
  SUBMIT
  ========================================
  */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (existingImages.length === 0 && newImages.length === 0) {
      toast.error("At least one banner image is required");
      return;
    }

    try {
      setSaving(true);

      const data = new FormData();
      data.append("title", title.trim());
      data.append("link", link.trim());
      data.append("subcategory", subcategory.trim());
      data.append("isActive", isActive);

      // Send retained existing image URLs as JSON
      data.append("existingImages", JSON.stringify(existingImages));
      data.append("existingImage", existingImages[0] || "");

      // Append newly uploaded files
      newImages.forEach((item) => {
        data.append("images", item.file);
      });
      if (newImages[0]) {
        data.append("image", newImages[0].file);
      }

      await api.put(`/banners/${id}`, data);

      toast.success("Banner updated successfully");
      navigate("/banners");
    } catch (error) {
      console.error("Update Banner Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update banner"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-banner-page">
        <div className="edit-banner-loading">Loading banner...</div>
      </div>
    );
  }

  const totalImagesCount = existingImages.length + newImages.length;

  return (
    <div className="edit-banner-page">
      {/* HEADER */}
      <div className="edit-banner-header">
        <button
          type="button"
          className="edit-banner-back-btn"
          onClick={() => navigate("/banners")}
        >
          <MdArrowBack />
          Back
        </button>

        <div>
          <h1>Edit Banner</h1>
          <p>Update homepage banner, subcategory, and images</p>
        </div>
      </div>

      {/* FORM */}
      <form className="edit-banner-form" onSubmit={handleSubmit}>
        <section className="edit-banner-section">
          <div className="edit-banner-section-title">
            <h2>Banner Information</h2>
          </div>

          {/* TITLE */}
          <div className="edit-banner-form-group">
            <label>Banner Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter banner title"
            />
          </div>

          {/* LINK */}
          <div className="edit-banner-form-group">
            <label>Link</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/products"
            />
          </div>

          {/* SUBCATEGORY */}
          <div className="edit-banner-form-group">
            <label>Banner Subcategory</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. First Order, Monsoon Sale, Clearance"
            />
          </div>

          {/* CURRENT & NEW IMAGES */}
          <div className="edit-banner-form-group">
            <label>Banner Images ({totalImagesCount})</label>

            {/* PREVIEWS CONTAINER */}
            <div className="banner-multi-previews">
              {/* Saved Existing Images */}
              {existingImages.map((imgUrl, idx) => (
                <div className="banner-multi-preview-item" key={`existing-${idx}`}>
                  <img src={getImageUrl(imgUrl)} alt={`Existing ${idx + 1}`} />
                  <button
                    type="button"
                    className="banner-remove-preview-btn"
                    onClick={() => removeExistingImage(idx)}
                    title="Remove this image"
                  >
                    <MdClose />
                  </button>
                  <span className="banner-preview-badge">Saved #{idx + 1}</span>
                </div>
              ))}

              {/* Newly Selected Images */}
              {newImages.map((img, idx) => (
                <div className="banner-multi-preview-item new-upload" key={img.id || idx}>
                  <img src={img.preview} alt={`New Preview ${idx + 1}`} />
                  <button
                    type="button"
                    className="banner-remove-preview-btn"
                    onClick={() => removeNewImage(idx)}
                    title="Remove this new image"
                  >
                    <MdClose />
                  </button>
                  <span className="banner-preview-badge new">New</span>
                </div>
              ))}
            </div>

            {/* ADD MORE IMAGES UPLOAD BOX */}
            <label className="edit-banner-upload-box" style={{ marginTop: "14px" }}>
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleNewImagesChange}
              />
              <MdCloudUpload />
              <strong>Upload More Images</strong>
              <span>
                Select additional images to add to this banner
              </span>
            </label>
          </div>

          {/* ACTIVE */}
          <div className="edit-banner-active-row">
            <label>Active Banner</label>
            <button
              type="button"
              className={isActive ? "edit-banner-switch active" : "edit-banner-switch"}
              onClick={() => setIsActive(!isActive)}
            >
              <span />
            </button>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="edit-banner-actions">
          <button
            type="button"
            className="edit-banner-cancel-btn"
            onClick={() => navigate("/banners")}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="edit-banner-save-btn"
            disabled={saving}
          >
            {saving ? "Updating..." : "Update Banner"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditBanner;