import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../../components/pageSections/Footer/Footer";

import "../../styles/CategoryCarousel/SportsAccessories.css";

const API_URL =
  process.env.REACT_APP_API_URL || "http://localhost:5000/api";

const SportsAccessories = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [banners, setBanners] = useState([]);

  // Banner carousel state (Seamless Infinity Loop)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isResettingRef = useRef(false);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const getImageUrl = (image) => {
    if (!image) return "/images/placeholder.jpg";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }
    const backendUrl = API_URL.replace(/\/api\/?$/, "");
    if (typeof image === "string") {
      if (image.startsWith("/uploads/")) {
        return `${backendUrl}${image}`;
      }
      if (image.startsWith("uploads/")) {
        return `${backendUrl}/${image}`;
      }
      return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
    }
    return "/images/placeholder.jpg";
  };

  useEffect(() => {
    fetchAccessoriesData();
  }, []);

  const fetchAccessoriesData = async () => {
    try {
      setLoading(true);

      const [catRes, bannerRes] = await Promise.all([
        axios.get(`${API_URL}/categories`),
        axios.get(`${API_URL}/banners`),
      ]);

      const normalize = (str) =>
        (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Categories: filter by subcategory === "Accessories-store"
      const allCategories = Array.isArray(catRes.data)
        ? catRes.data
        : catRes.data?.categories || catRes.data?.data || [];

      const accCats = allCategories.filter(
        (c) =>
          (normalize(c.subcategory) === "accessoriesstore" ||
            normalize(c.subcategory) === "accessories" ||
            (c.subcategory || "").toLowerCase().includes("access")) &&
          c.isActive !== false
      );

      // Desired category display order matching Decathlon storefront reference:
      // 1. Microfibre Towels
      // 2. Sports Sunglasses
      // 3. Water Bottles
      // 4. Gym & Duffle Bags
      // 5. Waist Bags & Pouches
      // 6. Lifting Supports
      // 7. Bars & Gels
      // 8. Backpacks & Rucksacks
      const accessoriesOrder = [
        "microfibre towels",
        "sports sunglasses",
        "water bottles",
        "gym & duffle bags",
        "waist bags & pouches",
        "lifting supports",
        "bars & gels",
        "backpacks & rucksacks",
      ];

      accCats.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase().trim();
        const nameB = (b.name || "").toLowerCase().trim();
        const idxA = accessoriesOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = accessoriesOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      setCategories(accCats);

      // 2. Banners: filter by subcategory === "Accessories-store" or title containing "accessories"
      const allBanners = Array.isArray(bannerRes.data)
        ? bannerRes.data
        : bannerRes.data?.banners || bannerRes.data?.data || [];

      const accBanners = allBanners.filter(
        (b) =>
          (normalize(b.subcategory) === "accessoriesstore" ||
            normalize(b.subcategory) === "accessories" ||
            (b.subcategory || "").toLowerCase().includes("access") ||
            (b.title || "").toLowerCase().includes("accessories")) &&
          b.isActive !== false
      );

      // Sort banners naturally by title (Sports Accessories 1, Sports Accessories 2, ...)
      accBanners.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "", undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

      setBanners(accBanners);
      setCurrentBannerIndex(1);
      setIsTransitioning(true);
      isResettingRef.current = false;
    } catch (error) {
      console.error("SportsAccessories API fetch error:", error);
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
        categoryId: category._id || category.id,
      },
    });
  };

  return (
    <div className="sports-accessories-page">
      <Navbar />
      <CategoryNav />

      <main className="sports-accessories-container">
        {loading ? (
          <div className="sports-accessories-loading-container">
            <div className="sports-accessories-loading-spinner" />
            <p className="sports-accessories-loading-text">
              Loading Sports Accessories...
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 1: 8 SPORTS ACCESSORIES CATEGORIES GRID */}
            {categories.length > 0 && (
              <section className="sports-accessories-section sports-accessories-categories-section">
                <div className="sports-accessories-categories-grid">
                  {categories.map((cat) => (
                    <div
                      key={cat._id || cat.id}
                      className="sports-accessories-category-card"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <div className="sports-accessories-category-image-wrapper">
                        <img
                          src={getImageUrl(cat.image)}
                          alt={cat.name}
                          className="sports-accessories-category-image"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="sports-accessories-category-title">
                        {cat.name}
                      </h3>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: MARKETING HERO BANNER SLIDER (INFINITE LOOP) */}
            {banners.length > 0 && (
              <section className="sports-accessories-section sports-accessories-banner-section">
                <div
                  className="sports-accessories-banner-container"
                  onMouseEnter={() => setIsBannerPaused(true)}
                  onMouseLeave={() => setIsBannerPaused(false)}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Sliding Banner Track */}
                  <div
                    className="sports-accessories-banner-track"
                    onTransitionEnd={handleTransitionEnd}
                    style={{
                      transform: `translateX(-${
                        (banners.length > 1 ? currentBannerIndex : 0) * 100
                      }%)`,
                      transition: isTransitioning
                        ? "transform 0.65s cubic-bezier(0.25, 1, 0.5, 1)"
                        : "none",
                    }}
                  >
                    {extendedBanners.map((banner, index) => (
                      <div
                        className="sports-accessories-banner-slide"
                        key={`${banner._id || banner.id || index}-${index}`}
                        onClick={() => {
                          if (banner.link) {
                            navigate(banner.link);
                          }
                        }}
                      >
                        <img
                          src={getImageUrl(banner.image || banner.images?.[0])}
                          alt={banner.title || "Sports Accessories Banner"}
                          className="sports-accessories-banner-image"
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
                        className="sports-accessories-banner-arrow sports-accessories-banner-arrow-left"
                        onClick={handlePrevBanner}
                        aria-label="Previous Slide"
                      >
                        <FiChevronLeft size={22} />
                      </button>
                      <button
                        type="button"
                        className="sports-accessories-banner-arrow sports-accessories-banner-arrow-right"
                        onClick={handleNextBanner}
                        aria-label="Next Slide"
                      >
                        <FiChevronRight size={22} />
                      </button>
                    </>
                  )}

                  {/* Navigation Dots */}
                  {banners.length > 1 && (
                    <div className="sports-accessories-banner-dots">
                      {banners.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          className={`sports-accessories-banner-dot ${
                            activeDot === index ? "active" : ""
                          }`}
                          onClick={() => handleDotClick(index)}
                          aria-label={`Go to slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default SportsAccessories;
