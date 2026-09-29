import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { FiChevronLeft, FiChevronRight, FiHeart } from "react-icons/fi";
import toast from "react-hot-toast";

import { useWishlist } from "../../api/axios";
import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../../components/pageSections/Footer/Footer";
import ProductSizeModal from "../../components/ProductSizeModal";

import "../../styles/CategoryCarousel/HikingTrekking.css";
import "../../styles/ProductSizeModal.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const HikingTrekking = () => {
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [topCategories, setTopCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [products, setProducts] = useState([]);
  const [mustHaves, setMustHaves] = useState([]);

  // Banner carousel state (Infinity Loop)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isResettingRef = useRef(false);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Shoes product slider ref
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
    const backendUrl = API_URL.replace(/\/api\/?$/, "");
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
    fetchHikingTrekkingData();
  }, []);

  const fetchHikingTrekkingData = async () => {
    try {
      setLoading(true);

      const [catRes, bannerRes, prodRes] = await Promise.all([
        axios.get(`${API_URL}/categories`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/banners`).catch(() => ({ data: [] })),
        axios
          .get(`${API_URL}/products?subcategory=hiking-trekking-store&limit=50`)
          .catch(() => ({ data: [] })),
      ]);

      const normalize = (str) => (str || "").toLowerCase().trim();

      // 1. Categories: subcategory === "hiking-trekking-store"
      const allCategories = Array.isArray(catRes.data)
        ? catRes.data
        : catRes.data?.categories || catRes.data?.data || [];

      const htCategories = allCategories.filter(
        (c) => normalize(c.subcategory) === "hiking-trekking-store"
      );

      // Desired sequence for the top 8 arch categories matching Screenshot 5
      const topOrder = [
        "hiking shoes",
        "backpack & rucksacks",
        "jacket",
        "trousers",
        "fleece",
        "winter essentials",
        "equipments",
        "shirts",
      ];

      const mustHaveKeywords = [
        "top backpack",
        "men trekking pants",
        "padded",
        "t-shirt",
      ];

      const topSectionCats = [];
      const mustHavesSection = [];

      htCategories.forEach((cat) => {
        const catName = normalize(cat.name);
        if (mustHaveKeywords.some((kw) => catName.includes(kw))) {
          mustHavesSection.push(cat);
        } else {
          topSectionCats.push(cat);
        }
      });

      // Sort top 8 categories according to Screenshot 5
      topSectionCats.sort((a, b) => {
        const nameA = normalize(a.name);
        const nameB = normalize(b.name);
        const idxA = topOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = topOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      // Sort 4 Trekking Must-Haves: Top Backpack, Men Trekking Pants, Padded Jackets, T-shirts
      const mustHavesOrder = [
        "top backpack",
        "men trekking pants",
        "padded",
        "t-shirt",
      ];

      mustHavesSection.sort((a, b) => {
        const nameA = normalize(a.name);
        const nameB = normalize(b.name);
        const idxA = mustHavesOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = mustHavesOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      setTopCategories(topSectionCats);
      setMustHaves(mustHavesSection);

      // 2. Banners: subcategory === "hiking-trekking-store"
      const allBanners = Array.isArray(bannerRes.data)
        ? bannerRes.data
        : bannerRes.data?.banners || bannerRes.data?.data || [];

      const htBanners = allBanners.filter(
        (b) =>
          normalize(b.subcategory) === "hiking-trekking-store" &&
          b.isActive !== false
      );

      // Order banners so hiking-trekking 1.2 (Winter Ready) is first as in Screenshot 5
      htBanners.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        if (titleA.includes("1.2")) return -1;
        if (titleB.includes("1.2")) return 1;
        return 0;
      });

      setBanners(htBanners);

      // 3. Products: subcategory === "hiking-trekking-store"
      const allProducts = Array.isArray(prodRes.data)
        ? prodRes.data
        : prodRes.data?.products || prodRes.data?.data || [];

      const htProducts = allProducts.filter((p) => p.isActive !== false);

      setProducts(htProducts);
    } catch (error) {
      console.error("HikingTrekking API fetch error:", error);
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
    if (
      e &&
      (e.target !== e.currentTarget || e.propertyName !== "transform")
    )
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

  // Touch Swipe Handlers
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
    const path = category.slug
      ? `/category/${category.slug}`
      : `/category/${encodeURIComponent(category.name)}`;

    navigate(path, {
      state: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });
  };

  const scrollProducts = (direction) => {
    if (!productSliderRef.current) return;
    const scrollAmount = 320;
    productSliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const getReviewCount = (product, idx) => {
    if (product.reviewCount || product.numReviews) {
      const val = Number(product.reviewCount || product.numReviews);
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
    }
    const counts = ["3.6k", "2.3k", "3.6k", "3.4k", "702", "1.1k"];
    return counts[idx % counts.length];
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
      const response = await axios.post(
        `${API_URL}/cart`,
        {
          productId: selectedProduct._id,
          quantity: Number(quantity) || 1,
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
      handleCloseProductModal();
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      toast.error(
        error?.response?.data?.message || "Failed to add product to cart"
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="hiking-trekking-page">
      <Navbar />

      <CategoryNav />

      <main className="hiking-trekking-container">
        {loading ? (
          <div className="hiking-trekking-loading">
            Loading Hiking & Trekking Store...
          </div>
        ) : (
          <>
            {/* SECTION 1: 8 Arch Categories with Contour Background (Screenshot 5) */}
            {topCategories.length > 0 && (
              <section className="hiking-section hiking-categories-section">
                <div className="hiking-categories-grid">
                  {topCategories.map((item) => (
                    <div
                      key={item._id}
                      className="hiking-category-card"
                      onClick={() => handleCategoryClick(item)}
                    >
                      <div className="hiking-category-image-wrapper">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="hiking-category-image"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="hiking-category-title">{item.name}</h3>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: Hero Promotional Banner Carousel (Screenshot 5) */}
            {banners.length > 0 && (
              <section className="hiking-section hiking-banner-section">
                <div
                  className="hiking-banner-container"
                  onMouseEnter={() => setIsBannerPaused(true)}
                  onMouseLeave={() => setIsBannerPaused(false)}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Sliding Banner Track */}
                  <div
                    className="hiking-banner-track"
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
                        className="hiking-banner-slide"
                        key={`${banner._id || index}-${index}`}
                        onClick={() => {
                          if (banner.link) {
                            navigate(banner.link);
                          }
                        }}
                      >
                        <img
                          src={getImageUrl(
                            banner.image || banner.images?.[0]
                          )}
                          alt={
                            banner.title ||
                            "All you need to be Winter Ready!"
                          }
                          className="hiking-banner-image"
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
                        className="hiking-banner-arrow hiking-banner-arrow-left"
                        onClick={handlePrevBanner}
                        aria-label="Previous Slide"
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        className="hiking-banner-arrow hiking-banner-arrow-right"
                        onClick={handleNextBanner}
                        aria-label="Next Slide"
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Carousel Dots */}
                  {banners.length > 1 && (
                    <div className="hiking-banner-dots">
                      {banners.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`hiking-banner-dot ${
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

            {/* SECTION 3: Top Deals on Shoes Slider (Screenshot 6) */}
            {products.length > 0 && (
              <section className="hiking-section hiking-deals-section">
                <div className="hiking-section-header">
                  <h2 className="hiking-section-title">Top Deals on Shoes</h2>
                  <div className="hiking-slider-controls">
                    <button
                      type="button"
                      className="hiking-arrow-btn"
                      onClick={() => scrollProducts("left")}
                      aria-label="Previous Products"
                    >
                      <FiChevronLeft size={20} />
                    </button>
                    <button
                      type="button"
                      className="hiking-arrow-btn"
                      onClick={() => scrollProducts("right")}
                      aria-label="Next Products"
                    >
                      <FiChevronRight size={20} />
                    </button>
                  </div>
                </div>

                <div
                  className="hiking-products-slider"
                  ref={productSliderRef}
                >
                  {products.map((product, idx) => (
                    <div className="hiking-product-card" key={product._id}>
                      <Link
                        to={`/product/${product._id}`}
                        className="hiking-product-image-link"
                      >
                        <div className="hiking-product-image-wrapper">
                          <img
                            src={getImageUrl(product.images?.[0])}
                            alt={product.name}
                            className="hiking-product-image"
                            loading="lazy"
                          />
                        </div>
                      </Link>

                      <div className="hiking-product-info">
                        <Link
                          to={`/product/${product._id}`}
                          className="hiking-product-title-link"
                        >
                          <p className="hiking-product-title">
                            <span className="hiking-product-brand">
                              {product.brand?.toUpperCase() === "DECATHLON"
                                ? "QUECHUA"
                                : product.brand || "QUECHUA"}
                            </span>{" "}
                            {product.name}
                          </p>
                        </Link>

                        <div className="hiking-product-rating">
                          <span className="hiking-rating-stars">★★★★★</span>
                          <span className="hiking-review-count">
                            {getReviewCount(product, idx)}
                          </span>
                        </div>

                        <div className="hiking-product-pricing">
                          <span className="hiking-selling-price">
                            ₹
                            {Number(
                              product.discountPrice || product.price || 0
                            ).toLocaleString("en-IN")}
                          </span>
                          {product.price &&
                            product.discountPrice &&
                            product.price > product.discountPrice && (
                              <span className="hiking-mrp-price">
                                MRP ₹
                                {Number(product.price).toLocaleString("en-IN")}
                              </span>
                            )}
                        </div>

                        <div className="hiking-product-actions">
                          <button
                            type="button"
                            className={`hiking-wishlist-btn ${
                              isWishlisted(product._id) ? "active" : ""
                            }`}
                            onClick={() => handleToggle(product._id)}
                            aria-label="Wishlist"
                          >
                            <FiHeart
                              size={16}
                              fill={
                                isWishlisted(product._id)
                                  ? "#e53935"
                                  : "none"
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
                            className="hiking-add-to-cart-btn"
                            onClick={() => handleOpenProductModal(product)}
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 4: Trekking must Haves (4 Large Cards, Screenshot 7) */}
            {mustHaves.length > 0 && (
              <section className="hiking-section hiking-musthaves-section">
                <h2 className="hiking-section-title">Trekking must Haves</h2>

                <div className="hiking-musthaves-grid">
                  {mustHaves.map((item) => (
                    <div
                      key={item._id}
                      className="hiking-musthave-card"
                      onClick={() => handleCategoryClick(item)}
                    >
                      <div className="hiking-musthave-image-wrapper">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="hiking-musthave-image"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  ))}
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

export default HikingTrekking;
