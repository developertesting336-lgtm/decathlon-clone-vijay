import React, { useState, useEffect, useRef } from "react";
import {
  FiX,
  FiUploadCloud,
  FiUser,
  FiCheck,
  FiRefreshCw,
  FiDownload,
  FiShoppingBag,
  FiEye,
  FiAlertCircle,
  FiArrowDown,
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
  initialDroppedGarment = null,
}) {
  // Preset models & selection
  const [presetModels, setPresetModels] = useState(FALLBACK_PRESETS);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [modelType, setModelType] = useState("preset"); // "preset" | "custom"

  // Active garment state
  const [currentGarmentUrl, setCurrentGarmentUrl] = useState("");
  const [currentGarmentColor, setCurrentGarmentColor] = useState("");
  const [isGarmentFittedOnModel, setIsGarmentFittedOnModel] = useState(false);

  // Custom photo upload
  const [userFile, setUserFile] = useState(null);
  const [userPreviewUrl, setUserPreviewUrl] = useState(null);

  // Genlook & Gemini status
  const [credits, setCredits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [resultImageUrl, setResultImageUrl] = useState(null);
  const [geminiAdvice, setGeminiAdvice] = useState(null);
  const [geminiQuickHint, setGeminiQuickHint] = useState(null);
  const [viewMode, setViewMode] = useState("fitted"); // "fitted" | "split"
  const [generationError, setGenerationError] = useState(null);

  // Drag & drop interactive state inside modal
  const [isDragOverTarget, setIsDragOverTarget] = useState(false);
  const [touchDraggingGarment, setTouchDraggingGarment] = useState(null);
  const [touchPos, setTouchPos] = useState({ x: 0, y: 0 });

  const fileInputRef = useRef(null);
  const dropTargetRef = useRef(null);

  // Synchronize initial product garment when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      const defaultImg =
        initialDroppedGarment ||
        selectedGarmentImage ||
        (Array.isArray(product?.images) && product.images[0]) ||
        product?.image ||
        "";
      setCurrentGarmentUrl(defaultImg);
      setCurrentGarmentColor(selectedColor || "");
      setIsGarmentFittedOnModel(Boolean(defaultImg));
      setGenerationError(null);
    }
  }, [isOpen, selectedGarmentImage, selectedColor, product, initialDroppedGarment]);

  // Fetch preset models and credit balance when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Fetch Decathlon preset models from backend
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

  // Fetch server-side Gemini styling hint when active garment changes
  useEffect(() => {
    if (!isOpen || !currentGarmentUrl) return;

    const garmentName = `${product?.name || "Sportswear"}${
      currentGarmentColor ? ` (${currentGarmentColor})` : ""
    }`;
    const categoryName =
      typeof product?.category === "object"
        ? product?.category?.name
        : typeof product?.category === "string"
        ? product?.category
        : "Sportswear";

    api
      .post("/try-on/validate-garment", {
        garmentImageUrl: currentGarmentUrl,
        garmentDescription: garmentName,
        category: categoryName,
        gender: product?.gender || "Unisex",
      })
      .then((res) => {
        if (res.data?.hint) {
          setGeminiQuickHint(res.data.hint);
        }
      })
      .catch(() => {
        setGeminiQuickHint("Standard Decathlon athletic fit engineered for breathability and movement.");
      });
  }, [isOpen, currentGarmentUrl, currentGarmentColor, product]);

  // Loading step progression simulation
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

  // Pointer event cleanup
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setTouchDraggingGarment(null);
      setIsDragOverTarget(false);
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    window.addEventListener("pointercancel", handleGlobalPointerUp);
    return () => {
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  if (!isOpen) return null;

  // Selected standing model details
  const activeModel =
    presetModels.find((m) => m.sampleIndex === selectedPresetIndex) ||
    presetModels[0] ||
    FALLBACK_PRESETS[0];
  const modelDisplayUrl =
    modelType === "custom" && userPreviewUrl
      ? userPreviewUrl
      : activeModel.previewUrl;

  // Garment drop validator
  const applyGarmentImage = (url, colorLabel = "") => {
    if (!url || typeof url !== "string") {
      toast.error("Invalid image dropped.");
      return;
    }
    setCurrentGarmentUrl(url);
    if (colorLabel) setCurrentGarmentColor(colorLabel);
    setIsGarmentFittedOnModel(true);
    setGenerationError(null);
    toast.success("Garment dropped onto model! Ready to generate.", {
      id: "vton-drop-success",
      icon: "✨",
    });
  };

  // HTML5 Drag & Drop handlers on the Model Drop Target
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOverTarget) setIsDragOverTarget(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    // Only deactivate if leaving the container boundaries
    if (
      dropTargetRef.current &&
      !dropTargetRef.current.contains(e.relatedTarget)
    ) {
      setIsDragOverTarget(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOverTarget(false);

    // 1. Check for files dropped from desktop/file explorer
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Invalid file: Please drop an apparel image file (JPG, PNG, WEBP).", {
          id: "vton-invalid-file",
        });
        return;
      }
      const localUrl = URL.createObjectURL(file);
      applyGarmentImage(localUrl, "Custom Upload");
      return;
    }

    // 2. Check for dragged product data
    const rawData = e.dataTransfer.getData("application/json");
    if (rawData) {
      try {
        const parsed = JSON.parse(rawData);
        if (parsed.imageUrl) {
          applyGarmentImage(parsed.imageUrl, parsed.color || "");
          return;
        }
      } catch {
        // continue
      }
    }

    // 3. Check plain text URL or URI list
    const textUrl =
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (textUrl && (textUrl.startsWith("http") || textUrl.startsWith("blob:") || textUrl.startsWith("/"))) {
      applyGarmentImage(textUrl.trim(), "");
      return;
    }

    toast.error("Could not recognize dropped product image. Please drop a valid product image.", {
      id: "vton-unrecognized-drop",
    });
  };

  // Touch & Pointer Drag for Thumbnails within Modal
  const handlePointerDownGarment = (e, garmentItem) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setTouchDraggingGarment(garmentItem);
    setTouchPos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMoveGarment = (e) => {
    if (!touchDraggingGarment) return;
    setTouchPos({ x: e.clientX, y: e.clientY });

    // Check collision with drop target
    if (dropTargetRef.current) {
      const rect = dropTargetRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      setIsDragOverTarget(isInside);
    }
  };

  const handlePointerUpGarment = (e) => {
    if (!touchDraggingGarment) return;

    if (dropTargetRef.current) {
      const rect = dropTargetRef.current.getBoundingClientRect();
      const isInside =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      if (isInside) {
        applyGarmentImage(
          touchDraggingGarment.imageUrl,
          touchDraggingGarment.color || ""
        );
      }
    }

    setTouchDraggingGarment(null);
    setIsDragOverTarget(false);
  };

  // Custom user photo upload handling
  const handleUserPhotoSelect = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }
    setUserFile(file);
    const objectUrl = URL.createObjectURL(file);
    setUserPreviewUrl(objectUrl);
    setModelType("custom");
    setGenerationError(null);
  };

  // Generate Try-On calling the existing backend Genlook route
  const handleGenerate = async () => {
    if (loading) return;

    if (!currentGarmentUrl) {
      toast.error("Please drop or select a product to try on.");
      return;
    }

    if (credits !== null && credits <= 0) {
      toast.error("Try-On credits are currently exhausted. Please contact support.");
      return;
    }

    try {
      setLoading(true);
      setGenerationError(null);
      const formData = new FormData();

      if (product?._id) {
        formData.append("productId", product._id);
      }

      const garmentDescription = `${product?.name || "Decathlon Sportswear"}${
        currentGarmentColor ? ` (${currentGarmentColor})` : ""
      }`;
      formData.append("garmentDescription", garmentDescription);
      formData.append("garmentImageUrl", currentGarmentUrl);

      // Person image source (Preset Model vs Uploaded Photo)
      if (modelType === "preset") {
        formData.append("presetModelIndex", selectedPresetIndex);
      } else {
        if (!userFile) {
          toast.error("Please upload your photo first or select a Decathlon model.");
          setLoading(false);
          return;
        }
        formData.append("userImage", userFile);
      }

      // Call existing backend route
      const res = await api.post("/try-on/generate", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success && res.data?.resultImageUrl) {
        setResultImageUrl(res.data.resultImageUrl);
        setGeminiAdvice(res.data.geminiAdvice || null);
        if (typeof res.data?.creditsRemaining === "number") {
          setCredits(res.data.creditsRemaining);
        }
        toast.success("AI Fitting completed with Genlook!");
      } else {
        throw new Error(res.data?.message || "Generation failed");
      }
    } catch (err) {
      console.error("Try-on error:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data?.error ||
        err.message ||
        "Virtual try-on failed. Ensure product image is clear and try again.";
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Reset to try another product
  const handleTryAnother = () => {
    setResultImageUrl(null);
    setGeminiAdvice(null);
    setGenerationError(null);
    setIsGarmentFittedOnModel(false);
  };

  // Download fitted look
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

  const productPrice = product?.price || product?.finalPrice || 0;
  const brandName =
    typeof product?.brand === "object"
      ? product?.brand?.name
      : typeof product?.brand === "string" && product?.brand.trim()
      ? product?.brand
      : "DOMYOS";

  // Product images list for in-modal quick select / drag
  const galleryImages = Array.isArray(product?.images)
    ? product.images.filter(Boolean)
    : product?.image
    ? [product.image]
    : [];

  return (
    <div className="vton-overlay" onClick={onClose}>
      <div
        className="vton-modal vton-modal-dnd"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="vton-header">
          <div className="vton-header-brand">
            <DecathlonLogo color="#ffffff" height={22} />
            <div className="vton-header-divider" />
            <div className="vton-title-group">
              <h2>AI Virtual Try-On</h2>
              <span className="vton-badge">GENLOOK AI</span>
            </div>
          </div>
          <div className="vton-header-actions">
            {credits !== null && (
              <span
                className={`vton-credits-badge ${
                  credits <= 2 ? "low-credits" : ""
                }`}
                title="Available Genlook AI Try-On Credits"
              >
                <MdAutoAwesome />
                {credits} {credits === 1 ? "credit" : "credits"} left
              </span>
            )}
            <button
              className="vton-close-btn"
              onClick={onClose}
              aria-label="Close virtual try-on"
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Modal Body: Responsive 2-Column Split (Left: Model Canvas + Dropzone, Right: Garment Details & Controls) */}
        <div className="vton-body vton-body-dnd">
          {/* Credits Exhausted Alert */}
          {credits === 0 && !loading && !resultImageUrl && (
            <div className="vton-credits-alert">
              <FiAlertCircle className="vton-alert-icon" />
              <div>
                <strong>Try-On Credits Exhausted:</strong> You have reached your
                daily Gemini AI limit. Please try again later.
              </div>
            </div>
          )}

          {/* Error Banner */}
          {generationError && !loading && !resultImageUrl && (
            <div className="vton-error-banner">
              <FiAlertCircle className="vton-alert-icon" />
              <div className="vton-error-text">
                <strong>Try-On Failed:</strong> {generationError}
              </div>
            </div>
          )}

          {/* Main Workspace Grid */}
          <div className="vton-workspace-grid">
            {/* ========================================================
                LEFT/CENTER: MODEL CANVAS & INTERACTIVE DROP TARGET
            ======================================================== */}
            <div className="vton-model-stage">
              {/* Model Switcher Bar */}
              <div className="vton-stage-topbar">
                <span className="vton-stage-label">
                  <FiUser /> Standing Model:
                </span>
                <div className="vton-model-pills">
                  {presetModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`vton-model-pill ${
                        modelType === "preset" && selectedPresetIndex === m.sampleIndex
                          ? "active"
                          : ""
                      }`}
                      onClick={() => {
                        setModelType("preset");
                        setSelectedPresetIndex(m.sampleIndex);
                      }}
                    >
                      {m.gender === "male" ? "Men" : "Women"} (Preset #{m.sampleIndex + 1})
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`vton-model-pill ${
                      modelType === "custom" ? "active" : ""
                    }`}
                    onClick={() => {
                      if (!userPreviewUrl) {
                        fileInputRef.current?.click();
                      } else {
                        setModelType("custom");
                      }
                    }}
                  >
                    <FiUploadCloud /> {userPreviewUrl ? "My Photo" : "Upload Photo"}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleUserPhotoSelect(e.target.files[0]);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Main Canvas Container */}
              <div
                className={`vton-canvas-frame ${
                  isDragOverTarget ? "drag-over" : ""
                } ${loading ? "is-generating" : ""}`}
                ref={dropTargetRef}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                data-drop-zone="vton-model"
              >
                {/* 1. Base Model Image or Result Image */}
                {!loading && resultImageUrl ? (
                  <div className="vton-canvas-result-view">
                    <img
                      src={resultImageUrl}
                      alt="Decathlon AI Virtual Try-On Result"
                      className="vton-canvas-model-img result-mode"
                    />
                    <div className="vton-result-badge-floating">
                      <MdAutoAwesome /> Genlook AI Fitted
                    </div>
                  </div>
                ) : (
                  <img
                    src={modelDisplayUrl}
                    alt={activeModel.label}
                    className="vton-canvas-model-img"
                  />
                )}

                {/* 2. Loading Shimmer & Spinner Animation */}
                {loading && (
                  <div className="vton-canvas-loading-overlay">
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
                      Genlook Virtual Try-On Engine • Preserves fabric texture & drape
                    </div>
                  </div>
                )}

                {/* 3. Drag & Drop Overlay Target (Visible when not generated) */}
                {!loading && !resultImageUrl && (
                  <div
                    className={`vton-drop-target-overlay ${
                      isDragOverTarget ? "highlight" : ""
                    } ${isGarmentFittedOnModel ? "fitted" : ""}`}
                  >
                    <div className="vton-drop-target-content">
                      <div className="vton-drop-target-icon">
                        {isDragOverTarget ? (
                          <MdAutoAwesome className="spin-pulse" />
                        ) : isGarmentFittedOnModel ? (
                          <FiCheck className="fitted-icon" />
                        ) : (
                          <FiArrowDown className="bounce-arrow" />
                        )}
                      </div>
                      <div className="vton-drop-target-text">
                        {isDragOverTarget
                          ? "Release to try on!"
                          : isGarmentFittedOnModel
                          ? "Garment fitted on model"
                          : "Drop your product here to try it on"}
                      </div>
                      <div className="vton-drop-target-subtext">
                        {isGarmentFittedOnModel
                          ? "Drop another thumbnail to switch garment"
                          : "Drag from product gallery or drop image file"}
                      </div>

                      {/* Small garment preview pill attached to model */}
                      {isGarmentFittedOnModel && currentGarmentUrl && (
                        <div className="vton-model-fitted-garment-pill">
                          <img
                            src={currentGarmentUrl}
                            alt="Fitted garment"
                            className="vton-fitted-mini-thumb"
                          />
                          <span>
                            {product?.name || "Garment"}
                            {currentGarmentColor ? ` (${currentGarmentColor})` : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ========================================================
                RIGHT/BOTTOM: PRODUCT PREVIEW, GEMINI INSIGHTS & ACTIONS
            ======================================================== */}
            <div className="vton-sidebar-stage">
              {/* Result Mode Comparison Toggle */}
              {resultImageUrl && !loading ? (
                <div className="vton-result-details-panel">
                  <div className="vton-view-toggle">
                    <button
                      type="button"
                      className={`vton-view-btn ${
                        viewMode === "fitted" ? "active" : ""
                      }`}
                      onClick={() => setViewMode("fitted")}
                    >
                      <MdAutoAwesome /> Fitted Look
                    </button>
                    <button
                      type="button"
                      className={`vton-view-btn ${
                        viewMode === "split" ? "active" : ""
                      }`}
                      onClick={() => setViewMode("split")}
                    >
                      <FiEye /> Compare with Product
                    </button>
                  </div>

                  {viewMode === "split" && (
                    <div className="vton-split-compare-box">
                      <img
                        src={currentGarmentUrl}
                        alt="Original Product"
                        className="vton-compare-garment-img"
                      />
                      <div className="vton-compare-info">
                        <strong>Catalog Garment:</strong>
                        <div>{product?.name}</div>
                        {currentGarmentColor && (
                          <span className="vton-color-tag">{currentGarmentColor}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Gemini Fit & Style Advice */}
                  {geminiAdvice && (
                    <div className="vton-gemini-card">
                      <div className="vton-gemini-header">
                        <MdAutoAwesome className="vton-gemini-sparkle" />
                        <span>Decathlon AI Fit Insights (Google Gemini)</span>
                      </div>
                      <p className="vton-gemini-text">{geminiAdvice}</p>
                    </div>
                  )}

                  <div className="vton-fit-verdict-banner">
                    <FiCheck /> <b>Authentic Garment Match</b>: Exact fabric
                    textures, logos, neckline, and sleeves preserved.
                  </div>
                </div>
              ) : (
                /* Pre-generation Active Product Preview Card */
                <div className="vton-product-preview-card">
                  <div className="vton-card-title-row">
                    <span className="vton-preview-title-tag">Selected Product</span>
                    <span className="vton-brand-badge">{brandName}</span>
                  </div>

                  {/* Garment Preview Thumbnail & Info */}
                  <div className="vton-selected-product-box">
                    {currentGarmentUrl ? (
                      <div className="vton-product-preview-thumb-wrap">
                        <img
                          src={currentGarmentUrl}
                          alt={product?.name || "Selected garment"}
                          className="vton-product-preview-thumb"
                        />
                        {currentGarmentColor && (
                          <span className="vton-thumb-color-badge">
                            {currentGarmentColor}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="vton-thumb-placeholder">
                        <FiUploadCloud />
                        <span>No garment selected</span>
                      </div>
                    )}

                    <div className="vton-selected-product-meta">
                      <h3 className="vton-product-heading">{product?.name}</h3>
                      {productPrice > 0 && (
                        <div className="vton-product-price-strip">
                          ₹{productPrice.toLocaleString("en-IN")}
                        </div>
                      )}
                      <div className="vton-product-fit-status">
                        {isGarmentFittedOnModel ? (
                          <span className="status-ready">
                            <FiCheck /> Ready for Virtual Try-On
                          </span>
                        ) : (
                          <span className="status-waiting">
                            Drag or select product to try on
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Drag-and-Drop Gallery / Color Swatches Strip */}
                  <div className="vton-gallery-draggables-container">
                    <div className="vton-gallery-strip-header">
                      <span>Available Views & Color Variants</span>
                      <small className="vton-drag-hint">Drag any view onto model</small>
                    </div>

                    <div className="vton-gallery-drag-row">
                      {galleryImages.map((imgUrl, idx) => {
                        const isCurrent = currentGarmentUrl === imgUrl;
                        return (
                          <div
                            key={idx}
                            className={`vton-draggable-thumb-item ${
                              isCurrent ? "active-selected" : ""
                            }`}
                            draggable={true}
                            onDragStart={(e) => {
                              const data = {
                                imageUrl: imgUrl,
                                name: product?.name,
                                color: currentGarmentColor,
                              };
                              e.dataTransfer.setData(
                                "application/json",
                                JSON.stringify(data)
                              );
                              e.dataTransfer.setData("text/plain", imgUrl);
                              e.dataTransfer.effectAllowed = "copy";
                            }}
                            onPointerDown={(e) =>
                              handlePointerDownGarment(e, {
                                imageUrl: imgUrl,
                                color: currentGarmentColor,
                              })
                            }
                            onPointerMove={handlePointerMoveGarment}
                            onPointerUp={handlePointerUpGarment}
                            onClick={() => applyGarmentImage(imgUrl, currentGarmentColor)}
                            title="Drag or click to try on model"
                          >
                            <img src={imgUrl} alt={`View ${idx + 1}`} />
                            <span className="vton-drag-grip-indicator">⠿</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Gemini Fit & Styling Drape Hint */}
                  {geminiQuickHint && (
                    <div className="vton-gemini-hint-box">
                      <div className="vton-gemini-hint-header">
                        <MdAutoAwesome className="hint-sparkle" />
                        <span>AI Fit & Fabric Drape Note</span>
                      </div>
                      <p>{geminiQuickHint}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="vton-footer">
          {!resultImageUrl ? (
            <div className="vton-footer-actions-row">
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="vton-submit-btn"
                disabled={
                  loading ||
                  !currentGarmentUrl ||
                  credits === 0 ||
                  (modelType === "custom" && !userFile)
                }
                onClick={handleGenerate}
              >
                <MdAutoAwesome />
                {loading ? "Generating Try-On..." : "Generate Try-On"}
              </button>
            </div>
          ) : (
            <div className="vton-result-actions">
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={handleTryAnother}
              >
                <FiRefreshCw /> Try Another Product
              </button>
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={handleGenerate}
                disabled={loading || credits === 0}
              >
                <MdAutoAwesome /> Regenerate
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
                  <FiShoppingBag /> Add to Cart
                </button>
              )}
              <button
                type="button"
                className="vton-btn-secondary"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          )}
        </div>

        {/* Floating Touch Drag Ghost Indicator */}
        {touchDraggingGarment && (
          <div
            className="vton-touch-drag-ghost"
            style={{
              position: "fixed",
              left: `${touchPos.x - 30}px`,
              top: `${touchPos.y - 30}px`,
              pointerEvents: "none",
              zIndex: 999999,
            }}
          >
            <img
              src={touchDraggingGarment.imageUrl}
              alt="Dragging"
              className="vton-ghost-img"
            />
          </div>
        )}
      </div>
    </div>
  );
}
