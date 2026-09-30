import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  MdArrowBack,
  MdEdit,
  MdCheckCircle,
  MdCancel,
  MdCategory,
  MdInventory2,
  MdLocalOffer,
  MdStar,
  MdLayers,
  MdOutlineImageNotSupported,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../../api/axios";
import "../../styles/ViewProduct.css";

const ViewProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const getProductImageUrl = (image) => {
    if (!image) return "";
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

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        toast.error("Product ID missing");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/products/${id}`);
        setProduct(response.data.product || null);
      } catch (error) {
        console.error("Failed to fetch product:", error);
        toast.error(
          error.response?.data?.message || "Failed to load product details"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="view-product-page">
        <div className="view-product-loading">
          <div className="view-product-spinner" />
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="view-product-page">
        <div className="view-product-empty">
          <MdOutlineImageNotSupported className="empty-icon" />
          <h2>Product Not Found</h2>
          <p>The product you are looking for does not exist or has been removed.</p>
          <button
            type="button"
            className="back-to-products-btn"
            onClick={() => navigate("/products")}
          >
            <MdArrowBack /> Back to Products
          </button>
        </div>
      </div>
    );
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const currentImage = images[activeImageIndex] || images[0];

  const primaryCategoryName =
    product.category?.name ||
    (typeof product.category === "string" ? product.category : "");

  const allCategories = Array.isArray(product.categories)
    ? product.categories.map((c) => (c?.name ? c.name : String(c)))
    : primaryCategoryName
    ? [primaryCategoryName]
    : [];

  const sizes = Array.isArray(product.size)
    ? product.size
    : typeof product.size === "string" && product.size.trim()
    ? product.size.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const colors = Array.isArray(product.color)
    ? product.color
    : typeof product.color === "string" && product.color.trim()
    ? product.color.split(",").map((c) => c.trim()).filter(Boolean)
    : [];

  const stockNumber = Number(product.stock ?? 0);
  const isOutOfStock = stockNumber <= 0;
  const isLowStock = stockNumber > 0 && stockNumber <= 5;

  return (
    <div className="view-product-page">
      {/* Top Action Header */}
      <div className="view-product-header">
        <button
          type="button"
          className="view-product-back-btn"
          onClick={() => navigate("/products")}
          title="Back to Products"
        >
          <MdArrowBack />
          <span>Back to Products</span>
        </button>

        <div className="view-product-header-actions">
          <button
            type="button"
            className="view-product-edit-btn"
            onClick={() => navigate(`/products/edit/${product._id}`)}
          >
            <MdEdit />
            <span>Edit Product</span>
          </button>
        </div>
      </div>

      {/* Main Product Card */}
      <div className="view-product-container">
        {/* Left Side: Images Gallery */}
        <div className="view-product-media">
          <div className="view-product-main-image-wrapper">
            {currentImage ? (
              <img
                src={getProductImageUrl(currentImage)}
                alt={product.name}
                className="view-product-main-image"
              />
            ) : (
              <div className="view-product-no-image">
                <MdOutlineImageNotSupported />
                <span>No Image Available</span>
              </div>
            )}

            <div className="view-product-media-badges">
              <span
                className={`view-status-badge ${
                  product.isActive ? "active" : "inactive"
                }`}
              >
                {product.isActive ? (
                  <>
                    <MdCheckCircle /> Active
                  </>
                ) : (
                  <>
                    <MdCancel /> Inactive
                  </>
                )}
              </span>

              {product.onSale && (
                <span className="view-sale-badge">
                  <MdLocalOffer /> On Sale
                </span>
              )}
            </div>
          </div>

          {images.length > 1 && (
            <div className="view-product-thumbnails">
              {images.map((img, idx) => (
                <button
                  type="button"
                  key={`thumb-${idx}`}
                  className={`view-product-thumbnail-btn ${
                    idx === activeImageIndex ? "active" : ""
                  }`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <img src={getProductImageUrl(img)} alt={`Thumbnail ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="view-product-details">
          {/* Brand & Subcategory Breadcrumb */}
          <div className="view-product-meta-top">
            <span className="view-product-brand">
              {product.brand || "Decathlon"}
            </span>
            {product.gender && (
              <span className="view-product-gender-badge">{product.gender}</span>
            )}
            {product.subcategory && (
              <span className="view-product-subcategory-badge">
                {product.subcategory}
              </span>
            )}
          </div>

          <h1 className="view-product-title">{product.name}</h1>

          {/* Rating */}
          {(product.review != null || product.averageRating != null) && (
            <div className="view-product-rating">
              <div className="rating-pill">
                <MdStar />
                <span>{product.review || product.averageRating || "4.5"}</span>
              </div>
              <span className="rating-count">Customer Reviews</span>
            </div>
          )}

          {/* Pricing Box */}
          <div className="view-product-price-box">
            {product.discountPrice > 0 && product.discountPrice < product.price ? (
              <div className="price-row">
                <div className="price-main">
                  <span className="currency">₹</span>
                  <span className="amount">{product.discountPrice}</span>
                </div>
                <div className="price-original">
                  <span className="original-label">MRP</span>
                  <span className="original-amount">₹{product.price}</span>
                </div>
                {product.discountPercent > 0 && (
                  <span className="discount-tag">
                    {product.discountPercent}% OFF
                  </span>
                )}
              </div>
            ) : (
              <div className="price-row">
                <div className="price-main">
                  <span className="currency">₹</span>
                  <span className="amount">{product.price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="view-product-stats-grid">
            <div className="stat-card">
              <div className="stat-icon stock-icon">
                <MdInventory2 />
              </div>
              <div className="stat-info">
                <span className="stat-label">Stock Status</span>
                <span
                  className={`stat-value ${
                    isOutOfStock
                      ? "stock-out"
                      : isLowStock
                      ? "stock-low"
                      : "stock-in"
                  }`}
                >
                  {isOutOfStock
                    ? "Out of Stock (0)"
                    : `${stockNumber} Units ${isLowStock ? "(Low Stock)" : "Available"}`}
                </span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon category-icon">
                <MdCategory />
              </div>
              <div className="stat-info">
                <span className="stat-label">Primary Category</span>
                <span className="stat-value">
                  {primaryCategoryName || "General"}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="view-product-section">
            <h3 className="section-title">Description</h3>
            <p className="section-text">
              {product.description || "No description provided for this product."}
            </p>
          </div>

          {/* Categories List */}
          {allCategories.length > 0 && (
            <div className="view-product-section">
              <h3 className="section-title">Categories</h3>
              <div className="tags-container">
                {allCategories.map((cat, idx) => (
                  <span key={`cat-${idx}`} className="category-pill">
                    <MdLayers /> {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="view-product-section">
              <h3 className="section-title">Available Sizes</h3>
              <div className="tags-container">
                {sizes.map((s, idx) => (
                  <span key={`size-${idx}`} className="size-pill">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Colors */}
          {colors.length > 0 && (
            <div className="view-product-section">
              <h3 className="section-title">Available Colors</h3>
              <div className="tags-container">
                {colors.map((c, idx) => (
                  <span key={`color-${idx}`} className="color-pill">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata Footer */}
          <div className="view-product-footer-meta">
            <span>Product ID: <code>{product._id}</code></span>
            {product.createdAt && (
              <span>
                Added on: {new Date(product.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;
