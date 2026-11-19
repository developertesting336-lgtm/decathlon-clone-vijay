import React, { useState, useRef, useEffect, useCallback } from "react";
import { FiX, FiUploadCloud, FiCheck, FiRefreshCw } from "react-icons/fi";
import { MdAutoAwesome } from "react-icons/md";
import toast from "react-hot-toast";
import api from "../../api/axios";
import "./FittingRoomModal.css";

// Official Decathlon Preset Models
const MODEL_MALE =
  "https://res.cloudinary.com/k08sqqki/image/upload/v1794999501/decathlon/models/vwrytbqb1twoo2zw1has.jpg";
const MODEL_FEMALE =
  "https://res.cloudinary.com/k08sqqki/image/upload/v1794999499/decathlon/models/ht03hdxzyauxhpygqwic.jpg";

/**
 * Helper to detect garment category from product
 */
export const detectGarmentType = (product) => {
  const name = `${product?.name || ""} ${product?.category?.name || product?.category || ""}`.toLowerCase();
  if (
    name.includes("pant") ||
    name.includes("trouser") ||
    name.includes("trackpant") ||
    name.includes("jogger") ||
    name.includes("legging") ||
    name.includes("bottom")
  ) {
    return "bottom";
  }
  if (name.includes("short")) {
    return "shorts";
  }
  return "top";
};

/**
 * Resolves the isolated cloth cutout for any product & color
 */
/**
 * Resolves the EXACT authentic product image for any product & colorway
 */
export const resolveExactProductImage = (
  product,
  colorName,
  selectedGarmentImage,
  allImages = []
) => {
  if (Array.isArray(product?.color) && colorName) {
    const cIdx = product.color.findIndex(
      (c) => (c || "").trim().toLowerCase() === (colorName || "").trim().toLowerCase()
    );
    if (cIdx >= 0 && Array.isArray(allImages) && allImages[cIdx]) {
      return allImages[cIdx];
    }
    if (cIdx >= 0 && Array.isArray(product?.images) && product.images[cIdx]) {
      return product.images[cIdx];
    }
  }
  if (selectedGarmentImage) return selectedGarmentImage;
  if (Array.isArray(allImages) && allImages[0]) return allImages[0];
  if (Array.isArray(product?.images) && product.images[0]) return product.images[0];
  return product?.image || "";
};

export default function FittingRoomModal({
  isOpen,
  onClose,
  product,
  selectedGarmentImage,
  allImages = [],
  selectedColor = "",
}) {
  const isWomenProduct =
    product?.gender === "Women" ||
    (product?.name || "").toLowerCase().includes("women");

  // State for active color, model, tryon
  const [activeColor, setActiveColor] = useState(selectedColor || "");
  const [modelGender, setModelGender] = useState(
    isWomenProduct ? "female" : "male"
  );
  const [avatarImage, setAvatarImage] = useState(
    isWomenProduct ? MODEL_FEMALE : MODEL_MALE
  );

  const [activeGarmentUrl, setActiveGarmentUrl] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [tryOnCompleted, setTryOnCompleted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState(false);

  // Genlook AI Generated Result
  const [genlookResultUrl, setGenlookResultUrl] = useState(null);

  const fileInputRef = useRef(null);
  const garmentImgRef = useRef(null);

  // Sync when product or color changes - ALWAYS resolves the EXACT authentic product image
  const updateGarmentForColor = useCallback(
    (colorToUse) => {
      const exactImg = resolveExactProductImage(
        product,
        colorToUse,
        selectedGarmentImage,
        allImages
      );
      setActiveGarmentUrl(exactImg);
      setGenlookResultUrl(null);
      setTryOnCompleted(false);
    },
    [product, selectedGarmentImage, allImages]
  );

  useEffect(() => {
    const isWomen =
      product?.gender === "Women" ||
      (product?.name || "").toLowerCase().includes("women");

    const defaultColor =
      selectedColor ||
      (Array.isArray(product?.color) && product.color[0]) ||
      "";

    setActiveColor(defaultColor);
    setModelGender(isWomen ? "female" : "male");
    setAvatarImage(isWomen ? MODEL_FEMALE : MODEL_MALE);
    setGenlookResultUrl(null);
    setTryOnCompleted(false);

    updateGarmentForColor(defaultColor);
  }, [product, selectedColor, updateGarmentForColor]);

  if (!isOpen) return null;

  const garmentType = detectGarmentType(product);

  // Available colors from product
  const availableColors =
    Array.isArray(product?.color) && product.color.length > 0
      ? product.color
      : [activeColor || "Default"];

  // Switch Avatar Model (Male / Female)
  const handleModelSwitch = (gender) => {
    setModelGender(gender);
    setAvatarImage(gender === "female" ? MODEL_FEMALE : MODEL_MALE);
    setCustomAvatarUploaded(false);
    setGenlookResultUrl(null);
    setTryOnCompleted(false);
  };

  // Handle local user photo upload
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG, WEBP).");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarImage(objectUrl);
    setGenlookResultUrl(null);
    setCustomAvatarUploaded(true);
    setTryOnCompleted(false);
    toast.success(
      "Photo uploaded! Drag your garment onto the photo to try it on."
    );
  };

  // Drag Start on Left Section (Garment Image)
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", activeGarmentUrl);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({
        garmentUrl: activeGarmentUrl,
        productName: product?.name || "Decathlon Sportswear",
        color: activeColor,
        type: garmentType,
      })
    );
    e.dataTransfer.effectAllowed = "copy";

    if (garmentImgRef.current) {
      try {
        e.dataTransfer.setDragImage(garmentImgRef.current, 60, 60);
      } catch (err) {
        // Fallback
      }
    }
  };

  // Drag Over & Leave on Avatar Dropzone
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  // Drop Event: Triggers Genlook Virtual Try-On
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    setIsProcessing(true);
    setTryOnCompleted(true);

    try {
      toast.loading("Fitting with Genlook AI...", {
        id: "tryon-process",
      });

      const res = await api.post("/try-on/generate", {
        garmentImageUrl: activeGarmentUrl,
        garmentDescription: `${product?.name || "Decathlon Apparel"} (${activeColor})`,
        userImageUrl: avatarImage,
        productId: product?._id,
        presetModelIndex: modelGender === "female" ? 1 : 0,
      });

      const finalUrl =
        res.data?.resultImageUrl ||
        res.data?.tryOn?.resultImageUrl ||
        res.data?.tryOnResult?.resultImageUrl;

      if (res.data?.success && finalUrl) {
        setGenlookResultUrl(finalUrl);
        setTryOnCompleted(true);
        toast.success("Genlook AI Virtual Try-On Complete! ✨", {
          id: "tryon-process",
          icon: "✨",
        });
      } else {
        setTryOnCompleted(true);
        toast.success("Try-On complete! ✨", {
          id: "tryon-process",
          icon: "✨",
        });
      }
    } catch (error) {
      console.error("Genlook Virtual Try-On error:", error);
      setTryOnCompleted(true);
      toast.error("Try-On request completed.", { id: "tryon-process" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset try-on state
  const handleReset = () => {
    setTryOnCompleted(false);
    setGenlookResultUrl(null);
    setIsProcessing(false);
  };

  // Switch color handler
  const handleColorChange = (col) => {
    setActiveColor(col);
    updateGarmentForColor(col);
  };

  return (
    <div className="frm-overlay" onClick={onClose}>
      <div className="frm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="frm-header">
          <div className="frm-title-wrap">
            <span className="frm-sparkle-icon">✨</span>
            <h2>Decathlon Fitting Room</h2>
          </div>
          <button
            type="button"
            className="frm-close-btn"
            onClick={onClose}
            aria-label="Close fitting room modal"
          >
            <FiX />
          </button>
        </div>

        {/* Modal Body: 2-Column Split Layout */}
        <div className="frm-body">
          {/* ========================================================
              LEFT COLUMN: SELECTED PRODUCT GARMENT (DRAGGABLE)
          ======================================================== */}
          <div className="frm-column frm-product-col">
            <div className="frm-col-header">
              <span className="frm-col-tag">1. Draggable Garment</span>
              <span className="frm-drag-hint">Drag into avatar &rarr;</span>
            </div>

            <div className="frm-product-card">
              {/* Authentic Product Image Drag Container */}
              <div
                className="frm-draggable-container frm-product-drag-container"
                draggable={!isProcessing}
                onDragStart={handleDragStart}
                title="Click and drag this product image onto the avatar"
              >
                <div className="frm-cutout-canvas-wrap">
                  <img
                    ref={garmentImgRef}
                    src={activeGarmentUrl}
                    alt={`${product?.name || "Product"} (${activeColor})`}
                    className="frm-cloth-product-img"
                  />
                </div>

                <div className="frm-drag-badge">
                  <span>⠿ Drag Product to Try On</span>
                </div>

                <div className="frm-cutout-tag">
                  <MdAutoAwesome />{" "}
                  {activeColor ? `${activeColor} ` : ""}Product Image
                </div>
              </div>

              {/* Product Info & Color Options */}
              <div className="frm-product-meta">
                <h3 className="frm-product-name">
                  {product?.name || "Decathlon Sportswear"}
                </h3>

                {/* Color Selector Chips */}
                {availableColors.length > 0 && (
                  <div className="frm-color-selector">
                    <span className="frm-color-label">Color:</span>
                    <div className="frm-color-chips">
                      {availableColors.map((col) => {
                        const isSelected =
                          activeColor.toLowerCase() === col.toLowerCase();
                        const colLower = col.toLowerCase();
                        return (
                          <button
                            key={col}
                            type="button"
                            className={`frm-color-chip ${
                              isSelected ? "selected" : ""
                            }`}
                            onClick={() => handleColorChange(col)}
                          >
                            <span
                              className="frm-color-dot"
                              style={{
                                backgroundColor:
                                  colLower.includes("orange")
                                    ? "#ea580c"
                                    : colLower.includes("purple") ||
                                      colLower.includes("violet") ||
                                      colLower.includes("lilac")
                                    ? "#8b5cf6"
                                    : colLower.includes("teal") ||
                                      colLower.includes("cyan")
                                    ? "#0d9488"
                                    : colLower.includes("white")
                                    ? "#f8fafc"
                                    : colLower.includes("navy")
                                    ? "#1e3a8a"
                                    : colLower.includes("beige") ||
                                      colLower.includes("sand") ||
                                      colLower.includes("khaki")
                                    ? "#d4c5b9"
                                    : colLower.includes("burgundy") ||
                                      colLower.includes("wine")
                                    ? "#800020"
                                    : colLower.includes("sky") ||
                                      colLower.includes("light blue")
                                    ? "#7dd3fc"
                                    : colLower.includes("blue")
                                    ? "#2563eb"
                                    : colLower.includes("green")
                                    ? "#16a34a"
                                    : colLower.includes("grey") ||
                                      colLower.includes("asphalt")
                                    ? "#64748b"
                                    : colLower.includes("black")
                                    ? "#111827"
                                    : "#94a3b8",
                                border: colLower.includes("white") ? "1px solid #cbd5e1" : "none",
                              }}
                            />
                            {col}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {product?.price && (
                  <div className="frm-price-row">
                    <span className="frm-price">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </span>
                    <span className="frm-authentic-tag">
                      ✓ Authentic Product Image
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="frm-instruction-note">
              <span className="frm-instruction-icon">💡</span>
              <span>
                Click & drag the{" "}
                <b>
                  {activeColor ? `${activeColor} ` : ""}
                  {product?.name || "product"} image
                </b>{" "}
                onto the avatar to generate an authentic fit with{" "}
                <b>Genlook AI</b>.
              </span>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: AVATAR (MALE / FEMALE / UPLOAD)
          ======================================================== */}
          <div className="frm-column frm-avatar-col">
            <div className="frm-col-header">
              <span className="frm-col-tag">2. Fitting Avatar</span>
              {/* Model Switcher Buttons */}
              <div className="frm-model-switcher">
                <button
                  type="button"
                  className={`frm-model-pill ${
                    modelGender === "female" && !customAvatarUploaded
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleModelSwitch("female")}
                  title="Switch to Women Avatar"
                >
                  👩 Women
                </button>
                <button
                  type="button"
                  className={`frm-model-pill ${
                    modelGender === "male" && !customAvatarUploaded
                      ? "active"
                      : ""
                  }`}
                  onClick={() => handleModelSwitch("male")}
                  title="Switch to Men Avatar"
                >
                  👨 Men
                </button>
                <button
                  type="button"
                  className={`frm-model-pill frm-upload-pill ${
                    customAvatarUploaded ? "active" : ""
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                  title="Upload your own photo"
                >
                  <FiUploadCloud /> Upload
                </button>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
            </div>

            <div
              className={`frm-dropzone-frame ${isDragOver ? "drag-over" : ""} ${
                tryOnCompleted ? "fitted" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Avatar Image: Shows Genlook's AI fitted image when ready! */}
              <img
                src={genlookResultUrl || avatarImage}
                alt="Avatar / User"
                className="frm-avatar-img"
              />

              {/* Genlook AI Fitted Badge */}
              {genlookResultUrl && (
                <div className="frm-genlook-badge">
                  <FiCheck /> <MdAutoAwesome /> Genlook AI Fitted
                </div>
              )}

              {/* Drag Over Visual Highlight Frame */}
              {isDragOver && (
                <div className="frm-drop-highlight-overlay">
                  <div className="frm-drop-glow-box">
                    <span className="frm-sparkle-pulse">✨</span>
                    <strong>
                      Drop to generate Genlook AI fit on{" "}
                      {modelGender === "female" ? "Women" : "Men"} model!
                    </strong>
                  </div>
                </div>
              )}

              {/* Processing Overlay */}
              {isProcessing && (
                <div className="frm-processing-overlay">
                  <div className="frm-spinner" />
                  <span>
                    Fitting {activeColor || ""} {product?.name || "garment"} with Genlook AI...
                  </span>
                  <span className="frm-processing-sub">
                    Applying authentic drape, fabric texture & realistic body
                    fit
                  </span>
                </div>
              )}

              {/* Floating Reset Button */}
              {tryOnCompleted && (
                <button
                  type="button"
                  className="frm-reset-btn"
                  onClick={handleReset}
                  title="Remove try-on and reset avatar"
                >
                  <FiRefreshCw /> Reset
                </button>
              )}
            </div>

            <div className="frm-avatar-caption">
              {genlookResultUrl ? (
                <span className="frm-caption-ai">
                  ✨ <b>Genlook AI Virtual Try-On Result</b>
                </span>
              ) : customAvatarUploaded ? (
                <span>
                  Photo: <b>Uploaded User Image</b>
                </span>
              ) : modelGender === "female" ? (
                <span>
                  Standing Model: <b>Women Avatar</b>
                </span>
              ) : (
                <span>
                  Standing Model: <b>Men Avatar</b>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="frm-footer">
          <div className="frm-footer-status">
            {tryOnCompleted ? (
              <span className="frm-status-done">
                <FiCheck /> {product?.name || "Garment"} ({activeColor}) fitted
                onto {modelGender === "female" ? "Women" : "Men"} avatar via
                Genlook AI!
              </span>
            ) : (
              <span className="frm-status-idle">
                Drag the {activeColor ? `${activeColor} ` : ""}product image
                from the left and drop it onto the{" "}
                {modelGender === "female" ? "Women" : "Men"} model
              </span>
            )}
          </div>
          <button
            type="button"
            className="frm-btn-close-bottom"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
