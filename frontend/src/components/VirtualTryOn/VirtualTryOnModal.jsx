import React, { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiUploadCloud,
  FiUser,
  FiCheck,
  FiRefreshCw,
  FiDownload,
  FiShoppingBag,
  FiInfo,
  FiEye,
  FiAlertCircle,
} from "react-icons/fi";
import { MdAutoAwesome } from "react-icons/md";
import toast from "react-hot-toast";
import api from "../../api/axios";
import DecathlonLogo from "../DecathlonLogo";
import "./VirtualTryOnModal.css";

const FALLBACK_PRESETS = [
  {
    id: 0,
    label: "Male Model (Athletic Standing)",
    gender: "male",
    sampleIndex: 0,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999501/decathlon/models/vwrytbqb1twoo2zw1has.jpg",
  },
  {
    id: 1,
    label: "Female Model (Decathlon Standing)",
    gender: "female",
    sampleIndex: 1,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999499/decathlon/models/ht03hdxzyauxhpygqwic.jpg",
  },
  {
    id: 2,
    label: "Female Model (Sportswear Standing)",
    gender: "female",
    sampleIndex: 2,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794999640/decathlon/models/fajani6cccs7qebmrb5e.jpg",
  },
  {
    id: 3,
    label: "Male Model (Athletic Runner)",
    gender: "male",
    sampleIndex: 3,
    previewUrl:
      "https://res.cloudinary.com/k08sqqki/image/upload/v1794996405/decathlon/models/x3r25h83smfzt6r4erzf.jpg",
  },
];

export default function VirtualTryOnModal({
  isOpen,
  onClose,
  product,
  selectedGarmentImage,
  selectedColor,
  onAddToCart,
}) {
  const [activeTab, setActiveTab] = useState("presets"); // "presets" | "upload"
  const [genderFilter, setGenderFilter] = useState("all"); // "all" | "male" | "female"
  const [presetModels, setPresetModels] = useState(FALLBACK_PRESETS);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);

  const [userFile, setUserFile] = useState(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState(null);

  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resultImageUrl, setResultImageUrl] = useState(null);
  const [geminiAdvice, setGeminiAdvice] = useState(null);
  const [viewMode, setViewMode] = useState("fitted"); // "fitted" | "split"
  const [generationError, setGenerationError] = useState(null);

  const fileInputRef = useRef(null);

  // Fetch preset models and credit balance when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Fetch Decathlon models
    api
      .get("/try-on/models")
      .then((res) => {
        if (
          res.data?.success &&
          Array.isArray(res.data.models) &&
          res.data.models.length > 0
        ) {
          setPresetModels(res.data.models);
          setSelectedPresetIndex(res.data.models[0].sampleIndex);
        }
      })
      .catch((err) => {
        console.warn("Using fallback presets:", err.message);
      });

    // Fetch Genlook API credit balance
    api
      .get("/try-on/credits")
      .then((res) => {
        if (res.data?.success && typeof res.data.credits === "number") {
          setCredits(res.data.credits);
        }
      })
      .catch((err) => {
        console.warn("Credits check error:", err.message);
      });
  }, [isOpen]);

  // Loading step progression
  useEffect(() => {
    let timer;
    if (loading) {
      setLoadingStep(1);
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < 3 ? prev + 1 : prev));
      }, 4000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(timer);
  }, [loading]);

  if (!isOpen) return null;

  const handleFileSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    setUserFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUserPreviewUrl(objectUrl);
    setGenerationError(null);
  };

  const handleGenerate = async () => {
    // Prevent duplicate calls if already loading
    if (loading) return;

    // Check credits before making API call
    if (credits !== null && credits <= 0) {
      toast.error(
        "Genlook Virtual Try-On credits are exhausted. Please contact support."
      );
      return;
    }

    try {
      setLoading(true);
      setGenerationError(null);
      const formData = new FormData();

      // Pass exact active product and variant image
      const activeGarmentUrl =
        selectedGarmentImage || product?.images?.[0] || product?.image || "";

      if (!activeGarmentUrl) {
        toast.error("Garment image is missing. Please select a product.");
        setLoading(false);
        return;
      }

      if (product?._id) {
        formData.append("productId", product._id);
      }

      const garmentDescription = `${product?.name || "Decathlon Sportswear"}${
        selectedColor ? ` (${selectedColor})` : ""
      }`;
      formData.append("garmentDescription", garmentDescription);
      formData.append("garmentImageUrl", activeGarmentUrl);

      // Pass person source (preset model or uploaded photo)
      if (activeTab === "presets") {
        formData.append("presetModelIndex", selectedPresetIndex);
      } else {
        if (!userFile) {
          toast.error("Please select a photo first!");
          setLoading(false);
          return;
        }
        formData.append("userImage", userFile);
      }

      const res = await api.post("/try-on/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.resultImageUrl) {
        setResultImageUrl(res.data.resultImageUrl);
        setGeminiAdvice(res.data.geminiAdvice || null);
        if (typeof res.data?.creditsRemaining === "number") {
          setCredits(res.data.creditsRemaining);
        }
        toast.success("Fitting completed with Genlook AI!");
      } else {
        throw new Error(res.data?.message || "Generation failed");
      }
    } catch (err) {
      console.error("Try-on error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Virtual try-on failed. Ensure photo is clear and front-facing.";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!resultImageUrl) return;
    const a = document.createElement("a");
    a.href = resultImageUrl;
    a.download = `decathlon-tryon-${product?.name || "garment"}.jpg`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const stepMessages = [
    "",
    "Genlook AI: Detecting body posture & dimensions...",
    "Aligning exact garment patterns, logos & seams...",
    "Rendering photorealistic fabric folds & lighting...",
  ];

  const filteredPresets = presetModels.filter((m) => {
    if (genderFilter === "all") return true;
    return m.gender === genderFilter;
  });

  const activeGarmentUrl =
    selectedGarmentImage || product?.images?.[0] || product?.image || "";
  const productPrice = product?.price || product?.finalPrice || 0;
  const categoryName =
    typeof product?.category === "object"
      ? product?.category?.name
      : typeof product?.category === "string"
      ? product?.category
      : "";
  const brandName =
    typeof product?.brand === "object"
      ? product?.brand?.name
      : typeof product?.brand === "string" && product?.brand.trim()
      ? product?.brand
      : "QUECHUA";

  return (
    <div className="vton-overlay" onClick={onClose}>
      <div className="vton-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vton-header">
          <div className="vton-header-brand">
            <DecathlonLogo color="#ffffff" height={22} />
            <div className="vton-header-divider" />
            <div className="vton-title-group">
              <h2>Decathlon Fitting Room</h2>
              <span className="vton-badge">GENLOOK AI</span>
            </div>
          </div>
          <div className="vton-header-actions">
            {credits !== null && (
              <span
                className={`vton-credits-badge ${
                  credits <= 2 ? "low-credits" : ""
                }`}
                title="Available Genlook Virtual Try-On Credits"
              >
                <MdAutoAwesome />
                {credits} {credits === 1 ? "credit" : "credits"} left
              </span>
            )}
            <button
              className="vton-close-btn"
              onClick={onClose}
              aria-label="Close fitting room"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="vton-body">
          {/* Active Product Banner */}
          {product && (
            <div className="vton-product-strip">
              {activeGarmentUrl && (
                <img
                  src={activeGarmentUrl}
                  alt={product.name}
                  className="vton-product-img"
                />
              )}
              <div className="vton-product-info">
                <div className="vton-product-tags">
                  <span className="vton-brand-pill">{brandName}</span>
                  {categoryName && (
                    <span className="vton-category-pill">{categoryName}</span>
                  )}
                  {selectedColor && (
                    <span className="vton-color-pill">
                      Color: <b>{selectedColor}</b>
                    </span>
                  )}
                </div>
                <h3>{product.name}</h3>
                <span className="vton-product-fit-note">
                  Powered by Genlook AI • Preserves exact fabric texture, logos,
                  and authentic drape
                </span>
              </div>
              {productPrice > 0 && (
                <div className="vton-product-price-box">
                  <span className="vton-price-label">Price</span>
                  <span className="vton-price-val">
                    ₹{productPrice.toLocaleString("en-IN")}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Credits Exhausted Warning */}
          {credits === 0 && !loading && !resultImageUrl && (
            <div className="vton-credits-alert">
              <FiAlertCircle className="vton-alert-icon" />
              <div>
                <strong>Try-On Credits Exhausted:</strong> You have reached your
                Genlook free credit limit. Please contact support or replenish
                credits on your Genlook dashboard.
              </div>
            </div>
          )}

          {/* Generation Error Display */}
          {generationError && !loading && !resultImageUrl && (
            <div className="vton-error-banner">
              <FiAlertCircle className="vton-alert-icon" />
              <div className="vton-error-text">
                <strong>Try-On Failed:</strong> {generationError}
              </div>
            </div>
          )}

          {/* Loading Screen */}
          {loading && (
            <div className="vton-loading-container">
              <div className="vton-loader-halo">
                <div className="vton-spinner" />
                <MdAutoAwesome className="vton-loader-sparkle" />
              </div>
              <div className="vton-loading-title">Fitting Your Garment</div>
              <div className="vton-loading-step">
                {stepMessages[loadingStep]}
              </div>
              <div className="vton-progress-bar">
                <div className={`vton-progress-fill step-${loadingStep}`} />
              </div>
              <div className="vton-loading-note">
                Powered by Genlook AI & Decathlon Fitting Engine. Typically takes
                8–12 seconds.
              </div>
            </div>
          )}

          {/* Results Screen */}
          {!loading && resultImageUrl && (
            <div className="vton-result-layout">
              {/* Top View Toggle */}
              <div className="vton-view-toggle">
                <button
                  type="button"
                  className={`vton-view-btn ${
                    viewMode === "fitted" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("fitted")}
                >
                  <MdAutoAwesome /> Fitted View
                </button>
                <button
                  type="button"
                  className={`vton-view-btn ${
                    viewMode === "split" ? "active" : ""
                  }`}
                  onClick={() => setViewMode("split")}
                >
                  <FiEye /> Compare with Garment
                </button>
              </div>

              {/* Image Preview Container */}
              <div
                className={`vton-result-display-grid ${
                  viewMode === "split" ? "split" : "single"
                }`}
              >
                {viewMode === "split" && (
                  <div className="vton-garment-original-card">
                    <span className="vton-card-floating-badge garment">
                      Catalog Reference ({selectedColor || "Original"})
                    </span>
                    <img
                      src={activeGarmentUrl}
                      alt="Product garment"
                      className="vton-compare-img"
                    />
                    <div className="vton-compare-caption">
                      {product?.name}
                      {selectedColor ? ` • ${selectedColor}` : ""}
                    </div>
                  </div>
                )}

                <div className="vton-result-card">
                  <span className="vton-card-floating-badge fitted">
                    <MdAutoAwesome /> Decathlon AI Fit
                  </span>
                  <img
                    src={resultImageUrl}
                    alt="Virtual try-on result"
                    className="vton-result-img"
                  />
                  <div className="vton-fit-verdict-banner">
                    <FiCheck /> <b>Authentic Garment Match</b>: Exact product
                    colors, logo, and proportions preserved
                  </div>
                </div>
              </div>

              {/* Gemini AI Fit & Styling Insights */}
              {geminiAdvice && (
                <div className="vton-gemini-card">
                  <div className="vton-gemini-header">
                    <MdAutoAwesome className="vton-gemini-sparkle" />
                    <span>
                      Decathlon AI Fit & Style Insights (Google Gemini)
                    </span>
                  </div>
                  <p className="vton-gemini-text">{geminiAdvice}</p>
                </div>
              )}
            </div>
          )}

          {/* Selector & Upload Screen */}
          {!loading && !resultImageUrl && (
            <>
              {/* Tab Selector */}
              <div className="vton-tabs">
                <button
                  type="button"
                  className={`vton-tab-btn ${
                    activeTab === "presets" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("presets")}
                >
                  <FiUser /> Decathlon Models
                </button>
                <button
                  type="button"
                  className={`vton-tab-btn ${
                    activeTab === "upload" ? "active" : ""
                  }`}
                  onClick={() => setActiveTab("upload")}
                >
                  <FiUploadCloud /> Upload Your Photo
                </button>
              </div>

              {/* Tab 1: Presets */}
              {activeTab === "presets" && (
                <div className="vton-presets-wrapper">
                  {/* Gender Filter Pills */}
                  <div className="vton-filter-pills">
                    <button
                      type="button"
                      className={`vton-filter-pill ${
                        genderFilter === "all" ? "active" : ""
                      }`}
                      onClick={() => setGenderFilter("all")}
                    >
                      All Models
                    </button>
                    <button
                      type="button"
                      className={`vton-filter-pill ${
                        genderFilter === "male" ? "active" : ""
                      }`}
                      onClick={() => setGenderFilter("male")}
                    >
                      Men
                    </button>
                    <button
                      type="button"
                      className={`vton-filter-pill ${
                        genderFilter === "female" ? "active" : ""
                      }`}
                      onClick={() => setGenderFilter("female")}
                    >
                      Women
                    </button>
                  </div>

                  {/* Presets Grid */}
                  <div className="vton-presets-grid">
                    {filteredPresets.map((m) => {
                      const isSelected = selectedPresetIndex === m.sampleIndex;
                      return (
                        <div
                          key={m.id}
                          className={`vton-preset-card ${
                            isSelected ? "selected" : ""
                          }`}
                          onClick={() => setSelectedPresetIndex(m.sampleIndex)}
                        >
                          {isSelected && (
                            <div className="vton-selected-check">
                              <FiCheck />
                            </div>
                          )}
                          <img
                            src={m.previewUrl}
                            alt={m.label}
                            className="vton-preset-img"
                          />
                          <div className="vton-preset-meta">
                            <span className="vton-preset-label">
                              {m.label.split("(")[0].trim()}
                            </span>
                            <span className="vton-preset-badge">
                              {m.gender === "male" ? "Men" : "Women"} •{" "}
                              {m.label.split("(")[1]?.replace(")", "") ||
                                "Athletic"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab 2: Upload Photo */}
              {activeTab === "upload" && (
                <div className="vton-upload-wrapper">
                  {!userPreviewUrl ? (
                    <div
                      className="vton-upload-zone"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files?.[0]) {
                          handleFileSelect(e.dataTransfer.files[0]);
                        }
                      }}
                    >
                      <div className="vton-upload-halo">
                        <FiUploadCloud className="vton-upload-icon" />
                      </div>
                      <div className="vton-upload-text">
                        Upload a full-body or half-body photo
                      </div>
                      <div className="vton-upload-subtext">
                        Drag and drop your photo here, or click to browse (JPG,
                        PNG, WEBP)
                      </div>
                    </div>
                  ) : (
                    <div className="vton-preview-box">
                      <img
                        src={userPreviewUrl}
                        alt="Your upload"
                        className="vton-preview-img"
                      />
                      <button
                        type="button"
                        className="vton-change-photo-btn"
                        onClick={() => {
                          setUserFile(null);
                          setUserPreviewUrl(null);
                          setGenerationError(null);
                        }}
                      >
                        <FiX /> Change Photo
                      </button>
                    </div>
                  )}

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {/* Photo Tips */}
                  <div className="vton-guidelines">
                    <FiInfo className="vton-guidelines-icon" />
                    <div>
                      <strong>Tips for optimal fit:</strong> Stand straight
                      facing the camera in good lighting. For tops, make sure
                      shoulders are visible; for pants/shorts, ensure full lower
                      body is in frame.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Sticky Modal Footer */}
        <div className="vton-footer">
          {!resultImageUrl ? (
            <button
              type="button"
              className="vton-submit-btn"
              disabled={
                loading ||
                (activeTab === "upload" && !userFile) ||
                credits === 0
              }
              onClick={handleGenerate}
            >
              <MdAutoAwesome />
              {activeTab === "presets"
                ? "Try On Selected Model"
                : "Try On My Photo"}
            </button>
          ) : (
            <div className="vton-result-actions">
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={() => {
                  setResultImageUrl(null);
                  setGeminiAdvice(null);
                  setGenerationError(null);
                }}
              >
                <FiRefreshCw /> Try Another
              </button>
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={handleDownload}
              >
                <FiDownload /> Save Look
              </button>
              {onAddToCart && (
                <button
                  type="button"
                  className="vton-btn-primary"
                  onClick={() => {
                    onAddToCart();
                    onClose();
                  }}
                >
                  <FiShoppingBag /> Add to Cart{" "}
                  {productPrice > 0
                    ? `(₹${productPrice.toLocaleString("en-IN")})`
                    : ""}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
