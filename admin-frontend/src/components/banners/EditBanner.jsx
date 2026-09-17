import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  MdArrowBack,
  MdCloudUpload,
  MdDelete,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/banner/EditBanner.css";

const EditBanner = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [isActive, setIsActive] =
    useState(true);

  const [existingImage, setExistingImage] =
    useState("");

  const [image, setImage] =
    useState(null);

  const [preview, setPreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  /*
  ========================================
  IMAGE URL
  ========================================
  */

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

  /*
  ========================================
  FETCH BANNER
  ========================================
  */

  const fetchBanner = useCallback(
    async () => {
      try {
        setLoading(true);

        const response =
          await api.get("/banners");

        const banners =
          response.data.banners || [];

        const banner =
          banners.find(
            (item) => item._id === id
          );

        if (!banner) {
          toast.error(
            "Banner not found"
          );

          navigate("/banners");

          return;
        }

        setTitle(
          banner.title || ""
        );

        setLink(
          banner.link || ""
        );

        setIsActive(
          banner.isActive ?? true
        );

        setExistingImage(
          banner.image || ""
        );
      } catch (error) {
        console.error(
          "Fetch Banner Error:",
          error
        );

        toast.error(
          error.response?.data
            ?.message ||
            "Failed to load banner"
        );

        navigate("/banners");
      } finally {
        setLoading(false);
      }
    },
    [id, navigate]
  );

  /*
  ========================================
  INITIAL LOAD
  ========================================
  */

  useEffect(() => {
    fetchBanner();
  }, [fetchBanner]);

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
  REMOVE NEW IMAGE
  ========================================
  */

  const removeNewImage = () => {
    setImage(null);
    setPreview("");
  };

  /*
  ========================================
  REMOVE EXISTING IMAGE
  ========================================
  */

  const removeExistingImage = () => {
    setExistingImage("");
  };

  /*
  ========================================
  SUBMIT
  ========================================
  */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

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

      /*
      New image selected
      */

      if (image) {
        data.append(
          "image",
          image
        );
      } else {
        /*
        Keep existing image
        or send empty string
        if admin removed it.
        */

        data.append(
          "existingImage",
          existingImage
        );
      }

      await api.put(
        `/banners/${id}`,
        data
      );

      toast.success(
        "Banner updated successfully"
      );

      navigate("/banners");
    } catch (error) {
      console.error(
        "Update Banner Error:",
        error
      );

      toast.error(
        error.response?.data
          ?.message ||
          "Failed to update banner"
      );
    } finally {
      setSaving(false);
    }
  };

  /*
  ========================================
  LOADING
  ========================================
  */

  if (loading) {
    return (
      <div className="edit-banner-page">
        <div className="edit-banner-loading">
          Loading banner...
        </div>
      </div>
    );
  }

  /*
  ========================================
  UI
  ========================================
  */

  return (
    <div className="edit-banner-page">

      {/* HEADER */}

      <div className="edit-banner-header">

        <button
          type="button"
          className="edit-banner-back-btn"
          onClick={() =>
            navigate("/banners")
          }
        >
          <MdArrowBack />
          Back
        </button>

        <div>

          <h1>
            Edit Banner
          </h1>

          <p>
            Update homepage banner
          </p>

        </div>

      </div>

      {/* FORM */}

      <form
        className="edit-banner-form"
        onSubmit={handleSubmit}
      >

        <section className="edit-banner-section">

          <div className="edit-banner-section-title">

            <h2>
              Banner Information
            </h2>

          </div>

          {/* TITLE */}

          <div className="edit-banner-form-group">

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

          <div className="edit-banner-form-group">

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

          {/* CURRENT IMAGE */}

          <div className="edit-banner-form-group">

            <label>
              Current Image
            </label>

            {existingImage ? (

              <div className="edit-banner-existing-image">

                <img
                  src={getImageUrl(
                    existingImage
                  )}
                  alt="Current Banner"
                />

                <button
                  type="button"
                  onClick={
                    removeExistingImage
                  }
                >
                  <MdDelete />
                  Remove
                </button>

              </div>

            ) : (

              <div className="edit-banner-no-image">
                No existing image
              </div>

            )}

          </div>

          {/* REPLACE IMAGE */}

          <div className="edit-banner-form-group">

            <label>
              Replace Image
            </label>

            <label className="edit-banner-upload-box">

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
                Upload New Banner
              </strong>

              <span>
                All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
              </span>

            </label>

          </div>

          {/* NEW PREVIEW */}

          {preview && (

            <div className="edit-banner-preview-wrapper">

              <div className="edit-banner-preview">

                <img
                  src={preview}
                  alt="New Banner Preview"
                />

                <button
                  type="button"
                  onClick={
                    removeNewImage
                  }
                >
                  Remove
                </button>

              </div>

            </div>

          )}

          {/* ACTIVE */}

          <div className="edit-banner-active-row">

            <label>
              Active Banner
            </label>

            <button
              type="button"
              className={
                isActive
                  ? "edit-banner-switch active"
                  : "edit-banner-switch"
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

        <div className="edit-banner-actions">

          <button
            type="button"
            className="edit-banner-cancel-btn"
            onClick={() =>
              navigate("/banners")
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="edit-banner-save-btn"
            disabled={saving}
          >
            {saving
              ? "Updating..."
              : "Update Banner"}
          </button>

        </div>

      </form>

    </div>
  );
};

export default EditBanner;