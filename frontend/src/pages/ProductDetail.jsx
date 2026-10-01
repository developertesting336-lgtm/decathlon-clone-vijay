import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiShield,
  FiRotateCcw,
  FiWind,
  FiDroplet,
  FiLayers,
  FiChevronRight,
  FiShare2,
  FiEdit2,
} from "react-icons/fi";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import toast from "react-hot-toast";

import api, { useWishlist } from "../api/axios";
import socket from "../socket/socket";
import Navbar from "../components/Navbar";
import Footer from "../components/pageSections/Footer/Footer";
import ProductReviews, { StarRating } from "../components/ProductReviews/ProductReviews";
import SizeGuide from "../components/SizeGuide/SizeGuide";
import RelatedProducts from "../components/RelatedProducts/RelatedProducts";
import NotifyMe from "../components/NotifyMe/NotifyMe";
import "../styles/ProductDetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  // Core product states
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection states
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);

  // Pincode check
  const [pincode, setPincode] = useState("560001");

  // Accordion triggers
  const [openAccordion, setOpenAccordion] = useState(null);

  // Size chart modal
  const [showSizeModal, setShowSizeModal] = useState(false);

  // Rating and reviews summary
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: 0,
    reviewCount: 0,
  });

  const handleRatingUpdate = useCallback(({ averageRating, reviewCount }) => {
    setRatingSummary({ averageRating, reviewCount });
    setProduct((prev) =>
      prev ? { ...prev, averageRating, reviewCount } : prev
    );
  }, []);

  // Price formatter
  const formatPrice = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

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

  // Scroll to top on id change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  // Fetch product by ID
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/products/${id}`);
        const prod = response.data?.product;

        if (!prod) {
          setError("Product not found");
          return;
        }

        setProduct(prod);
        setRatingSummary({
          averageRating: Number(prod.averageRating || prod.rating || prod.review || 0),
          reviewCount: Number(prod.reviewCount || 0),
        });
        document.title = `${prod.name || "Product"} | Decathlon`;

        if (Array.isArray(prod.color) && prod.color.length > 0) {
          setSelectedColor(prod.color[0]);
        } else {
          setSelectedColor("");
        }

        if (Array.isArray(prod.size) && prod.size.length > 0) {
          setSelectedSize(prod.size[0]);
        } else {
          setSelectedSize("");
        }
      } catch (err) {
        console.error("Fetch Product Detail Error:", err);
        setError(err.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }

    const handleProductRealtime = (payload) => {
      const updatedId = payload?.productId || payload?.product?._id || payload?._id;
      if (updatedId === id) {
        if (payload?.type === "product_deleted") {
          setError("This product has been removed");
        } else {
          fetchProduct();
        }
      }
    };

    socket.on("product_updated", handleProductRealtime);
    socket.on("product_deleted", handleProductRealtime);

    return () => {
      socket.off("product_updated", handleProductRealtime);
      socket.off("product_deleted", handleProductRealtime);
    };
  }, [id]);

  // Pricing calculations
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;
  }, [product]);

  // Delivery estimation
  const deliveryDateString = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const handleCheckPincode = () => {
    if (!pincode || pincode.trim().length !== 6 || isNaN(pincode)) {
      toast.error("Please enter a valid 6-digit Pincode");
      return;
    }
    toast.success("Delivery is available for this pincode!");
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    } else {
      toast.success("Share product ID: " + (product?._id?.slice(-7) || "8404222"));
    }
  };

  // Add to cart handler
  const handleAddToCart = async (targetProduct = product, targetSize = selectedSize, targetColor = selectedColor) => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    const sizes = Array.isArray(targetProduct.size) ? targetProduct.size : [];
    if (sizes.length > 0 && !targetSize) {
      toast.error("Please select a size");
      return;
    }

    try {
      setAddingToCart(true);
      await api.post(
        "/cart",
        {
          productId: targetProduct._id,
          quantity: 1,
          size: targetSize || "",
          color: targetColor || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("Added to cart successfully!");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Add to cart error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired, please login again");
        navigate("/login");
        return;
      }
      toast.error(err.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <div className="product-detail-container">
          <div style={{ minHeight: "450px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", color: "#666" }}>
            Loading product details...
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <div className="product-detail-container">
          <div style={{ minHeight: "450px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "14px" }}>
            <h2>{error || "Product Not Found"}</h2>
            <Link to="/" style={{ color: "#3643ba", fontWeight: 600, textDecoration: "underline" }}>
              Return to Homepage
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [""];
  const displayImages = images.slice(0, 4);
  const remainingImagesCount = images.length > 4 ? images.length - 4 : 0;

  return (
    <div className="product-detail-page">
      <Navbar />

      <main className="product-detail-container">
        {/* =====================================================
            SUB-NAV BAR (All Sports, Men, Women, Kids + Location)
        ===================================================== */}
        <div className="pdp-subnav-bar">
          <div className="pdp-sports-categories">
            <Link to="/monsoon-essentials">All Sports</Link>
            <Link to="/monsoon-essentials">Men</Link>
            <Link to="/monsoon-essentials">Women</Link>
            <Link to="/monsoon-essentials">Kids</Link>
          </div>

          <div className="pdp-location-indicator">
            Delivery to <span className="blue-loc">Bangalore Central, Bangalore, {pincode}, Karnataka</span>
          </div>
        </div>

        {/* =====================================================
            MAIN 2-COLUMN GRID (MOSAIC LEFT + BUYBOX RIGHT)
        ===================================================== */}
        <div className="pdp-main-grid">
          {/* LEFT: 2-COLUMN IMAGE MOSAIC (SCREENSHOT 1 & 3) */}
          <div className="pdp-mosaic-container">
            {displayImages.map((img, idx) => (
              <div key={idx} className="pdp-mosaic-item">
                <img src={getImageUrl(img)} alt={`${product.name} view ${idx + 1}`} />
                {idx === 3 && remainingImagesCount > 0 && (
                  <span className="pdp-mosaic-badge-more">{remainingImagesCount} more</span>
                )}
              </div>
            ))}
          </div>

          {/* RIGHT: STICKY BUY BOX (SCREENSHOT 1 & 2) */}
          <div className="pdp-buybox-sticky">
            {/* Brand & ID Share */}
            <div className="pdp-brand-row">
              <span className="pdp-brand-text">{product.brand || "DOMYOS"}</span>
              <div className="pdp-id-share-box">
                <span>ID {product._id?.slice(-7).toUpperCase() || "8404222"}</span>
                <button type="button" className="pdp-share-icon-btn" onClick={handleShare} aria-label="Share">
                  <FiShare2 />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="pdp-main-title">{product.name}</h1>

            {/* Rating Line */}
            <div className="pdp-rating-strip">
              <StarRating rating={ratingSummary.averageRating} size={15} />
              <span className="pdp-rating-num">
                {ratingSummary.averageRating > 0
                  ? ratingSummary.averageRating.toFixed(1)
                  : "0.0"}
              </span>
              <span style={{ color: "#ccc" }}>|</span>
              <a href="#customer-reviews" className="pdp-reviews-link-blue">
                {ratingSummary.reviewCount}{" "}
                {ratingSummary.reviewCount === 1 ? "review" : "reviews"}
              </a>
            </div>

            {/* Price Line */}
            <div className="pdp-price-row-wrap">
              <span className="pdp-current-price-val">{formatPrice(currentPrice)}</span>
              {product.price && product.price > currentPrice && (
                <span className="pdp-mrp-strike-val">MRP {formatPrice(product.price)}</span>
              )}
            </div>

            {/* Colour Selection */}
            <div className="pdp-colour-section">
              <div className="pdp-colour-header-row">
                <span className="pdp-colour-label">Colour</span>
                <span className="pdp-colour-count-text">
                  {Array.isArray(product.color) && product.color.length > 0
                    ? `${product.color.length} colours`
                    : "4 colours"}
                </span>
              </div>

              <div className="pdp-colour-thumbnails-row">
                {Array.isArray(product.color) && product.color.length > 0 ? (
                  product.color.map((color, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`pdp-colour-card-btn ${selectedColor === color ? "active" : ""}`}
                      onClick={() => {
                        setSelectedColor(color);
                        toast.success(`Selected color: ${color}`, { id: "pdp-color-toast" });
                      }}
                      title={color}
                    >
                      <img src={getImageUrl(images[idx % images.length])} alt={color} />
                    </button>
                  ))
                ) : (
                  [0, 1, 2, 3].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`pdp-colour-card-btn ${idx === 0 ? "active" : ""}`}
                    >
                      <img src={getImageUrl(images[idx % images.length])} alt={`Color option ${idx + 1}`} />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Size Selection */}
            <div className="pdp-size-section">
              <div className="pdp-size-header-row">
                <span className="pdp-size-label-text">Select size</span>
                {Boolean(
                  product.category ||
                    (Array.isArray(product.categories) && product.categories.length > 0)
                ) && (
                  <button
                    type="button"
                    className="pdp-size-chart-btn"
                    onClick={() => setShowSizeModal(true)}
                    id="pdp-size-guide-trigger"
                    aria-label="Open size guide"
                  >
                    ðŸ“ Size Guide
                  </button>
                )}
              </div>

              <div className="pdp-fit-text-muted">72% of users say this fits as expected</div>

              <div className="pdp-size-boxes-row">
                {Array.isArray(product.size) && product.size.length > 0 ? (
                  product.size.map((sz, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`pdp-size-btn-rect ${selectedSize === sz ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSize(sz);
                        toast.success(`Selected size: ${sz}`, { id: "pdp-size-toast" });
                      }}
                    >
                      {sz}
                    </button>
                  ))
                ) : (
                  ["S", "M", "L", "XL", "2XL"].map((sz, idx) => (
                    <button
                      key={sz}
                      type="button"
                      className={`pdp-size-btn-rect ${selectedSize === sz || (!selectedSize && idx === 0) ? "active" : ""}`}
                      onClick={() => {
                        setSelectedSize(sz);
                        toast.success(`Selected size: ${sz}`, { id: "pdp-size-toast" });
                      }}
                    >
                      {sz}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Action Buttons: Wishlist + Add to Cart OR Notify Me When Available */}
            {Number(product.stock || 0) <= 0 ? (
              <NotifyMe
                productId={product._id}
                product={product}
                isWishlisted={isWishlisted(product._id)}
                onToggleWishlist={() => handleToggle(product._id)}
              />
            ) : (
              <div className="pdp-actions-row">
                <button
                  type="button"
                  className={`pdp-heart-btn ${isWishlisted(product._id) ? "active" : ""}`}
                  onClick={() => handleToggle(product._id)}
                  aria-label="Wishlist"
                >
                  {isWishlisted(product._id) ? <MdFavorite /> : <MdFavoriteBorder />}
                </button>

                <button
                  type="button"
                  className="pdp-add-cart-btn-decathlon"
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCart}
                >
                  {addingToCart ? "Adding..." : "Add to cart"}
                </button>
              </div>
            )}

            {/* Guarantees Strip */}
            <div className="pdp-guarantees-strip">
              <div className="pdp-guarantee-line">
                <div className="pdp-guarantee-item">
                  <FiShield /> <span>2 year warranty</span>
                </div>
                <div className="pdp-guarantee-item">
                  <span>ðŸ‡®ðŸ‡³</span> <span>Made In India</span>
                </div>
              </div>
              <div className="pdp-guarantee-line">
                <div className="pdp-guarantee-item">
                  <FiRotateCcw style={{ color: "#f57c00" }} /> <span>30 days return</span>
                </div>
              </div>
            </div>

            {/* Delivery & Services Box */}
            <div className="pdp-delivery-card-box">
              <div className="pdp-delivery-title-bold">Delivery & services</div>
              <div className="pdp-sold-by-subtext">Sold and fulfilled by: Decathlon Sports India Pvt Ltd</div>

              <div className="pdp-pincode-input-frame">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
                  placeholder="560001"
                />
                <button type="button" className="pdp-pincode-edit-btn" onClick={handleCheckPincode} aria-label="Edit Pincode">
                  <FiEdit2 />
                </button>
              </div>

              <div className="pdp-service-bullet-row">
                <span className="pdp-green-dot"></span>
                <div className="pdp-bullet-content">
                  <strong>Standard delivery by {deliveryDateString}</strong>
                  <span className="pdp-green-order-timer">Order within 8hrs 8mins</span>
                </div>
              </div>

              <div className="pdp-service-bullet-row">
                <span className="pdp-green-dot"></span>
                <div className="pdp-bullet-content">
                  <strong>Pick up from store within 2 Hours for FREE</strong>
                  <span
                    className="pdp-view-stores-link"
                    onClick={() => toast("Pickup available at nearest Decathlon store")}
                  >
                    View stores
                  </span>
                </div>
              </div>

              <div className="pdp-pod-line">
                <span className="pdp-green-dot"></span>
                <span>Pay on Delivery available *</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BENEFITS SECTION (SCREENSHOT 3 & 4)
        ===================================================== */}
        <section className="pdp-benefits-section-decathlon" id="benefits-section">
          <h3>Benefits</h3>

          <div className="pdp-benefits-cards-grid">
            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiLayers />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Pockets</h4>
                <p>Two large zip pockets on the sides.</p>
              </div>
            </div>

            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiWind />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Ventilation</h4>
                <p>Mesh panel at the back for ventilation.</p>
              </div>
            </div>

            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiDroplet />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Moisture Management</h4>
                <p>Breathable, quick-drying fabric to keep you dry.</p>
              </div>
            </div>
          </div>

          {/* 2-Column Accordion Triggers (Screenshot 4) */}
          <div className="pdp-accordion-two-columns">
            <div>
              <div
                className="pdp-accordion-trigger-row"
                onClick={() => setOpenAccordion(openAccordion === "details" ? null : "details")}
              >
                <span className="trigger-title">Product details</span>
                <FiChevronRight />
              </div>

              <div
                className="pdp-accordion-trigger-row"
                onClick={() => setOpenAccordion(openAccordion === "tech" ? null : "tech")}
              >
                <span className="trigger-title">Technical information</span>
                <FiChevronRight />
              </div>
            </div>

            <div>
              <div
                className="pdp-accordion-trigger-row"
                onClick={() => setOpenAccordion(openAccordion === "specs" ? null : "specs")}
              >
                <span className="trigger-title">Product specifications</span>
                <FiChevronRight />
              </div>
            </div>

            {openAccordion && (
              <div className="pdp-drawer-content-pane">
                {openAccordion === "details" && (
                  <p>
                    {product.description ||
                      "Our passionate gym team developed these lightweight trackpants for regular gym cardio training. The ergonomic cut provides absolute ease of movement."}
                  </p>
                )}
                {openAccordion === "specs" && (
                  <div>
                    <strong>Main fabric:</strong> 100% Recycled Polyester | <strong>Fit:</strong> Slim Fit / Jogger Style | <strong>Brand:</strong> {product.brand || "DOMYOS"} | <strong>Model Code:</strong> 8404222
                  </div>
                )}
                {openAccordion === "tech" && (
                  <div>
                    <strong>Care Advice:</strong> Wash inside out at 30Â°C. Quick-dry synthetic mesh. Do not dry clean or bleach.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            "KNOW YOUR PRODUCT" BLACK BANNER (SCREENSHOT 4)
        ===================================================== */}
        <section className="pdp-know-product-section">
          <h2>Know your Product</h2>
          <p className="subtext">
            Our products are built to elevate experience and drive you to your full potential with comfort and ease like never before
          </p>

          <div className="pdp-know-grid">
            <div className="pdp-know-tile">
              <span className="pill">Fabric used</span>
              <h4>Breathable & Quick-Dry</h4>
              <p>Breathable, quick-drying fabric to keep you dry.</p>
            </div>

            <div className="pdp-know-tile">
              <span className="pill">Airy</span>
              <h4>Mesh panel at back</h4>
              <p>Mesh panel at the back for ventilation.</p>
            </div>

            <div className="pdp-know-tile">
              <span className="pill">Storage</span>
              <h4>Two large zip pockets</h4>
              <p>Two large zip pockets on the sides.</p>
            </div>
          </div>
        </section>

        {/* =====================================================
            RELATED PRODUCTS ("You May Also Like" - Live API)
        ===================================================== */}
        <RelatedProducts productId={id} title="You May Also Like" />

        {/* =====================================================
            CUSTOMER REVIEWS & BREAKDOWN (Live API)
        ===================================================== */}
        <ProductReviews
          productId={id}
          product={product}
          onRatingUpdate={handleRatingUpdate}
        />

        {/* =====================================================
            BOTTOM PERKS STRIP (PDF Page 10)
        ===================================================== */}
        <div className="pdp-perks-bottom-strip">
          <div className="pdp-perk-node">Easy Returns*</div>
          <div className="pdp-perk-node">Collect in-store</div>
          <div className="pdp-perk-node">Express Delivery*</div>
          <div className="pdp-perk-node">1 Mn+ happy customers</div>
          <div className="pdp-perk-node">We buy back</div>
        </div>
      </main>

      {/* =====================================================
          CATEGORY-BASED SIZE GUIDE MODAL
      ===================================================== */}
      {showSizeModal && (
        <SizeGuide
          product={product}
          categoryId={
            product.category?._id ||
            product.category ||
            (Array.isArray(product.categories) && product.categories[0]?._id) ||
            (Array.isArray(product.categories) && product.categories[0])
          }
          gender={product.gender}
          isOpen={showSizeModal}
          onClose={() => setShowSizeModal(false)}
        />
      )}

      <Footer />
    </div>
  );
};

export default ProductDetail;

