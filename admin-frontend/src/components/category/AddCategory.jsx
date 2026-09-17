import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  MdArrowBack,
  MdCloudUpload,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/category/AddCategory.css";

const AddCategory = () => {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(false);

  // IMAGE SELECT

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImage(file);

    setPreview(URL.createObjectURL(file));
  };

  // REMOVE IMAGE

  const removeImage = () => {
    setImage(null);
    setPreview("");
  };

  // SUBMIT

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Category name is required");
      return;
    }

    try {
      setLoading(true);

      const data = new FormData();

      data.append("name", name.trim());

      if (image) {
        data.append("image", image);
      }

      await api.post("/categories", data);

      toast.success(
        "Category added successfully"
      );

      setName("");
      setImage(null);
      setPreview("");

      setTimeout(() => {
        navigate("/categories");
      }, 800);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to add category"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-category-page">

      {/* HEADER */}

      <div className="add-category-header">

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
          <h1>Add Category</h1>

          <p>
            Create a new product category
          </p>
        </div>

      </div>

      {/* FORM */}

      <form
        className="add-category-form"
        onSubmit={handleSubmit}
      >

        <section className="category-form-section">

          <div className="category-section-title">
            <h2>Category Information</h2>
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

          {/* IMAGE */}

          <div className="category-form-group">

            <label>
              Category Image
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
                Upload Category Image
              </strong>

              <span>
                All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
              </span>

            </label>

          </div>

          {/* PREVIEW */}

          {preview && (
            <div className="category-image-preview-wrapper">

              <div className="category-image-preview">

                <img
                  src={preview}
                  alt="Category Preview"
                />

                <button
                  type="button"
                  onClick={removeImage}
                >
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
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="category-save-btn"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save Category"}
          </button>

        </div>

      </form>

    </div>
  );
};

export default AddCategory;