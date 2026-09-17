import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  MdArrowBack,
  MdCloudUpload,
  MdDelete,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/category/EditCategory.css";

const EditCategory = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [existingImage, setExistingImage] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // IMAGE URL
  const getImageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return image;
  };

  // LOAD CATEGORY

  useEffect(() => {
    const fetchCategory = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          `/categories/${id}`
        );

        const category =
          response.data.category;

        setName(category.name || "");
        setExistingImage(
          category.image || ""
        );
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to load category"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCategory();
  }, [id]);

  // IMAGE SELECT

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setNewImage(file);

    setPreview(
      URL.createObjectURL(file)
    );
  };

  // REMOVE NEW IMAGE

  const removeNewImage = () => {
    setNewImage(null);
    setPreview("");
  };

  // REMOVE EXISTING IMAGE

  const removeExistingImage = () => {
    setExistingImage("");
  };

  // SUBMIT

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error(
        "Category name is required"
      );
      return;
    }

    try {
      setSaving(true);

      const data = new FormData();

      data.append(
        "name",
        name.trim()
      );

      // New image
      if (newImage) {
        data.append(
          "image",
          newImage
        );
      }

      // Tell backend whether old image remains
      data.append(
        "existingImage",
        existingImage
      );

      await api.put(
        `/categories/${id}`,
        data
      );

      toast.success(
        "Category updated successfully"
      );

      setTimeout(() => {
        navigate("/categories");
      }, 800);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update category"
      );
    } finally {
      setSaving(false);
    }
  };

  // LOADING

  if (loading) {
    return (
      <div className="categories-loading">
        Loading category...
      </div>
    );
  }

  return (
    <div className="edit-category-page">

      {/* HEADER */}

      <div className="edit-category-header">

        <button
          type="button"
          className="category-back-btn"
          onClick={() =>
            navigate("/categories")
          }
        >
          <MdArrowBack />
          Back
        </button>

        <div>
          <h1>Edit Category</h1>

          <p>
            Update category information
          </p>
        </div>

      </div>

      {/* FORM */}

      <form
        className="edit-category-form"
        onSubmit={handleSubmit}
      >

        <section className="category-form-section">

          <div className="category-section-title">
            <h2>
              Category Information
            </h2>
          </div>

          {/* NAME */}

          <div className="category-form-group">

            <label>
              Category Name *
            </label>

            <input
              type="text"
              value={name}
              onChange={(e) =>
                setName(e.target.value)
              }
              placeholder="Enter category name"
            />

          </div>

          {/* EXISTING IMAGE */}

          <div className="category-form-group">

            <label>
              Current Image
            </label>

            {existingImage ? (

              <div className="edit-category-image">

                <img
                  src={getImageUrl(
                    existingImage
                  )}
                  alt={name}
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

              <div className="no-category-image">
                No current image
              </div>

            )}

          </div>

          {/* NEW IMAGE */}

          <div className="category-form-group">

            <label>
              Replace Image
            </label>

            <label className="category-upload-box">

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
                Upload New Image
              </strong>

              <span>
                All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
              </span>

            </label>

          </div>

          {/* PREVIEW */}

          {preview && (

            <div className="edit-category-preview">

              <div className="edit-category-image">

                <img
                  src={preview}
                  alt="New preview"
                />

                <button
                  type="button"
                  onClick={
                    removeNewImage
                  }
                >
                  <MdDelete />
                  Remove
                </button>

              </div>

            </div>

          )}

        </section>

        {/* ACTIONS */}

        <div className="category-form-actions">

          <button
            type="button"
            className="category-cancel-btn"
            onClick={() =>
              navigate("/categories")
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="category-save-btn"
            disabled={saving}
          >
            {saving
              ? "Updating..."
              : "Save Changes"}
          </button>

        </div>

      </form>

    </div>
  );
};

export default EditCategory;