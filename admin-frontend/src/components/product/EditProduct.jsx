import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  MdArrowBack,
  MdCloudUpload,
  MdDelete,
  MdKeyboardArrowDown,
  MdCheck,
  MdSearch,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/AddProduct.css";

const EditProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const categoryDropdownRef = useRef(null);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target)
      ) {
        setCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountPrice: "",
    discountPercent: "",
    review: "",
    onSale: false,
    stock: "",
    brand: "",
    gender: "Unisex",
    size: "",
    color: "",
    isActive: true,
  });

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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // LOAD PRODUCT + CATEGORIES

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const [productResponse, categoryResponse] =
          await Promise.all([
            api.get(`/products/${id}`),
            api.get("/categories"),
          ]);

        const product = productResponse.data.product;

        setCategories(
          categoryResponse.data.categories || []
        );

        // Multi-category extract
        let catIds = [];
        if (Array.isArray(product.categories) && product.categories.length > 0) {
          catIds = product.categories.map((c) => (c._id || c));
        } else if (product.category) {
          catIds = [product.category._id || product.category];
        }
        setSelectedCategories(catIds);

        setFormData({
          name: product.name || "",
          description: product.description || "",
          price: product.price ?? "",
          discountPrice: product.discountPrice ?? "",
          discountPercent: product.discountPercent ?? "",
          review: product.review ?? "",
          onSale: product.onSale ?? false,
          stock: product.stock ?? "",
          brand: product.brand || "",
          gender: product.gender || "Unisex",
          size: Array.isArray(product.size)
            ? product.size.join(", ")
            : product.size || "",
          color: Array.isArray(product.color)
            ? product.color.join(", ")
            : product.color || "",
          isActive: product.isActive ?? true,
        });

        setExistingImages(product.images || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to load product"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  const handleCategoryToggle = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((item) => item !== catId)
        : [...prev, catId]
    );
  };

  // INPUT CHANGE

  const handleChange = (e) => {
    const {
      name,
      value,
      type,
      checked,
    } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // NEW IMAGE SELECT

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(
      e.target.files || []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > 5) {
      toast.error(
        "You can select maximum 5 new images"
      );
      e.target.value = "";
      return;
    }

    setNewImages(selectedFiles);

    // Allows selecting same file again later
    e.target.value = "";
  };

  // REMOVE EXISTING IMAGE

  const removeExistingImage = (index) => {
    setExistingImages((prev) =>
      prev.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );

    toast.success("Image removed");
  };

  // REMOVE NEW IMAGE

  const removeNewImage = (index) => {
    setNewImages((prev) =>
      prev.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );
  };

  // SUBMIT

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.price ||
      selectedCategories.length === 0
    ) {
      toast.error(
        "Please fill all required fields and select at least 1 category"
      );
      return;
    }

    if (Number(formData.price) < 0) {
      toast.error("Price cannot be negative");
      return;
    }

    if (
      formData.discountPrice &&
      Number(formData.discountPrice) < 0
    ) {
      toast.error(
        "Discount price cannot be negative"
      );
      return;
    }

    if (Number(formData.stock) < 0) {
      toast.error("Stock cannot be negative");
      return;
    }

    try {
      setSaving(true);

      const data = new FormData();

      data.append(
        "name",
        formData.name.trim()
      );

      data.append(
        "description",
        formData.description.trim()
      );

      data.append(
        "price",
        formData.price
      );

      data.append(
        "discountPrice",
        formData.discountPrice || 0
      );

      data.append(
        "discountPercent",
        formData.discountPercent || 0
      );

      data.append(
        "review",
        formData.review || 0
      );

      data.append(
        "onSale",
        formData.onSale
      );

      selectedCategories.forEach((catId) => {
        data.append("categories", catId);
      });
      data.append("category", selectedCategories[0]);

      data.append(
        "stock",
        formData.stock || 0
      );

      data.append(
        "brand",
        formData.brand.trim()
      );

      data.append(
        "isActive",
        String(formData.isActive)
      );

      data.append(
        "gender",
        formData.gender || "Unisex"
      );

      // SIZE

      if (formData.size.trim()) {
        formData.size
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => {
            data.append("size", item);
          });
      }

      // COLOR

      if (formData.color.trim()) {
        formData.color
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => {
            data.append("color", item);
          });
      }

      // EXISTING IMAGES

      data.append(
        "existingImages",
        JSON.stringify(existingImages)
      );

      // NEW IMAGES

      newImages.forEach((image) => {
        data.append(
          "images",
          image
        );
      });

      // API

      await api.put(
        `/products/${id}`,
        data
      );

      toast.success(
        "Product updated successfully"
      );

      setTimeout(() => {
        navigate("/products");
      }, 1000);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to update product"
      );
    } finally {
      setSaving(false);
    }
  };

  // LOADING

  if (loading) {
    return (
      <div className="products-loading">
        Loading product...
      </div>
    );
  }

  // UI

  return (
    <div className="add-product-page">

      {/* HEADER */}
      <div className="add-product-header">

        <button
          type="button"
          className="back-btn"
          onClick={() =>
            navigate("/products")
          }
        >
          <MdArrowBack />
          Back
        </button>

        <div>
          <h1>Edit Product</h1>

          <p>
            Update product details
          </p>
        </div>

      </div>

      {/* FORM */}
      <form
        className="add-product-form"
        onSubmit={handleSubmit}
      >

        {/* BASIC INFORMATION */}

        <section className="form-section">

          <div className="section-title">
            <h2>
              Basic Information
            </h2>
          </div>

          <div className="form-grid">

            {/* NAME */}
            <div className="form-group full-width">

              <label>
                Product Name *
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter product name"
              />

            </div>

            {/* DESCRIPTION */}
            <div className="form-group full-width">

              <label>
                Description *
              </label>

              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter product description"
                rows="5"
              />

            </div>

            {/* PRICE */}
            <div className="form-group">

              <label>
                Price *
              </label>

              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                min="0"
                placeholder="1999"
              />

            </div>

            {/* DISCOUNT PRICE */}
            <div className="form-group">

              <label>
                Discount Price
              </label>

              <input
                type="number"
                name="discountPrice"
                value={formData.discountPrice}
                onChange={handleChange}
                min="0"
                placeholder="1499"
              />

            </div>

            {/* CATEGORIES (MULTI-SELECT DROPDOWN) */}

            <div className="form-group full-width" ref={categoryDropdownRef}>

              <label>
                Categories * (Select one or more)
              </label>

              <div className={`multiselect-container ${categoryDropdownOpen ? "open" : ""}`}>
                <div
                  className="multiselect-box"
                  onClick={() => !loading && setCategoryDropdownOpen(!categoryDropdownOpen)}
                  tabIndex={0}
                >
                  <div className="multiselect-text">
                    {loading ? (
                      <span className="multiselect-placeholder">Loading categories...</span>
                    ) : selectedCategories.length === 0 ? (
                      <span className="multiselect-placeholder">Select Categories</span>
                    ) : selectedCategories.length === 1 ? (
                      <span className="multiselect-value">
                        {categories.find((c) => c._id === selectedCategories[0])?.name || "Selected Category"}
                      </span>
                    ) : (
                      <span className="multiselect-value">
                        {categories.find((c) => c._id === selectedCategories[0])?.name}{" "}
                        <span className="multiselect-badge">+{selectedCategories.length - 1} more</span>
                      </span>
                    )}
                  </div>
                  <MdKeyboardArrowDown className={`multiselect-arrow ${categoryDropdownOpen ? "rotate" : ""}`} />
                </div>

                {categoryDropdownOpen && (
                  <div className="multiselect-dropdown">
                    <div className="multiselect-search-box" onClick={(e) => e.stopPropagation()}>
                      <MdSearch className="multiselect-search-icon" />
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearchQuery}
                        onChange={(e) => setCategorySearchQuery(e.target.value)}
                      />
                    </div>
                    {categories.length === 0 ? (
                      <div className="multiselect-empty">No categories available</div>
                    ) : (
                      <div className="multiselect-options">
                        {categories
                          .filter((cat) =>
                            cat.name
                              .toLowerCase()
                              .includes(categorySearchQuery.toLowerCase())
                          )
                          .map((cat) => {
                            const isSelected = selectedCategories.includes(cat._id);
                            return (
                              <div
                                key={cat._id}
                                className={`multiselect-option ${isSelected ? "selected" : ""}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCategoryToggle(cat._id);
                                }}
                              >
                                <div className={`multiselect-checkbox ${isSelected ? "checked" : ""}`}>
                                  {isSelected && <MdCheck />}
                                </div>
                                <span className="multiselect-option-label">{cat.name}</span>
                              </div>
                            );
                          })}
                        {categories.filter((cat) =>
                          cat.name
                            .toLowerCase()
                            .includes(categorySearchQuery.toLowerCase())
                        ).length === 0 && (
                          <div className="multiselect-empty">No matching categories found</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* STOCK */}
            <div className="form-group">

              <label>
                Stock *
              </label>

              <input
                type="number"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                min="0"
                placeholder="50"
              />

            </div>

            {/* BRAND */}
            <div className="form-group">

              <label>
                Brand
              </label>

              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Kalenji"
              />

            </div>

            {/* GENDER */}
            <div className="form-group">

              <label>
                Gender
              </label>

              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="gender-select"
              >
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Kids">Kids</option>
                <option value="Unisex">Unisex</option>
              </select>

            </div>

            {/* SIZE */}
            <div className="form-group">

              <label>
                Size
              </label>

              <input
                type="text"
                name="size"
                value={formData.size}
                onChange={handleChange}
                placeholder="S, M, L, XL"
              />

              <small>
                Separate sizes with commas
              </small>

            </div>

            {/* COLOR */}
            <div className="form-group full-width">

              <label>
                Color
              </label>

              <input
                type="text"
                name="color"
                value={formData.color}
                onChange={handleChange}
                placeholder="Black, Blue, White"
              />

              <small>
                Separate colors with commas
              </small>

            </div>

            {/* DISCOUNT PERCENT */}
            <div className="form-group">

              <label>
                Discount (%)
              </label>

              <input
                type="number"
                name="discountPercent"
                value={formData.discountPercent}
                onChange={handleChange}
                placeholder="e.g. 20"
                min="0"
                max="100"
              />

              <small>
                Enter discount percentage (0–100)
              </small>

            </div>

            {/* REVIEW */}
            <div className="form-group">

              <label>
                Review (Rating)
              </label>

              <input
                type="number"
                name="review"
                value={formData.review}
                onChange={handleChange}
                placeholder="e.g. 4.5"
                min="0"
                max="5"
                step="0.1"
              />

              <small>
                Enter rating between 0 and 5
              </small>

            </div>

            {/* ON SALE */}
            <div className="form-group">

              <label>
                On Sale
              </label>

              <div className="sale-toggle">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    name="onSale"
                    checked={formData.onSale}
                    onChange={handleChange}
                  />
                  <span className="toggle-slider"></span>
                </label>
                <span className="sale-label">
                  {formData.onSale ? "Yes" : "No"}
                </span>
              </div>

            </div>

            {/* ACTIVE */}
            <div className="form-group">

              <label className="active-checkbox">

                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />

                <span>
                  Product Active
                </span>

              </label>

            </div>

          </div>

        </section>

        {/* EXISTING IMAGES */}

        <section className="form-section">

          <div className="section-title">

            <h2>
              Existing Images
            </h2>

            <span>
              {existingImages.length} image
              {existingImages.length !== 1
                ? "s"
                : ""}
            </span>

          </div>

          {existingImages.length > 0 ? (

            <div className="image-preview-grid">

              {existingImages.map(
                (image, index) => (

                  <div
                    className="image-preview"
                    key={`${image}-${index}`}
                  >

                    <img
                      src={getImageUrl(image)}
                      alt={`Product ${index + 1}`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeExistingImage(
                          index
                        )
                      }
                      title="Remove image"
                    >
                      <MdDelete />
                    </button>

                  </div>

                )
              )}

            </div>

          ) : (

            <p className="no-existing-images">
              No existing images
            </p>

          )}

        </section>

        {/* NEW IMAGES */}

        <section className="form-section">

          <div className="section-title">

            <h2>
              Add New Images
            </h2>

            <span>
              Maximum 5 images
            </span>

          </div>

          <label className="upload-box">

            <input
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={
                handleImageChange
              }
            />

            <MdCloudUpload />

            <strong>
              Upload New Images
            </strong>

            <span>
              All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
            </span>

          </label>

          {newImages.length > 0 && (

            <div className="image-preview-grid">

              {newImages.map(
                (image, index) => (

                  <div
                    className="image-preview"
                    key={`${image.name}-${index}`}
                  >

                    <img
                      src={URL.createObjectURL(
                        image
                      )}
                      alt={`New ${index + 1}`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeNewImage(
                          index
                        )
                      }
                      title="Remove image"
                    >
                      <MdDelete />
                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* ACTIONS */}

        <div className="form-actions">

          <button
            type="button"
            className="cancel-product-btn"
            onClick={() =>
              navigate("/products")
            }
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-product-btn"
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

export default EditProduct;