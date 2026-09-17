import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

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

const AddProduct = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  const categoryDropdownRef = useRef(null);
  const [images, setImages] = useState([]);

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
    stock: "",
    brand: "",
    gender: "Unisex",
    size: "",
    color: "",
    review: "",
    onSale: false,
  });

  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(true);

  // ========================================
  // GET CATEGORIES
  // ========================================

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get("/categories");

        setCategories(response.data.categories || []);
      } catch (error) {
        toast.error(
          error.response?.data?.message ||
            "Failed to load categories"
        );
      } finally {
        setCategoryLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // CATEGORY TOGGLE
  const handleCategoryToggle = (catId) => {
    setSelectedCategories((prev) =>
      prev.includes(catId)
        ? prev.filter((id) => id !== catId)
        : [...prev, catId]
    );
  };

  // ========================================
  // INPUT CHANGE
  // ========================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ========================================
  // IMAGE SELECT
  // ========================================

  const handleImageChange = (e) => {
    const selectedFiles = Array.from(
      e.target.files || []
    );

    if (selectedFiles.length === 0) {
      return;
    }

    if (selectedFiles.length > 5) {
      toast.error(
        "You can upload maximum 5 images"
      );

      e.target.value = "";
      return;
    }

    setImages(selectedFiles);

    e.target.value = "";
  };

  // ========================================
  // REMOVE IMAGE
  // ========================================

  const removeImage = (index) => {
    setImages((prev) =>
      prev.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );

    toast.success("Image removed");
  };

  // ========================================
  // SUBMIT
  // ========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Required fields
    if (
      !formData.name.trim() ||
      !formData.description.trim() ||
      !formData.price ||
      selectedCategories.length === 0 ||
      !formData.stock
    ) {
      toast.error(
        "Please fill all required fields and select at least 1 category"
      );
      return;
    }

    // Price validation
    if (Number(formData.price) < 0) {
      toast.error(
        "Price cannot be negative"
      );
      return;
    }

    // Discount validation
    if (
      formData.discountPrice &&
      Number(formData.discountPrice) < 0
    ) {
      toast.error(
        "Discount price cannot be negative"
      );
      return;
    }

    // Discount should not exceed price
    if (
      formData.discountPrice &&
      Number(formData.discountPrice) >
        Number(formData.price)
    ) {
      toast.error(
        "Discount price cannot be greater than price"
      );
      return;
    }

    // Stock validation
    if (Number(formData.stock) < 0) {
      toast.error(
        "Stock cannot be negative"
      );
      return;
    }

    // Image required
    if (images.length === 0) {
      toast.error(
        "Please select at least one product image"
      );
      return;
    }

    try {
      setLoading(true);

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

      selectedCategories.forEach((catId) => {
        data.append("categories", catId);
      });
      data.append("category", selectedCategories[0]);

      data.append(
        "stock",
        formData.stock
      );

      data.append(
        "brand",
        formData.brand.trim()
      );

      data.append(
        "gender",
        formData.gender || "Unisex"
      );

      // ========================================
      // SIZE
      // ========================================

      if (formData.size.trim()) {
        formData.size
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => {
            data.append(
              "size",
              item
            );
          });
      }

      // ========================================
      // COLOR
      // ========================================

      if (formData.color.trim()) {
        formData.color
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .forEach((item) => {
            data.append(
              "color",
              item
            );
          });
      }

      // ========================================
      // IMAGES
      // ========================================

      images.forEach((image) => {
        data.append(
          "images",
          image
        );
      });

      // ========================================
      // DISCOUNT PERCENT, REVIEW, ON SALE
      // ========================================

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

      // ========================================
      // API REQUEST
      // ========================================

      await api.post(
        "/products",
        data
      );

      toast.success(
        "Product added successfully"
      );

      // Reset form
      setFormData({
        name: "",
        description: "",
        price: "",
        discountPrice: "",
        discountPercent: "",
        category: "",
        stock: "",
        brand: "",
        gender: "Unisex",
        size: "",
        color: "",
        review: "",
        onSale: false,
      });

      setImages([]);

      // Redirect
      setTimeout(() => {
        navigate("/products");
      }, 1000);

    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to add product"
      );
    } finally {
      setLoading(false);
    }
  };

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
          <h1>Add Product</h1>

          <p>
            Create a new product
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

            {/* PRODUCT NAME */}

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
                placeholder="1999"
                min="0"
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
                placeholder="1499"
                min="0"
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
                  onClick={() => !categoryLoading && setCategoryDropdownOpen(!categoryDropdownOpen)}
                  tabIndex={0}
                >
                  <div className="multiselect-text">
                    {categoryLoading ? (
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
                placeholder="50"
                min="0"
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
                placeholder="6, 7, 8, 9"
              />

              <small>
                Enter sizes separated by commas
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
                placeholder="Black, Blue"
              />

              <small>
                Enter colors separated by commas
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

          </div>

        </section>

        {/* PRODUCT IMAGES */}

        <section className="form-section">

          <div className="section-title">

            <h2>
              Product Images
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
              onChange={
                handleImageChange
              }
              hidden
            />

            <MdCloudUpload />

            <strong>
              Upload Product Images
            </strong>

            <span>
              All image types supported (JPG, PNG, WEBP, SVG, AVIF, GIF, etc.)
            </span>

          </label>

          {images.length > 0 && (

            <div className="image-preview-grid">

              {images.map(
                (image, index) => (

                  <div
                    className="image-preview"
                    key={`${image.name}-${index}`}
                  >

                    <img
                      src={URL.createObjectURL(
                        image
                      )}
                      alt={`Preview ${index + 1}`}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(index)
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
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="save-product-btn"
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : "Save Product"}
          </button>

        </div>

      </form>

    </div>
  );
};

export default AddProduct;