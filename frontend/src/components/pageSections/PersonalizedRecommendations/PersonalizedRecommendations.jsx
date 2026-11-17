import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  MdChevronLeft,
  MdChevronRight,
  MdFavorite,
  MdFavoriteBorder,
  MdAutoAwesome,
} from "react-icons/md";
import { FiCompass, FiShoppingCart } from "react-icons/fi";
import api, { useWishlist } from "../../../api/axios";
import socket from "../../../socket/socket";
import ProductSizeModal from "../../ProductSizeModal";
import "./PersonalizedRecommendations.css";

const PersonalizedRecommendations = () => {
  const [products, setProducts] = useState([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const scrollRef = useRef(null);
  const { isWishlisted, handleToggle } = useWishlist();

  // Get logged-in user details if available
  const user = (() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })();

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

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);

      // Collect guest browsing IDs if not logged in
      let guestQuery = "";
      const guestStored = localStorage.getItem("recently_viewed_guest");
      if (guestStored) {
        try {
          const parsed = JSON.parse(guestStored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const ids = parsed.slice(0, 5).map((p) => p.productId || p._id).filter(Boolean);
            if (ids.length > 0) {
              guestQuery = `&guestProductIds=${encodeURIComponent(ids.join(","))}`;
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      const res = await api.get(`/recommendations/for-you?limit=16${guestQuery}`);
      if (res.data?.success && Array.isArray(res.data?.products)) {
        setProducts(res.data.products);
        setReason(res.data.reason || "");
      }
    } catch (err) {
      console.warn("Failed to fetch personalized recommendations:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecommendations();

    const handleDataChange = () => {
      fetchRecommendations();
    };

    socket.on("product_updated", handleDataChange);
    socket.on("price_drop", handleDataChange);
    window.addEventListener("authChanged", handleDataChange);

    return () => {
      socket.off("product_updated", handleDataChange);
      socket.off("price_drop", handleDataChange);
      window.removeEventListener("authChanged", handleDataChange);
    };
  }, [fetchRecommendations]);

  const handleScroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = direction === "left" ? -460 : 460;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  if (!loading && products.length === 0) {
    return null;
  }

  const firstName = user?.name ? user.name.split(" ")[0] : "";
  // Show 8-10 products in the carousel
  const carouselProducts = products.slice(0, 10);

  return (
    <section className="personalized-recommendations-section">
      <div className="personalized-recommendations-container">
        {/* Section Header */}
        <div className="personalized-header">
          <div className="personalized-title-col">
            <div className="personalized-kicker">
              <MdAutoAwesome className="kicker-sparkle-icon" />
              <span>Personalized For You</span>
            </div>
            <h2 className="personalized-heading">
              {firstName ? `Recommended For You, ${firstName}` : "Recommended For You"}
            </h2>
            {reason && (
              <p className="personalized-subheading">
                <FiCompass className="subheading-compass-icon" />
                {reason}
              </p>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="personalized-controls">
            <button
              type="button"
              className="personalized-nav-btn"
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
            >
              <MdChevronLeft size={22} />
            </button>
            <button
              type="button"
              className="personalized-nav-btn"
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
            >
              <MdChevronRight size={22} />
            </button>
          </div>
        </div>

        {/* Carousel Row */}
        <div className="personalized-carousel" ref={scrollRef}>
          {carouselProducts.map((prod) => {
            if (!prod) return null;

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

            return (
              <div key={prod._id} className="personalized-card">
                {/* Wishlist Button */}
                <button
                  type="button"
                  className={`personalized-wishlist-btn ${wishlisted ? "active" : ""}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(prod);
                  }}
                  title={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
                >
                  {wishlisted ? (
                    <MdFavorite className="wishlist-heart-filled" />
                  ) : (
                    <MdFavoriteBorder className="wishlist-heart-outline" />
                  )}
                </button>

                <Link to={`/product/${prod._id}`} className="personalized-card-link">
                  {/* Image Container */}
                  <div className="personalized-image-wrap">
                    <img
                      src={getImageUrl(primaryImage) || "/placeholder.png"}
                      alt={prod.name || "Product"}
                      className="personalized-image"
                      loading="lazy"
                    />

                    {/* Discount Pill */}
                    {discountPercent > 0 && (
                      <span className="personalized-discount-pill">
                        {discountPercent}% OFF
                      </span>
                    )}

                    {/* Stock Urgency Tag */}
                    {prod.stock > 0 && prod.stock <= 5 && (
                      <span className="personalized-stock-pill">Only {prod.stock} left!</span>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="personalized-card-info">
                    {prod.brand && (
                      <span className="personalized-brand">{prod.brand}</span>
                    )}

                    <h3 className="personalized-name" title={prod.name}>
                      {prod.name}
                    </h3>

                    {/* Rating & Reviews */}
                    <div className="personalized-rating-row">
                      <span className="personalized-stars">
                        {getRatingStars(prod.rating || prod.averageRating)}
                      </span>
                      <span className="personalized-rating-val">
                        {Number(prod.rating || prod.averageRating || 5).toFixed(1)}
                      </span>
                      {(prod.reviewCount || prod.review) > 0 && (
                        <span className="personalized-reviews-count">
                          ({prod.reviewCount || prod.review})
                        </span>
                      )}
                    </div>

                    {/* Price Row */}
                    <div className="personalized-price-row">
                      <span className="personalized-current-price">
                        {formatPrice(effectivePrice)}
                      </span>
                      {hasDiscount && (
                        <span className="personalized-old-price">
                          {formatPrice(originalPrice)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                {/* Quick Add To Cart Button */}
                <div className="personalized-card-footer">
                  <button
                    type="button"
                    className="personalized-add-btn"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedProduct(prod);
                    }}
                  >
                    <FiShoppingCart size={14} />
                    <span>Quick Add</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Size / Variant Modal when clicking Quick Add */}
      {selectedProduct && (
        <ProductSizeModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
};

export default PersonalizedRecommendations;
