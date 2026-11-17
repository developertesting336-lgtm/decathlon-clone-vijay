import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";
import { FiTrendingDown, FiClock, FiTrash2 } from "react-icons/fi";
import api from "../../../api/axios";
import socket from "../../../socket/socket";
import "./RecentlyViewedSection.css";

const RecentlyViewedSection = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  const getImageUrl = (image) => {
    if (!image) return null;
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  const getRatingStars = (rating) => {
    const value = rating ? Math.min(5, Math.max(0, Number(rating))) : 5;
    const filledStars = Math.round(value);
    return `${"★".repeat(filledStars)}${"☆".repeat(5 - filledStars)}`;
  };

  const fetchRecentlyViewed = useCallback(async () => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("userToken");
      if (token) {
        // Sync any guest items from localStorage if available
        const guestData = localStorage.getItem("recently_viewed_guest");
        if (guestData) {
          try {
            const guestList = JSON.parse(guestData);
            if (Array.isArray(guestList) && guestList.length > 0) {
              await Promise.allSettled(
                guestList.slice(0, 5).map((g) =>
                  api.post("/recently-viewed", { productId: g.productId || g._id })
                )
              );
              localStorage.removeItem("recently_viewed_guest");
            }
          } catch (e) {
            console.warn("Guest view sync error:", e);
          }
        }

        const res = await api.get("/recently-viewed?limit=15");
        if (res.data?.success && Array.isArray(res.data?.items)) {
          setItems(res.data.items);
          setLoading(false);
          return;
        }
      }

      // Guest / unauthenticated fallback from localStorage
      const guestStored = localStorage.getItem("recently_viewed_guest");
      if (guestStored) {
        const parsed = JSON.parse(guestStored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(
            parsed.map((p) => ({
              _id: p._id || p.productId,
              product: p.product || p,
              viewedPrice: p.viewedPrice || p.price,
              currentPrice: p.product?.discountPrice || p.discountPrice || p.price,
              hasPriceDropped:
                (p.product?.discountPrice || p.discountPrice || p.price) <
                (p.viewedPrice || p.price),
              discountAmount: Math.max(
                0,
                (p.viewedPrice || p.price) -
                  (p.product?.discountPrice || p.discountPrice || p.price)
              ),
              lastViewedAt: p.lastViewedAt || new Date().toISOString(),
            }))
          );
        } else {
          setItems([]);
        }
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn("Failed to fetch recently viewed items:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentlyViewed();

    // Listen to live price updates or offer announcements
    const handleProductChange = () => {
      fetchRecentlyViewed();
    };

    socket.on("price_drop", handleProductChange);
    socket.on("product_updated", handleProductChange);
    socket.on("offer_alert", handleProductChange);

    return () => {
      socket.off("price_drop", handleProductChange);
      socket.off("product_updated", handleProductChange);
      socket.off("offer_alert", handleProductChange);
    };
  }, [fetchRecentlyViewed]);

  const handleClearAll = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("userToken");
      if (token) {
        await api.delete("/recently-viewed");
      }
      localStorage.removeItem("recently_viewed_guest");
      setItems([]);
    } catch (err) {
      console.error("Failed to clear recently viewed:", err);
    }
  };

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -400 : 400;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // If there are no items, hide the section entirely
  if (!loading && items.length === 0) {
    return null;
  }

  // Count items with price drops
  const priceDroppedCount = items.filter((i) => i.hasPriceDropped).length;

  return (
    <section className="recently-viewed-section">
      <div className="recently-viewed-container">
        {/* Header */}
        <div className="recently-viewed-header">
          <div className="recently-viewed-title-wrap">
            <h2 className="recently-viewed-title">
              <FiClock className="recently-viewed-clock-icon" />
              Recently Viewed
            </h2>
            {priceDroppedCount > 0 ? (
              <span className="recently-viewed-deal-badge">
                <FiTrendingDown /> {priceDroppedCount} item{priceDroppedCount > 1 ? "s" : ""}{" "}
                dropped in price!
              </span>
            ) : (
              <span className="recently-viewed-subtitle">
                Pick up right where you left off
              </span>
            )}
          </div>

          <div className="recently-viewed-controls">
            <button
              className="recently-viewed-clear-btn"
              onClick={handleClearAll}
              title="Clear recently viewed history"
            >
              <FiTrash2 size={13} />
              Clear
            </button>
            <button
              className="recently-viewed-nav-btn"
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
            >
              <MdChevronLeft size={22} />
            </button>
            <button
              className="recently-viewed-nav-btn"
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
            >
              <MdChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* Carousel Row */}
        <div className="recently-viewed-carousel" ref={scrollRef}>
          {items.map((item) => {
            const prod = item.product;
            if (!prod) return null;

            const primaryImage =
              Array.isArray(prod.images) && prod.images.length > 0
                ? prod.images[0]
                : prod.image || "/placeholder.png";

            const effectivePrice = item.currentPrice || prod.discountPrice || prod.price;
            const originalPrice = prod.price;
            const hasDiscount = prod.discountPrice && prod.discountPrice < prod.price;
            const discountPercent = hasDiscount
              ? Math.round(((prod.price - prod.discountPrice) / prod.price) * 100)
              : 0;

            return (
              <div key={item._id || prod._id} className="recently-viewed-card">
                <Link
                  to={`/product/${prod._id}`}
                  className="recently-viewed-card-link"
                >
                  <div className="recently-viewed-image-wrap">
                    <img
                      src={getImageUrl(primaryImage) || "/placeholder.png"}
                      alt={prod.name || "Product"}
                      className="recently-viewed-image"
                      loading="lazy"
                    />

                    {/* Price Drop Alert Badge */}
                    {item.hasPriceDropped ? (
                      <div className="recently-viewed-drop-tag">
                        <FiTrendingDown /> Price Drop -₹{item.discountAmount}
                      </div>
                    ) : discountPercent > 0 ? (
                      <div className="recently-viewed-discount-tag">
                        {discountPercent}% OFF
                      </div>
                    ) : null}
                  </div>

                  <div className="recently-viewed-info">
                    {prod.brand && (
                      <span className="recently-viewed-brand">{prod.brand}</span>
                    )}
                    <h3 className="recently-viewed-name" title={prod.name}>
                      {prod.name}
                    </h3>

                    {/* Rating */}
                    <div className="recently-viewed-rating">
                      <span className="recently-viewed-stars">
                        {getRatingStars(prod.rating || prod.averageRating)}
                      </span>
                      <span className="recently-viewed-rating-num">
                        {Number(prod.rating || prod.averageRating || 5).toFixed(1)}
                      </span>
                    </div>

                    {/* Pricing */}
                    <div className="recently-viewed-pricing">
                      <span className="recently-viewed-current-price">
                        {formatPrice(effectivePrice)}
                      </span>
                      {hasDiscount || item.hasPriceDropped ? (
                        <span className="recently-viewed-old-price">
                          {formatPrice(item.hasPriceDropped ? item.viewedPrice : originalPrice)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewedSection;
