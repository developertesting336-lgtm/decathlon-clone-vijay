import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../api/axios";
import ProductSizeModal from "../ProductSizeModal";
import "../../styles/ProductSizeModal.css";
import "./RelatedProducts.css";

const RelatedProducts = ({ productId, title = "You May Also Like", onProductsLoaded }) => {
  const navigate = useNavigate();
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const { isWishlisted, handleToggle } = useWishlist();

  // Modal states for Add to Cart
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // Price formatting
  const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

  // Image URL helper (reusing Cloudinary and server upload resolution)
  const getImageUrl = (image) => {
    if (!image) return "";
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  // Extract brand and clean name so brand is not repeated in title
  const getBrandAndTitle = (product) => {
    const brand = (product?.brand || "DOMYOS").trim();
    let name = (product?.name || "").trim();
    if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
      name = name.slice(brand.length).trim();
    }
    return { brand, name };
  };

  // Generate 5-star string
  const getRatingStars = (rating) => {
    const value = rating ? Math.min(5, Math.max(0, Number(rating))) : 5;
    const filledStars = Math.round(value);
    return `${"★".repeat(filledStars)}${"☆".repeat(5 - filledStars)}`;
  };

  // Format review count (e.g. 1 or 4.5k)
  const formatReviewCount = (prod) => {
    const val =
      prod.reviewCount !== undefined && prod.reviewCount !== null && prod.reviewCount !== ""
        ? prod.reviewCount
        : prod.numReviews !== undefined && prod.numReviews !== null
        ? prod.numReviews
        : prod.review || prod.rating;

    if (val === undefined || val === null || val === "") return "1";
    if (typeof val === "string") return val;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : `${num}`;
    }
    return "1";
  };

  // Modal open / close handlers
  const handleOpenAddToCart = (product) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add items to cart");
      return;
    }
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
    setAdding(false);
  };

  const handleCloseModal = () => {
    if (adding) return;
    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
  };

  // Add to cart submission
  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please login first");
      return;
    }

    const sizes = Array.isArray(selectedProduct.size)
      ? selectedProduct.size
      : selectedProduct.size
      ? [selectedProduct.size]
      : [];
    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }

    try {
      setAdding(true);
      const response = await api.post(
        "/cart",
        {
          productId: selectedProduct._id,
          quantity: Number(quantity),
          size: selectedSize || "",
          color: selectedColor || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));

      setSelectedProduct(null);
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      if (error?.response?.status === 401) {
        toast.error("Please login again");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to add product to cart");
    } finally {
      setAdding(false);
    }
  };

  // Restock notification for related products
  const handleNotifyMeRelated = async (prod) => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate(`/product/${prod._id}`);
      return;
    }

    try {
      let email = "";
      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        email = stored?.email || "";
      } catch {}

      const res = await api.post("/stock-notifications", {
        productId: prod._id,
        ...(email ? { email } : {}),
      });

      if (res.data?.alreadySubscribed) {
        toast("You're already subscribed for this product.");
      } else {
        toast.success("You'll be notified when this product is back in stock.");
      }
    } catch {
      navigate(`/product/${prod._id}`);
    }
  };

  // Scroll buttons state tracker
  const updateScrollButtons = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  }, []);

  const handleScroll = (direction) => {
    if (!sliderRef.current) return;
    const container = sliderRef.current;
    const scrollAmount = container.clientWidth * 0.75;
    container.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  // Fetch related products for the current productId
  useEffect(() => {
    if (!productId) {
      setRelatedProducts([]);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();

    const fetchRelated = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/products/${productId}/related`, {
          signal: controller.signal,
        });

        if (!isMounted) return;

        const rawList = response.data?.products || [];
        // Safety check: ensure current product is excluded and items are valid
        const filteredList = rawList.filter(
          (item) => item && String(item._id) !== String(productId)
        );

        setRelatedProducts(filteredList);
        if (typeof onProductsLoaded === "function") {
          onProductsLoaded(filteredList);
        }
      } catch (err) {
        if (err.name === "CanceledError" || err.name === "AbortError") {
          return;
        }
        console.error("Fetch Related Products Error:", err);
        if (isMounted) {
          setError(err.message || "Failed to load related products");
          setRelatedProducts([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchRelated();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [productId, onProductsLoaded]);

  useEffect(() => {
    const slider = sliderRef.current;
    if (!slider) return;
    updateScrollButtons();
    slider.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      slider.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [relatedProducts, loading, updateScrollButtons]);

  // If loading, show shimmer skeleton
  if (loading) {
    return (
      <section className="related-products-section" aria-label="Loading related products">
        <div className="related-products-header">
          <div className="related-products-title-group">
            <h3>{title}</h3>
            <span className="related-products-subtitle">Finding matching gear...</span>
          </div>
        </div>

        <div className="related-products-slider">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="related-skeleton-card">
              <div className="related-skeleton-img" />
              <div className="related-skeleton-body">
                <div className="related-skeleton-line short" />
                <div className="related-skeleton-line full" />
                <div className="related-skeleton-line medium" />
                <div className="related-skeleton-actions">
                  <div className="related-skeleton-wish" />
                  <div className="related-skeleton-cart" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // If empty or error, do not render section according to requirements
  if (error || !relatedProducts.length) {
    return null;
  }

  return (
    <>
      <section className="related-products-section" aria-label="Related products">
        <div className="related-products-header">
          <div className="related-products-title-group">
            <h3>{title}</h3>
            <span className="related-products-subtitle">Recommended sports products for you</span>
          </div>

          <div className="related-products-arrows">
            <button
              type="button"
              className="related-arrow-btn"
              onClick={() => handleScroll("prev")}
              disabled={!canScrollLeft}
              aria-label="Previous related products"
            >
              <FiChevronLeft />
            </button>
            <button
              type="button"
              className="related-arrow-btn"
              onClick={() => handleScroll("next")}
              disabled={!canScrollRight}
              aria-label="Next related products"
            >
              <FiChevronRight />
            </button>
          </div>
        </div>

        <div className="related-products-slider" ref={sliderRef}>
          {relatedProducts.map((prod, index) => {
            const hasDiscount =
              prod.discountPrice > 0 && prod.discountPrice < prod.price;
            const currentPrice = hasDiscount ? prod.discountPrice : prod.price;
            const mrp = hasDiscount ? prod.price : null;
            const isOutOfStock = Number(prod.stock || 0) <= 0;
            const ratingVal = Number(prod.averageRating || prod.rating || prod.review || 4.5);
            const { brand, name } = getBrandAndTitle(prod);

            return (
              <article key={prod._id} className="related-product-card">
                {/* Product Badge */}
                {isOutOfStock ? (
                  <span className="related-card-badge out-of-stock">Out of stock</span>
                ) : hasDiscount ? (
                  <span className="related-card-badge sale">
                    {prod.discountPercent ? `${prod.discountPercent}% OFF` : "Sale"}
                  </span>
                ) : index === 0 ? (
                  <span className="related-card-badge">Popular</span>
                ) : null}

                {/* Product Image Link */}
                <Link to={`/product/${prod._id}`} className="related-card-img-wrap" tabIndex="-1">
                  {prod.images?.[0] ? (
                    <img
                      src={getImageUrl(prod.images[0])}
                      alt={prod.name || "Product"}
                      loading="lazy"
                    />
                  ) : (
                    <div className="related-img-placeholder">Decathlon</div>
                  )}
                </Link>

                {/* Product Card Body */}
                <div className="related-card-body">
                  <div className="related-card-brand-row">
                    <span className="related-card-brand">{brand}</span>
                    {prod.gender && <span className="related-card-gender">{prod.gender}</span>}
                  </div>

                  <Link
                    to={`/product/${prod._id}`}
                    className="related-card-title"
                    title={prod.name}
                  >
                    {name}
                  </Link>

                  {/* Rating display (Stars + count) */}
                  <div className="related-card-rating">
                    <span className="related-stars">{getRatingStars(ratingVal)}</span>
                    <span className="related-review-count">{formatReviewCount(prod)}</span>
                  </div>

                  {/* Pricing block: Current Price and MRP stacked */}
                  <div className="related-card-pricing">
                    <span className="related-current-price">{formatPrice(currentPrice)}</span>
                    {mrp ? (
                      <span className="related-mrp">MRP {formatPrice(mrp)}</span>
                    ) : (
                      <span className="related-mrp related-mrp-placeholder">
                        MRP {formatPrice(Math.round(currentPrice * 1.35))}
                      </span>
                    )}
                  </div>

                  {/* Actions Row: Wishlist + Add to Cart */}
                  <div className="related-card-actions">
                    <button
                      type="button"
                      className={`related-wishlist-btn ${
                        isWishlisted(prod._id) ? "active" : ""
                      }`}
                      aria-label="Add to wishlist"
                      onClick={() => handleToggle(prod._id)}
                    >
                      {isWishlisted(prod._id) ? (
                        <MdFavorite size={16} />
                      ) : (
                        <MdFavoriteBorder size={16} />
                      )}
                    </button>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        className="related-cart-btn related-notify-btn"
                        onClick={() => handleNotifyMeRelated(prod)}
                        title="Notify me when back in stock"
                      >
                        🔔 Notify Me
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="related-cart-btn"
                        onClick={() => handleOpenAddToCart(prod)}
                      >
                        Add to cart
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Product Size / Add to Cart Modal */}
      {selectedProduct && (
        <ProductSizeModal
          product={selectedProduct}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
          adding={adding}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
        />
      )}
    </>
  );
};

export default RelatedProducts;
