import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { FiX, FiAlertCircle, FiRefreshCw, FiInfo } from "react-icons/fi";
import api from "../../api/axios";
import "./SizeGuide.css";

// In-memory cache to avoid refetching size guides for identical category & gender combinations
const sizeGuideCache = new Map();

/**
 * Standard measurement key definitions and human-readable column headers
 */
const KNOWN_COLUMNS = [
  { key: "chest", label: "Chest" },
  { key: "waist", label: "Waist" },
  { key: "hip", label: "Hip" },
  { key: "footLength", label: "Foot Length" },
];

/**
 * Helper to extract all candidate category IDs from product
 */
export const getCandidateCategoryIds = (product, explicitCategoryId) => {
  const ids = [];
  if (explicitCategoryId) {
    ids.push(String(explicitCategoryId));
  }
  if (!product) return ids;

  if (product.category) {
    const cId = typeof product.category === "object" ? product.category._id : product.category;
    if (cId && !ids.includes(String(cId))) {
      ids.push(String(cId));
    }
  }

  if (Array.isArray(product.categories)) {
    product.categories.forEach((cat) => {
      const cId = typeof cat === "object" ? cat?._id : cat;
      if (cId && !ids.includes(String(cId))) {
        ids.push(String(cId));
      }
    });
  }

  return ids;
};

const SizeGuide = ({
  isOpen = true,
  onClose,
  product = null,
  categoryId = null,
  gender = null,
}) => {
  const [sizeGuide, setSizeGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState("table"); // 'table' | 'howToMeasure'

  const modalRef = useRef(null);

  // Normalize gender string (avoid undefined or null strings)
  const resolvedGender = useMemo(() => {
    const g = gender || product?.gender;
    if (!g || g === "undefined" || g === "null") return "";
    return String(g).trim();
  }, [gender, product?.gender]);

  // Collect candidate category IDs
  const candidateCategoryIds = useMemo(() => {
    return getCandidateCategoryIds(product, categoryId);
  }, [product, categoryId]);

  // Fetch size guide from backend with caching
  const fetchSizeGuide = useCallback(async () => {
    if (!candidateCategoryIds || candidateCategoryIds.length === 0) {
      setLoading(false);
      setNotFound(true);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      let foundGuide = null;

      // Iterate through candidate categories until a valid active size guide is returned
      for (const catId of candidateCategoryIds) {
        const cacheKey = `${catId}_${resolvedGender || "all"}`;

        if (sizeGuideCache.has(cacheKey)) {
          foundGuide = sizeGuideCache.get(cacheKey);
          break;
        }

        try {
          const url = resolvedGender
            ? `/size-guides/category/${catId}?gender=${encodeURIComponent(resolvedGender)}`
            : `/size-guides/category/${catId}`;

          const response = await api.get(url);

          if (response.data?.success && response.data?.sizeGuide) {
            foundGuide = response.data.sizeGuide;
            sizeGuideCache.set(cacheKey, foundGuide);
            break;
          }
        } catch (err) {
          // If 404, check subsequent category in array
          if (err.response?.status === 404) {
            continue;
          }
          // On 500 or network errors, propagate out
          throw err;
        }
      }

      if (foundGuide) {
        setSizeGuide(foundGuide);
        setNotFound(false);
      } else {
        setSizeGuide(null);
        setNotFound(true);
      }
    } catch (err) {
      console.error("Size Guide API Error:", err);
      setError("Unable to load size guide. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [candidateCategoryIds, resolvedGender]);

  useEffect(() => {
    if (isOpen) {
      fetchSizeGuide();
    }
  }, [isOpen, fetchSizeGuide]);

  // Handle ESC key press to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && onClose) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  // Compute active measurement columns dynamically based on actual non-empty data in rows
  const activeColumns = useMemo(() => {
    if (!sizeGuide?.measurements || !Array.isArray(sizeGuide.measurements) || sizeGuide.measurements.length === 0) {
      return [];
    }

    const rows = sizeGuide.measurements;
    const detectedKeys = new Set();

    rows.forEach((row) => {
      if (!row) return;
      Object.keys(row).forEach((k) => {
        if (
          k !== "size" &&
          k !== "_id" &&
          k !== "id" &&
          row[k] !== undefined &&
          row[k] !== null &&
          String(row[k]).trim() !== ""
        ) {
          detectedKeys.add(k);
        }
      });
    });

    // Filter known columns first to preserve canonical Decathlon ordering
    const result = KNOWN_COLUMNS.filter((col) => detectedKeys.has(col.key));

    // Append any custom columns present in the backend response
    detectedKeys.forEach((key) => {
      if (!KNOWN_COLUMNS.some((col) => col.key === key)) {
        const formattedLabel = key
          .replace(/([A-Z])/g, " $1")
          .replace(/^./, (str) => str.toUpperCase());
        result.push({ key, label: formattedLabel });
      }
    });

    return result;
  }, [sizeGuide]);

  if (!isOpen) return null;

  return (
    <div
      className="pdp-size-guide-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="size-guide-modal-title"
    >
      <div
        className="pdp-size-guide-dialog"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          className="pdp-size-guide-close-btn"
          onClick={onClose}
          aria-label="Close size guide"
        >
          <FiX size={20} />
        </button>

        {/* Modal Header */}
        <div className="pdp-size-guide-header">
          <div className="pdp-size-guide-title-row">
            <span className="pdp-size-guide-icon-badge" aria-hidden="true">
              📏
            </span>
            <div>
              <h3 id="size-guide-modal-title" className="pdp-size-guide-title">
                {sizeGuide?.name || (product?.name ? `${product.name} Size Guide` : "Size Guide")}
              </h3>
              <p className="pdp-size-guide-subtitle">
                {sizeGuide?.gender ? `${sizeGuide.gender}'s Fit` : resolvedGender ? `${resolvedGender}'s Fit` : "Athletic Fit"}
                {sizeGuide?.category?.name && ` • ${sizeGuide.category.name}`}
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          {!loading && !error && !notFound && (
            <div className="pdp-size-guide-tabs">
              <button
                type="button"
                className={`pdp-size-guide-tab ${activeTab === "table" ? "active" : ""}`}
                onClick={() => setActiveTab("table")}
              >
                Measurement Chart
              </button>
              <button
                type="button"
                className={`pdp-size-guide-tab ${activeTab === "howToMeasure" ? "active" : ""}`}
                onClick={() => setActiveTab("howToMeasure")}
              >
                How to Measure
              </button>
            </div>
          )}
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="pdp-size-guide-body">
          {/* 1. LOADING STATE */}
          {loading && (
            <div className="pdp-size-guide-state loading">
              <div className="pdp-size-guide-spinner" />
              <p>Loading size guide...</p>
            </div>
          )}

          {/* 2. ERROR STATE */}
          {!loading && error && (
            <div className="pdp-size-guide-state error">
              <FiAlertCircle size={36} className="state-icon error-icon" />
              <h4>Unable to load size guide</h4>
              <p>{error}</p>
              <button
                type="button"
                className="pdp-size-guide-action-btn primary"
                onClick={fetchSizeGuide}
              >
                <FiRefreshCw size={14} /> Try Again
              </button>
            </div>
          )}

          {/* 3. NOT FOUND / EMPTY STATE */}
          {!loading && !error && notFound && (
            <div className="pdp-size-guide-state empty">
              <span className="empty-ruler-emoji" aria-hidden="true">
                📏
              </span>
              <h4>Size guide is not available for this product</h4>
              <p>
                Standard Decathlon athletic sizing applies. We recommend ordering your usual
                sportswear size or visiting your nearest store for a trial.
              </p>
              <button
                type="button"
                className="pdp-size-guide-action-btn secondary"
                onClick={onClose}
              >
                Back to Product
              </button>
            </div>
          )}

          {/* 4. SUCCESS STATE: MEASUREMENT CHART TAB */}
          {!loading && !error && !notFound && sizeGuide && activeTab === "table" && (
            <div className="pdp-size-guide-table-section">
              {sizeGuide.description && (
                <p className="pdp-size-guide-desc">{sizeGuide.description}</p>
              )}

              <div className="pdp-size-guide-unit-note">
                <FiInfo size={14} />
                <span>All measurements are in centimeters (cm) unless specified.</span>
              </div>

              {/* Dynamic Responsive Measurements Table */}
              <div className="pdp-size-guide-table-wrap">
                <table className="pdp-size-guide-table">
                  <thead>
                    <tr>
                      <th className="col-size">Size</th>
                      {activeColumns.map((col) => (
                        <th key={col.key} className={`col-${col.key}`}>
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sizeGuide.measurements?.map((item, idx) => (
                      <tr key={item.size || idx}>
                        <td className="col-size">
                          <span className="pdp-size-badge-pill">{item.size}</span>
                        </td>
                        {activeColumns.map((col) => (
                          <td key={col.key} className={`col-${col.key}`}>
                            {item[col.key] || "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Decathlon Fit Assurance Callout */}
              <div className="pdp-size-guide-fit-tip">
                <strong>Decathlon Fit Tip:</strong> If your body measurement falls between two
                sizes, order the smaller size for a tighter performance fit or the larger size for a
                relaxed, comfortable fit.
              </div>
            </div>
          )}

          {/* 5. SUCCESS STATE: HOW TO MEASURE TAB */}
          {!loading && !error && !notFound && activeTab === "howToMeasure" && (
            <div className="pdp-how-to-measure-content">
              <div className="pdp-measure-step">
                <div className="pdp-measure-num">1</div>
                <div className="pdp-measure-info">
                  <strong>Chest / Bust</strong>
                  <p>
                    Measure around the fullest part of your chest or bust, keeping the measuring tape
                    horizontal and taut but not tight under your arms.
                  </p>
                </div>
              </div>

              <div className="pdp-measure-step">
                <div className="pdp-measure-num">2</div>
                <div className="pdp-measure-info">
                  <strong>Waist</strong>
                  <p>
                    Measure around your natural waistline, typically the narrowest part of your
                    torso just above your belly button.
                  </p>
                </div>
              </div>

              <div className="pdp-measure-step">
                <div className="pdp-measure-num">3</div>
                <div className="pdp-measure-info">
                  <strong>Hips</strong>
                  <p>
                    Stand with your feet together and measure around the fullest part of your hips
                    and rear.
                  </p>
                </div>
              </div>

              <div className="pdp-measure-step">
                <div className="pdp-measure-num">4</div>
                <div className="pdp-measure-info">
                  <strong>Foot Length (for Shoes)</strong>
                  <p>
                    Place your foot on a sheet of paper against a wall. Mark the longest toe and
                    measure the distance to the edge of the heel.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pdp-size-guide-footer">
          <span className="pdp-returns-guarantee-text">
            🛡️ 30-Day Easy Returns & Exchanges on all Decathlon gear
          </span>
          <button
            type="button"
            className="pdp-size-guide-done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizeGuide;
