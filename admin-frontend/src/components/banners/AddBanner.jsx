import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdArrowBack, MdCloudUpload, MdClose } from "react-icons/md";
import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/banner/AddBanner.css";

const AddBanner = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [images, setImages] = useState([]); // array of { file, preview, id }
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  /*
  ========================================
  IMAGE CHANGE (SUPPORTS MULTIPLE)
  ========================================
  */
  const handleImageChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newItems = selectedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${Date.now()}-${Math.random()}`,
    }));

    setImages((prev) => [...prev, ...newItems]);
    // Reset file input so same file can be selected again if needed
    e.target.value = "";
  };

  /*
  ========================================
  REMOVE IMAGE
  ========================================
  */
  const removeImage = (indexToRemove) => {
    setImages((prev) => {
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

    if (!images.length) {
      toast.error("At least one banner image is required");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();
      data.append("title", title.trim());
      data.append("link", link.trim());
      data.append("subcategory", subcategory.trim());
      data.append("isActive", isActive);

      images.forEach((item) => {
        data.append("images", item.file);
      });
      // Fallback single image field
      if (images[0]) {
        data.append("image", images[0].file);
      }

      await api.post("/banners", data);

      toast.success("Banner added successfully");
      navigate("/banners");
    } catch (error) {
      console.error("Add Banner Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to add banner"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-banner-page">
      {/* HEADER */}
      <div className="add-banner-header">
        <button
          type="button"
          className="banner-back-btn"
          onClick={() => navigate("/banners")}
        >
          <MdArrowBack />
          Back
        </button>

        <div>
          <h1>Add Banner</h1>
          <p>Create a homepage banner with single or multiple images</p>
        </div>
      </div>

      {/* FORM */}
      <form className="add-banner-form" onSubmit={handleSubmit}>
        <section className="banner-form-section">
          <div className="banner-section-title">
            <h2>Banner Information</h2>
          </div>

          {/* TITLE */}
          <div className="banner-form-group">
            <label>Banner Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter banner title"
            />
          </div>

          {/* LINK */}
          <div className="banner-form-group">
            <label>Link</label>
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="/products"
            />
          </div>

          {/* SUBCATEGORY */}
          <div className="banner-form-group">
            <label>Banner Subcategory</label>
            <input
              type="text"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              placeholder="e.g. First Order, Monsoon Sale, Clearance"
            />
          </div>

          {/* MULTIPLE IMAGES UPLOAD BOX */}
          <div className="banner-form-group">
            <label>Banner Images *</label>

            <label className="banner-upload-box">
              <input
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={handleImageChange}
              />
              <MdCloudUpload />
              <strong>Upload Banner Images</strong>
              <span>
                Select one or multiple images (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
              </span>
            </label>
          </div>

          {/* PREVIEWS */}
          {images.length > 0 && (
            <div className="banner-form-group">
              <label>Selected Images ({images.length})</label>
              <div className="banner-multi-previews">
                {images.map((img, idx) => (
                  <div className="banner-multi-preview-item" key={img.id || idx}>
                    <img src={img.preview} alt={`Banner Preview ${idx + 1}`} />
                    <button
                      type="button"
                      className="banner-remove-preview-btn"
                      onClick={() => removeImage(idx)}
                      title="Remove image"
                    >
                      <MdClose />
                    </button>
                    <span className="banner-preview-badge">#{idx + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ACTIVE */}
          <div className="banner-active-row">
            <label>Active Banner</label>
            <button
              type="button"
              className={isActive ? "banner-switch active" : "banner-switch"}
              onClick={() => setIsActive(!isActive)}
            >
              <span />
            </button>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="banner-form-actions">
          <button
            type="button"
            className="banner-cancel-btn"
            onClick={() => navigate("/banners")}
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="banner-save-btn"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Banner"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddBanner;