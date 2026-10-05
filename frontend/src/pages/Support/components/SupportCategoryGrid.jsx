import React, { useState, useEffect } from "react";
import SupportCategoryCard from "./SupportCategoryCard";
import api from "../../../api/axios";
import "../Support.css";

const SupportCategoryGrid = ({
  searchQuery = "",
  categories: propCategories = null,
  onSelectCategory,
}) => {
  const [categories, setCategories] = useState(propCategories || []);
  const [loading, setLoading] = useState(!propCategories);
  const [error, setError] = useState(null);

  // If propCategories changes, sync it
  useEffect(() => {
    if (propCategories && Array.isArray(propCategories)) {
      setCategories(propCategories);
      setLoading(false);
    }
  }, [propCategories]);

  // Fetch active categories from API if not provided via props
  useEffect(() => {
    if (propCategories !== null) return;

    let isMounted = true;
    const fetchCategories = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get("/support/categories");
        if (isMounted) {
          if (res.data?.success && Array.isArray(res.data?.categories)) {
            setCategories(res.data.categories);
          } else {
            setCategories([]);
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching support categories:", err);
          setError("Unable to load support information. Please try again.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      isMounted = false;
    };
  }, [propCategories]);

  const normalizedQuery = (searchQuery || "").trim().toLowerCase();

  const filteredCategories = categories.filter((cat) => {
    if (!normalizedQuery) return true;
    const name = (cat.name || cat.title || "").toLowerCase();
    const desc = (cat.description || "").toLowerCase();
    return name.includes(normalizedQuery) || desc.includes(normalizedQuery);
  });

  const handleCategoryClick = (category) => {
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  return (
    <section className="support-categories-section" aria-labelledby="support-grid-heading">
      <div className="support-categories-container">
        {/* Section Heading & Subtitle */}
        <div className="support-grid-header">
          <h2 id="support-grid-heading" className="support-grid-title">
            How can we help?
          </h2>
          <p className="support-grid-subtitle">
            Choose a topic to find the information you need.
          </p>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="support-loading-container" style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>
            <div className="support-loading-spinner" style={{ margin: "0 auto 12px", width: 36, height: 36, border: "3px solid #e2e8f0", borderTopColor: "#2b388f", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <p>Loading support categories...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="support-error-card" style={{ textAlign: "center", padding: "36px 20px", background: "#fef2f2", border: "1px solid #fee2e2", borderRadius: 10, color: "#991b1b", maxWidth: 540, margin: "20px auto" }}>
            <p style={{ margin: "0 0 14px", fontSize: 14.5 }}>{error}</p>
            <button
              type="button"
              className="support-retry-btn"
              onClick={() => {
                setLoading(true);
                setError(null);
                api.get("/support/categories")
                  .then((res) => {
                    if (res.data?.success && Array.isArray(res.data?.categories)) {
                      setCategories(res.data.categories);
                    }
                  })
                  .catch(() => setError("Unable to load support information. Please try again."))
                  .finally(() => setLoading(false));
              }}
              style={{ padding: "8px 18px", background: "#2b388f", color: "#fff", border: "none", borderRadius: 6, fontWeight: 600, cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        ) : filteredCategories.length > 0 ? (
          /* Categories Grid */
          <div className="support-category-grid">
            {filteredCategories.map((category) => (
              <SupportCategoryCard
                key={category._id || category.id}
                category={category}
                onClick={handleCategoryClick}
              />
            ))}
          </div>
        ) : (
          /* Empty Search / No Results State */
          <div className="support-no-results">
            <p>
              No support topics found matching "<strong>{searchQuery}</strong>"
            </p>
            <small>
              Try searching for orders, payments, delivery, returns, or warranty.
            </small>
          </div>
        )}
      </div>
    </section>
  );
};

export default SupportCategoryGrid;
