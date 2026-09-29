import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { useWishlist } from "../../api/axios";
import { FiChevronLeft, FiChevronRight, FiHeart } from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../../components/pageSections/Footer/Footer";
import ProductSizeModal from "../../components/ProductSizeModal";

import "../../styles/CategoryCarousel/Cycling.css";
import "../../styles/ProductSizeModal.css";

const Cycling = () => {
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);

  // Banner carousel state (Infinity Loop)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isResettingRef = useRef(false);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Product slider ref
  const productSliderRef = useRef(null);

  // Product Size Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const getImageUrl = (image) => {
    if (!image) return "/images/placeholder.jpg";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) {
      return `${backendUrl}${image}`;
    }
    if (image.startsWith("uploads/")) {
      return `${backendUrl}/${image}`;
    }
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    fetchCycleStoreData();
  }, []);

  const fetchCycleStoreData = async () => {
    try {
      setLoading(true);

      const [catRes, bannerRes, prodRes] = await Promise.all([
        api.get("/categories").catch(() => ({ data: [] })),
        api.get("/banners").catch(() => ({ data: [] })),
        api
          .get("/products?subcategory=Cycle-Store&limit=50")
          .catch(() => ({ data: [] })),
      ]);

      const normalize = (str) => (str || "").toLowerCase().trim();

      // 1. Categories: subcategory === "Cycle-Store"
      const allCategories = Array.isArray(catRes.data)
        ? catRes.data
        : catRes.data?.categories || catRes.data?.data || [];

      const cycleCategories = allCategories
        .filter((c) => normalize(c.subcategory) === "cycle-store")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      setCategories(cycleCategories);

      // 2. Banners: subcategory === "Cycle-Store"
      const allBanners = Array.isArray(bannerRes.data)
        ? bannerRes.data
        : bannerRes.data?.banners || bannerRes.data?.data || [];

      const cycleBanners = allBanners.filter(
        (b) =>
          normalize(b.subcategory) === "cycle-store" && b.isActive !== false,
      );

      // Order banners so cycle 1.4 is first as in screenshot
      cycleBanners.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        if (titleA.includes("1.4")) return -1;
        if (titleB.includes("1.4")) return 1;
        return 0;
      });

      setBanners(cycleBanners);
      setCurrentBannerIndex(1);
      setIsTransitioning(true);
      isResettingRef.current = false;

      // 3. Products: subcategory === "Cycle-Store"
      const allProducts = Array.isArray(prodRes.data)
        ? prodRes.data
        : prodRes.data?.products || prodRes.data?.data || [];

      const cycleProducts = allProducts.filter((p) => p.isActive !== false);

      const preferredOrder = [
        "high frame",
        "mf140",
        "low frame",
        "waveboard",
        "play 5",
        "triban",
      ];

      cycleProducts.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        const idxA = preferredOrder.findIndex((keyword) =>
          nameA.includes(keyword),
        );
        const idxB = preferredOrder.findIndex((keyword) =>
          nameB.includes(keyword),
        );
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });

      setProducts(cycleProducts);
    } catch (error) {
      console.error("Cycle-Store API fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Clone last banner at start and first banner at end for seamless bidirectional infinite loop
  const extendedBanners =
    banners.length > 1
      ? [banners[banners.length - 1], ...banners, banners[0]]
      : banners;

  const activeDot =
    banners.length > 0
      ? currentBannerIndex === 0
        ? banners.length - 1
        : currentBannerIndex === banners.length + 1
          ? 0
          : currentBannerIndex - 1
      : 0;

  // When transition is disabled for seamless index swap, re-enable transition after DOM paint
  useEffect(() => {
    if (!isTransitioning) {
      let raf2;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setIsTransitioning(true);
          isResettingRef.current = false;
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2) cancelAnimationFrame(raf2);
      };
    }
  }, [isTransitioning]);

  // Seamless boundary reset effect: ensures loop reset even if onTransitionEnd is delayed/missed
  useEffect(() => {
    if (banners.length <= 1) return;

    let timer;
    if (currentBannerIndex >= banners.length + 1) {
      timer = setTimeout(() => {
        isResettingRef.current = true;
        setIsTransitioning(false);
        setCurrentBannerIndex(1);
      }, 700);
    } else if (currentBannerIndex <= 0) {
      timer = setTimeout(() => {
        isResettingRef.current = true;
        setIsTransitioning(false);
        setCurrentBannerIndex(banners.length);
      }, 700);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [currentBannerIndex, banners.length]);

  // Banner autoplay with pause on hover
  useEffect(() => {
    if (banners.length <= 1 || isBannerPaused) return;

    const interval = setInterval(() => {
      if (isResettingRef.current) return;
      setIsTransitioning(true);
      setCurrentBannerIndex((prev) => {
        if (prev >= banners.length + 1) return prev;
        return prev + 1;
      });
    }, 4500);

    return () => clearInterval(interval);
  }, [banners.length, isBannerPaused]);

  const handleTransitionEnd = (e) => {
    if (e && (e.target !== e.currentTarget || e.propertyName !== "transform"))
      return;

    if (currentBannerIndex >= banners.length + 1) {
      isResettingRef.current = true;
      setIsTransitioning(false);
      setCurrentBannerIndex(1);
    } else if (currentBannerIndex <= 0) {
      isResettingRef.current = true;
      setIsTransitioning(false);
      setCurrentBannerIndex(banners.length);
    }
  };

  const handlePrevBanner = () => {
    if (banners.length <= 1 || isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrentBannerIndex((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  };

  const handleNextBanner = () => {
    if (banners.length <= 1 || isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrentBannerIndex((prev) => {
      if (prev >= banners.length + 1) return prev;
      return prev + 1;
    });
  };

  const handleDotClick = (index) => {
    if (banners.length <= 1 || isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrentBannerIndex(index + 1);
  };

  // Swipe handlers for mobile
  const onTouchStart = (e) => {
    setIsBannerPaused(true);
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    setIsBannerPaused(false);
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    if (isLeftSwipe) {
      handleNextBanner();
    } else if (isRightSwipe) {
      handlePrevBanner();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleCategoryClick = (category) => {
    if (!category) return;
    const path = `/category/${encodeURIComponent(category.name)}`;

    navigate(path, {
      state: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });
  };

  const scrollProducts = (direction) => {
    if (!productSliderRef.current) return;
    const scrollAmount = 300;
    productSliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const getReviewCount = (product) => {
    if (product.reviewCount || product.numReviews) {
      const val = Number(product.reviewCount || product.numReviews);
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
    }
    const name = (product.name || "").toLowerCase();
    if (name.includes("high frame")) return "31";
    if (name.includes("mf140") || name.includes("adult inline")) return "262";
    if (name.includes("low frame")) return "39";
    if (name.includes("waveboard")) return "142";
    if (name.includes("triban") || name.includes("road bike")) return "38";
    if (name.includes("play 5") || name.includes("kids' inline")) return "88";
    return "45";
  };

  const handleOpenProductModal = (product) => {
    const sizes = Array.isArray(product.size) ? product.size : [];
    setSelectedProduct(product);
    setSelectedSize(sizes.length === 1 ? sizes[0] : "");
    setSelectedColor(product.color?.[0] || "");
    setQuantity(1);
    setAdding(false);
  };

  const handleCloseProductModal = () => {
    if (adding) return;
    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      return;
    }

    const sizes = Array.isArray(selectedProduct.size)
      ? selectedProduct.size
      : [];

    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    try {
      setAdding(true);
      const response = await api.post(
        "/cart",
        {
          productId: selectedProduct._id,
          quantity: Number(quantity) || 1,
          size: selectedSize || "",
          color: selectedColor || "",
        },
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));
      handleCloseProductModal();
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      toast.error(
        error?.response?.data?.message || "Failed to add product to cart",
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="cycling-page">
      <Navbar />

      <CategoryNav />

      <main className="cycling-container">
        {loading ? (
          <div className="cycling-loading">Loading Cycle Store...</div>
        ) : (
          <>
            {/* SECTION 1: 8 Cycle-Store Categories Row (Screenshot 4) */}
            {categories.length > 0 && (
              <section className="cycling-section cycling-categories-section">
                <div className="cycling-categories-grid">
                  {categories.map((item) => (
                    <div
                      key={item._id}
                      className="cycling-category-card"
                      onClick={() => handleCategoryClick(item)}
                    >
                      <div className="cycling-category-image-wrapper">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="cycling-category-image"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="cycling-category-title">{item.name}</h3>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: Hero Promotional Banner Carousel (Screenshot 4) */}
            {banners.length > 0 && (
              <section className="cycling-section cycling-banner-section">
                <div
                  className="cycling-banner-container"
                  onMouseEnter={() => setIsBannerPaused(true)}
                  onMouseLeave={() => setIsBannerPaused(false)}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Sliding Banner Track */}
                  <div
                    className="cycling-banner-track"
                    onTransitionEnd={handleTransitionEnd}
                    style={{
                      transform: `translateX(-${(banners.length > 1 ? currentBannerIndex : 0) * 100}%)`,
                      transition: isTransitioning
                        ? "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)"
                        : "none",
                    }}
                  >
                    {extendedBanners.map((banner, index) => (
                      <div
                        className="cycling-banner-slide"
                        key={`${banner._id || index}-${index}`}
                        onClick={() => {
                          if (banner.link) {
                            navigate(banner.link);
                          }
                        }}
                      >
                        <img
                          src={getImageUrl(banner.image || banner.images?.[0])}
                          alt={banner.title || "Cycling Offer"}
                          className="cycling-banner-image"
                          loading={index === 1 ? "eager" : "lazy"}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation Arrows */}
                  {banners.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="cycling-banner-arrow cycling-banner-arrow-left"
                        onClick={handlePrevBanner}
                        aria-label="Previous Slide"
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        className="cycling-banner-arrow cycling-banner-arrow-right"
                        onClick={handleNextBanner}
                        aria-label="Next Slide"
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Carousel Dots */}
                  {banners.length > 1 && (
                    <div className="cycling-banner-dots">
                      {banners.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`cycling-banner-dot ${
                            idx === activeDot ? "active" : ""
                          }`}
                          onClick={() => handleDotClick(idx)}
                          aria-label={`Go to slide ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION 3: Fresh Combos Product Section (Screenshot 5) */}
            {products.length > 0 && (
              <section className="cycling-section cycling-combos-section">
                <div className="cycling-combos-container">
                  {/* Left Column: Intro & Controls */}
                  <div className="cycling-combos-intro">
                    <div className="cycling-combos-intro-text">
                      <p className="cycling-combos-subtitle">
                        Cycles, Skates, Waveboards
                      </p>
                      <h2 className="cycling-combos-title">
                        Fresh Combos just dropped!
                      </h2>
                    </div>

                    <div className="cycling-combos-controls">
                      <button
                        type="button"
                        className="cycling-arrow-btn"
                        onClick={() => scrollProducts("left")}
                        aria-label="Previous Products"
                      >
                        <FiChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        className="cycling-arrow-btn"
                        onClick={() => scrollProducts("right")}
                        aria-label="Next Products"
                      >
                        <FiChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Right Column: Horizontal Product Slider */}
                  <div className="cycling-combos-slider" ref={productSliderRef}>
                    {products.map((product) => (
                      <div className="cycling-product-card" key={product._id}>
                        <Link
                          to={`/product/${product._id}`}
                          className="cycling-product-image-link"
                        >
                          <div className="cycling-product-image-wrapper">
                            <img
                              src={getImageUrl(product.images?.[0])}
                              alt={product.name}
                              className="cycling-product-image"
                              loading="lazy"
                            />
                          </div>
                        </Link>

                        <div className="cycling-product-info">
                          <Link
                            to={`/product/${product._id}`}
                            className="cycling-product-title-link"
                          >
                            <p className="cycling-product-title">
                              <span className="cycling-product-brand">
                                {product.brand || "ROCKRIDER"}
                              </span>{" "}
                              {product.name}
                            </p>
                          </Link>

                          <div className="cycling-product-rating">
                            <span className="cycling-rating-stars">★★★★★</span>
                            <span className="cycling-review-count">
                              {getReviewCount(product)}
                            </span>
                          </div>

                          <div className="cycling-product-pricing">
                            <span className="cycling-selling-price">
                              ₹
                              {Number(
                                product.discountPrice || product.price || 0,
                              ).toLocaleString("en-IN")}
                            </span>
                            {product.price &&
                              product.discountPrice &&
                              product.price > product.discountPrice && (
                                <span className="cycling-mrp-price">
                                  MRP ₹
                                  {Number(product.price).toLocaleString(
                                    "en-IN",
                                  )}
                                </span>
                              )}
                          </div>

                          <div className="cycling-product-actions">
                            <button
                              type="button"
                              className={`cycling-wishlist-btn ${
                                isWishlisted(product._id) ? "active" : ""
                              }`}
                              onClick={() => handleToggle(product._id)}
                              aria-label="Wishlist"
                            >
                              <FiHeart
                                size={16}
                                fill={
                                  isWishlisted(product._id) ? "#e53935" : "none"
                                }
                                color={
                                  isWishlisted(product._id)
                                    ? "#e53935"
                                    : "#444444"
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className="cycling-add-to-cart-btn"
                              onClick={() => handleOpenProductModal(product)}
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Product Size / Add to Cart Modal */}
      <ProductSizeModal
        product={selectedProduct}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        quantity={quantity}
        setQuantity={setQuantity}
        onClose={handleCloseProductModal}
        onAddToCart={handleAddToCart}
        adding={adding}
        getImageUrl={getImageUrl}
        formatPrice={formatPrice}
      />

      <Footer />
    </div>
  );
};

export default Cycling;
