import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiUploadCloud,
  FiX,
  FiRefreshCw,
  FiShoppingCart,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";
import { MdAutoAwesome, MdFavorite, MdFavoriteBorder } from "react-icons/md";
import api, { useWishlist } from "../../api/axios";
import ProductSizeModal from "../ProductSizeModal";
import "./VisualSearchModal.css";

const SAMPLE_SEARCHES = [
  {
    label: "Running Shoes",
    icon: "👟",
    url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80",
  },
  {
    label: "Bicycle",
    icon: "🚲",
    url: "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=400&q=80",
  },
  {
    label: "Camping Tent",
    icon: "⛺",
    url: "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=400&q=80",
  },
  {
    label: "Gym T-Shirt",
    icon: "👕",
    url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&q=80",
  },
];

const VisualSearchModal = ({ isOpen, onClose }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [selectedProductForModal, setSelectedProductForModal] = useState(null);
  const fileInputRef = useRef(null);
  const { isWishlisted, handleToggle } = useWishlist();

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setPreviewUrl(null);
      setIsAnalyzing(false);
      setResults(null);
      setError(null);
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getImageUrl = (image) => {
    if (!image) return "https://via.placeholder.com/300x300?text=Decathlon";
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPG, PNG, or WEBP).");
      return;
    }
    setError(null);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    runVisualSearch(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSampleClick = async (sample) => {
    try {
      setIsAnalyzing(true);
      setError(null);
      setPreviewUrl(sample.url);

      // Fetch sample image and convert to File
      const res = await fetch(sample.url);
      const blob = await res.blob();
      const file = new File([blob], `${sample.label.toLowerCase().replace(/\s+/g, "_")}.jpg`, {
        type: "image/jpeg",
      });
      runVisualSearch(file);
    } catch {
      setError("Failed to load sample image. Please try uploading your own photo.");
      setIsAnalyzing(false);
    }
  };

  const runVisualSearch = async (file) => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const formData = new FormData();
      formData.append("image", file);

      const res = await api.post("/products/visual-search", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        setResults(res.data);
      } else {
        setError(res.data?.message || "Visual search did not return matches.");
      }
    } catch (err) {
      console.error("Visual search request error:", err);
      setError(err.response?.data?.message || "Could not analyze image. Please try another photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setPreviewUrl(null);
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="visual-search-backdrop" onClick={onClose}>
      <div
        className="visual-search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visual-search-title"
      >
        {/* Header */}
        <div className="visual-search-header">
          <div className="visual-search-header-left">
            <div className="visual-search-icon-badge">
              <MdAutoAwesome size={18} />
            </div>
            <div>
              <h2 id="visual-search-title" className="visual-search-title">
                AI Visual Product Search
              </h2>
              <p className="visual-search-subtitle">
                Upload or drop any sports gear photo to find visually similar items in our catalog
              </p>
            </div>
          </div>
          <button
            type="button"
            className="visual-search-close-btn"
            onClick={onClose}
            aria-label="Close visual search"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="visual-search-body">
          {/* UPLOAD VIEW (When no results yet) */}
          {!previewUrl && !isAnalyzing && (
            <div className="visual-search-upload-view">
              <div
                className="visual-search-dropzone"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
                <div className="dropzone-icon-circle">
                  <FiUploadCloud size={32} />
                </div>
                <h3 className="dropzone-heading">Drop your product photo here</h3>
                <p className="dropzone-subheading">
                  or <span className="dropzone-browse-link">browse files</span> from your computer
                  or phone
                </p>
                <div className="dropzone-formats">Supports JPG, PNG, WEBP (Up to 10MB)</div>
              </div>

              {/* Sample Quick Searches */}
              <div className="visual-search-samples">
                <span className="samples-label">Don't have a photo? Try these:</span>
                <div className="samples-grid">
                  {SAMPLE_SEARCHES.map((sample) => (
                    <button
                      key={sample.label}
                      type="button"
                      className="sample-chip"
                      onClick={() => handleSampleClick(sample)}
                    >
                      <span className="sample-emoji">{sample.icon}</span>
                      <span>{sample.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ANALYZING VIEW */}
          {isAnalyzing && (
            <div className="visual-search-analyzing-view">
              <div className="scanning-container">
                {previewUrl && (
                  <img src={previewUrl} alt="Analyzing gear" className="scanning-image-preview" />
                )}
                <div className="scanning-laser-beam"></div>
              </div>
              <div className="analyzing-text-wrap">
                <div className="analyzing-spinner"></div>
                <h3 className="analyzing-title">AI Analyzing Visual Characteristics...</h3>
                <p className="analyzing-subtitle">
                  Identifying product category, silhouette, colors, and matching sports gear
                </p>
              </div>
            </div>
          )}

          {/* RESULTS VIEW */}
          {results && !isAnalyzing && (
            <div className="visual-search-results-view">
              {/* Summary Bar */}
              <div className="visual-search-summary-bar">
                <div className="summary-left">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Uploaded item"
                      className="summary-thumb"
                    />
                  )}
                  <div className="summary-info">
                    <div className="summary-headline">
                      {results.visualAnalysis?.isProduct === false ? (
                        <FiInfo className="check-icon" style={{ color: "#d97706" }} />
                      ) : (
                        <FiCheckCircle className="check-icon" />
                      )}
                      <span>
                        {results.visualAnalysis?.isProduct === false
                          ? `Identified: ${results.visualAnalysis.productType}`
                          : `Found ${results.products?.length || 0} visually similar products`}
                      </span>
                    </div>
                    {results.visualAnalysis && (
                      <div className="summary-tags">
                        {results.visualAnalysis.productType && (
                          <span className="tag-pill category">
                            {results.visualAnalysis.productType}
                          </span>
                        )}
                        {results.visualAnalysis.sport && results.visualAnalysis.sport !== "None" && (
                          <span className="tag-pill sport">
                            {results.visualAnalysis.sport}
                          </span>
                        )}
                        {results.visualAnalysis.colors?.slice(0, 2).map((col) => (
                          <span key={col} className="tag-pill color">
                            🎨 {col}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  className="search-another-btn"
                  onClick={handleReset}
                >
                  <FiRefreshCw size={14} />
                  <span>Search Another Photo</span>
                </button>
              </div>

              {/* Informational Guidance Notice if photo is not a sports product */}
              {results.visualAnalysis?.userNotice && (
                <div className="visual-notice-banner">
                  <FiInfo size={16} className="notice-icon" />
                  <span>{results.visualAnalysis.userNotice}</span>
                </div>
              )}

              {/* Products Grid */}
              <div className="visual-search-grid">
                {results.products?.map((prod) => {
                  const primaryImage =
                    Array.isArray(prod.images) && prod.images.length > 0
                      ? prod.images[0]
                      : prod.image || "/placeholder.png";

                  const effectivePrice = prod.discountPrice || prod.price;
                  const originalPrice = prod.price;
                  const hasDiscount = prod.discountPrice && prod.discountPrice < prod.price;
                  const discountPercent =
                    hasDiscount && originalPrice > 0
                      ? Math.round(((originalPrice - prod.discountPrice) / originalPrice) * 100)
                      : 0;

                  const wishlisted = isWishlisted(prod._id);
                  const isReal = results.visualAnalysis?.isProduct !== false;

                  return (
                    <div key={prod._id} className="visual-product-card">
                      {/* Match Badge */}
                      {prod.visualMatchPercentage && (
                        <div className={`visual-match-pill ${isReal ? "" : "color-match-pill"}`}>
                          <MdAutoAwesome size={11} />
                          <span>
                            {isReal
                              ? `${prod.visualMatchPercentage}% Match`
                              : `${prod.visualMatchPercentage}% Color Match`}
                          </span>
                        </div>
                      )}

                      {/* Wishlist Button */}
                      <button
                        type="button"
                        className={`visual-card-wishlist-btn ${wishlisted ? "active" : ""}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggle(prod);
                        }}
                        title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                      >
                        {wishlisted ? (
                          <MdFavorite className="wishlist-filled-icon" />
                        ) : (
                          <MdFavoriteBorder className="wishlist-outline-icon" />
                        )}
                      </button>

                      <Link
                        to={`/product/${prod._id}`}
                        onClick={onClose}
                        className="visual-product-link"
                      >
                        <div className="visual-img-box">
                          <img
                            src={getImageUrl(primaryImage)}
                            alt={prod.name}
                            className="visual-product-img"
                            loading="lazy"
                          />
                          {discountPercent > 0 && (
                            <span className="visual-discount-pill">
                              {discountPercent}% OFF
                            </span>
                          )}
                        </div>

                        <div className="visual-details">
                          {prod.brand && (
                            <span className="visual-brand">{prod.brand}</span>
                          )}
                          <h4 className="visual-name" title={prod.name}>
                            {prod.name}
                          </h4>

                          <div className="visual-price-row">
                            <span className="visual-effective-price">
                              ₹{Number(effectivePrice).toLocaleString("en-IN")}
                            </span>
                            {hasDiscount && (
                              <span className="visual-original-price">
                                ₹{Number(originalPrice).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>

                      {/* Card Footer Quick Actions */}
                      <div className="visual-card-actions">
                        <button
                          type="button"
                          className="visual-quick-add-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedProductForModal(prod);
                          }}
                        >
                          <FiShoppingCart size={13} />
                          <span>Quick Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="visual-search-error">
              <p>{error}</p>
              <button
                type="button"
                className="error-retry-btn"
                onClick={handleReset}
              >
                Try Another Photo
              </button>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="visual-search-footer">
          <span>Powered by Decathlon AI Vision & Visual Similarity Engine</span>
        </div>
      </div>

      {/* Product Size Modal for Quick Add */}
      {selectedProductForModal && (
        <ProductSizeModal
          product={selectedProductForModal}
          onClose={() => setSelectedProductForModal(null)}
        />
      )}
    </div>
  );
};

export default VisualSearchModal;
