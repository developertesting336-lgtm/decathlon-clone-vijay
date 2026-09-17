import React, {
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  MdArrowBack,
  MdCloudUpload,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/banner/AddBanner.css";

const AddBanner = () => {
  const navigate = useNavigate();

  const [title, setTitle] =
    useState("");

  const [link, setLink] =
    useState("");

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [isActive, setIsActive] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  /*
  ========================================
  IMAGE CHANGE
  ========================================
  */

  const handleImageChange = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) {
      return;
    }

    setImage(file);

    setPreview(
      URL.createObjectURL(file)
    );
  };

  /*
  ========================================
  REMOVE IMAGE
  ========================================
  */

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  /*
  ========================================
  SUBMIT
  ========================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!image) {
      toast.error(
        "Banner image is required"
      );

      return;
    }

    try {
      setLoading(true);

      const data =
        new FormData();

      data.append(
        "title",
        title.trim()
      );

      data.append(
        "link",
        link.trim()
      );

      data.append(
        "isActive",
        isActive
      );

      data.append(
        "image",
        image
      );

      await api.post(
        "/banners",
        data
      );

      toast.success(
        "Banner added successfully"
      );

      navigate("/banners");
    } catch (error) {
      console.error(
        "Add Banner Error:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Failed to add banner"
      );
    } finally {
      setLoading(false);
    }
  };

  /*
  ========================================
  UI
  ========================================
  */

  return (
    <div className="add-banner-page">

      {/* HEADER */}

      <div className="add-banner-header">

        <button
          type="button"
          className="banner-back-btn"
          onClick={() =>
            navigate("/banners")
          }
        >
          <MdArrowBack />
          Back
        </button>

        <div>

          <h1>
            Add Banner
          </h1>

          <p>
            Create a homepage banner
          </p>

        </div>

      </div>

      {/* FORM */}

      <form
        className="add-banner-form"
        onSubmit={handleSubmit}
      >

        <section className="banner-form-section">

          <div className="banner-section-title">

            <h2>
              Banner Information
            </h2>

          </div>

          {/* TITLE */}

          <div className="banner-form-group">

            <label>
              Banner Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(e) =>
                setTitle(
                  e.target.value
                )
              }
              placeholder="Enter banner title"
            />

          </div>

          {/* LINK */}

          <div className="banner-form-group">

            <label>
              Link
            </label>

            <input
              type="text"
              value={link}
              onChange={(e) =>
                setLink(
                  e.target.value
                )
              }
              placeholder="/products"
            />

          </div>

          {/* IMAGE */}

          <div className="banner-form-group">

            <label>
              Banner Image *
            </label>

            <label className="banner-upload-box">

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={
                  handleImageChange
                }
              />

              <MdCloudUpload />

              <strong>
                Upload Banner Image
              </strong>

              <span>
                All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
              </span>

            </label>

          </div>

          {/* PREVIEW */}

          {preview && (

            <div className="banner-preview-wrapper">

              <div className="banner-preview">

                <img
                  src={preview}
                  alt="Banner Preview"
                />

                <button
                  type="button"
                  onClick={
                    removeImage
                  }
                >
                  Remove
                </button>

              </div>

            </div>

          )}

          {/* ACTIVE */}

          <div className="banner-active-row">

            <label>
              Active Banner
            </label>

            <button
              type="button"
              className={
                isActive
                  ? "banner-switch active"
                  : "banner-switch"
              }
              onClick={() =>
                setIsActive(
                  !isActive
                )
              }
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
            onClick={() =>
              navigate("/banners")
            }
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="banner-save-btn"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save Banner"}
          </button>

        </div>

      </form>

    </div>
  );
};

export default AddBanner;