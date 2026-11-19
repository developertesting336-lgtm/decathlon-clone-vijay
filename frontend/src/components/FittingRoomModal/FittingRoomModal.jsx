import React, { useState, useRef } from "react";
import { FiX, FiUploadCloud, FiCheck, FiRefreshCw } from "react-icons/fi";
import { MdAutoAwesome } from "react-icons/md";
import toast from "react-hot-toast";
import "./FittingRoomModal.css";

/**
 * Placeholder function for extracting cloth cutout
 * Ready to be implemented with Gemini API or background removal service later
 */
export const extractClothCutout = async (garmentImageUrl) => {
  console.log("👗 [Mock] Extracting cloth cutout for garment:", garmentImageUrl);
  // Simulates cutout extraction latency
  await new Promise((resolve) => setTimeout(resolve, 600));
  return {
    success: true,
    cutoutUrl: garmentImageUrl,
    message: "Cloth cutout extracted successfully (mock placeholder)",
  };
};

/**
 * Placeholder function for Gemini Virtual Try-On generation
 * Ready to be connected to Google Gemini Vision / Generative Language API
 */
export const generateTryOnWithGemini = async (cutoutData, avatarImageUrl) => {
  console.log("✨ [Mock] Generating try-on with Gemini for avatar:", avatarImageUrl);
  // Simulates AI try-on generation latency
  await new Promise((resolve) => setTimeout(resolve, 1200));
  return {
    success: true,
    tryOnResultUrl: avatarImageUrl, // Overlaid preview URL
    message: "Virtual try-on generated successfully with Gemini (mock placeholder)",
  };
};

export default function FittingRoomModal({
  isOpen,
  onClose,
  product,
  selectedGarmentImage,
  selectedColor,
}) {
  const [avatarImage, setAvatarImage] = useState(
    "https://res.cloudinary.com/k08sqqki/image/upload/v1794999501/decathlon/models/vwrytbqb1twoo2zw1has.jpg"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [tryOnCompleted, setTryOnCompleted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Active product image to drag
  const activeProductImage =
    selectedGarmentImage ||
    (Array.isArray(product?.images) && product.images[0]) ||
    product?.image ||
    "https://res.cloudinary.com/k08sqqki/image/upload/v1789016058/products/wa4g3nslnm13u519mzrb.jpg";

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
    setCustomAvatarUploaded(true);
    setTryOnCompleted(false);
    toast.success("Photo uploaded successfully! Drag your garment to try on.");
  };

  // Drag Start on Left Section (Product Image)
  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", activeProductImage);
    e.dataTransfer.setData("application/json", JSON.stringify({
      imageUrl: activeProductImage,
      productName: product?.name || "Decathlon Sportswear",
      color: selectedColor || "",
    }));
    e.dataTransfer.effectAllowed = "copy";
  };

  // Drag Over & Leave on Right Section (Avatar Dropzone)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Drop Event Triggering the Image Processing Flow
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);

    const droppedImageUrl = e.dataTransfer.getData("text/plain") || activeProductImage;

    try {
      setIsProcessing(true);
      toast.loading("Processing virtual try-on...", { id: "tryon-process" });

      // Step 1: Call mock cloth cutout extractor
      const cutoutResult = await extractClothCutout(droppedImageUrl);

      // Step 2: Call mock Gemini Try-On generator
      const tryOnResult = await generateTryOnWithGemini(cutoutResult, avatarImage);

      if (tryOnResult.success) {
        setTryOnCompleted(true);
        toast.success("Virtual Try-On applied! (Mock AI overlay)", {
          id: "tryon-process",
          icon: "✨",
        });
      }
    } catch (error) {
      console.error("Virtual Try-On error:", error);
      toast.error("Failed to generate try-on.", { id: "tryon-process" });
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset try-on state
  const handleReset = () => {
    setTryOnCompleted(false);
    setIsProcessing(false);
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
              LEFT COLUMN: SELECTED PRODUCT IMAGE (DRAGGABLE)
          ======================================================== */}
          <div className="frm-column frm-product-col">
            <div className="frm-col-header">
              <span className="frm-col-tag">1. Draggable Garment</span>
              <span className="frm-drag-hint">Drag into avatar &rarr;</span>
            </div>

            <div className="frm-product-card">
              <div
                className="frm-draggable-container"
                draggable={!isProcessing}
                onDragStart={handleDragStart}
                title="Click and drag this product onto the avatar"
              >
                <img
                  src={activeProductImage}
                  alt={product?.name || "Selected Product"}
                  className="frm-product-img"
                />
                <div className="frm-drag-badge">
                  <span>⠿ Drag to Try On</span>
                </div>
              </div>

              <div className="frm-product-meta">
                <h3 className="frm-product-name">{product?.name || "Decathlon Apparel"}</h3>
                {selectedColor && (
                  <span className="frm-color-pill">
                    Color: <b>{selectedColor}</b>
                  </span>
                )}
                {product?.price && (
                  <span className="frm-price">₹{Number(product.price).toLocaleString("en-IN")}</span>
                )}
              </div>
            </div>

            <div className="frm-instruction-note">
              <span className="frm-instruction-icon">💡</span>
              <span>
                Click & hold the product above, then drag and drop it onto the avatar on the right to try it on.
              </span>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN: AVATAR / USER PHOTO (DROP TARGET)
          ======================================================== */}
          <div className="frm-column frm-avatar-col">
            <div className="frm-col-header">
              <span className="frm-col-tag">2. Fitting Avatar</span>
              <button
                type="button"
                className="frm-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <FiUploadCloud /> Upload your photo
              </button>
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
              {/* Avatar Base Image */}
              <img
                src={avatarImage}
                alt="Avatar / User"
                className="frm-avatar-img"
              />

              {/* Garment Overlay / Cutout simulation after drop */}
              {tryOnCompleted && (
                <div className="frm-overlay-garment">
                  <img
                    src={activeProductImage}
                    alt="Fitted Garment"
                    className="frm-overlaid-cloth"
                  />
                  <div className="frm-fitted-badge">
                    <FiCheck /> <MdAutoAwesome /> Garment Fitted
                  </div>
                </div>
              )}

              {/* Drag Over Visual Highlight */}
              {isDragOver && (
                <div className="frm-drop-highlight-overlay">
                  <div className="frm-drop-glow-box">
                    <span className="frm-sparkle-pulse">✨</span>
                    <strong>Drop garment here to try on!</strong>
                  </div>
                </div>
              )}

              {/* Processing Spinner Overlay */}
              {isProcessing && (
                <div className="frm-processing-overlay">
                  <div className="frm-spinner" />
                  <span>Aligning & fitting garment...</span>
                </div>
              )}

              {/* Floating action controls */}
              {tryOnCompleted && (
                <button
                  type="button"
                  className="frm-reset-btn"
                  onClick={handleReset}
                  title="Try another garment"
                >
                  <FiRefreshCw /> Reset
                </button>
              )}
            </div>

            <div className="frm-avatar-caption">
              {customAvatarUploaded ? (
                <span>Photo: <b>Uploaded User Image</b></span>
              ) : (
                <span>Default Standing Model Avatar</span>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="frm-footer">
          <div className="frm-footer-status">
            {tryOnCompleted ? (
              <span className="frm-status-done">
                <FiCheck /> Fitting simulation complete (mock ready for Gemini API)
              </span>
            ) : (
              <span className="frm-status-idle">
                Drag the product from the left and drop it onto the model
              </span>
            )}
          </div>
          <button type="button" className="frm-btn-close-bottom" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
