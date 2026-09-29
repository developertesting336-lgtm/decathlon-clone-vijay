import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../../components/pageSections/Footer/Footer";

import "../../styles/CategoryCarousel/Shoes.css";

const Shoes = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [topCategories, setTopCategories] = useState([]);
  const [banners, setBanners] = useState([]);
  const [findYourMove, setFindYourMove] = useState([]);
  const [shopForFamily, setShopForFamily] = useState([]);

  // Banner carousel state (Seamless Infinity Loop)
  const [currentBannerIndex, setCurrentBannerIndex] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isResettingRef = useRef(false);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  // Move slider ref
  const moveSliderRef = useRef(null);

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

  useEffect(() => {
    fetchShoesData();
  }, []);

  const fetchShoesData = async () => {
    try {
      setLoading(true);

      const [catRes, bannerRes] = await Promise.all([
        api.get("/categories"),
        api.get("/banners"),
      ]);

      const normalize = (str) =>
        (str || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      // 1. Categories: subcategory === "Sports-footwear"
      const allCategories = Array.isArray(catRes.data)
        ? catRes.data
        : catRes.data?.categories || catRes.data?.data || [];

      const footwearCats = allCategories.filter(
        (c) =>
          normalize(c.subcategory) === "sportsfootwear" && c.isActive !== false
      );

      // Separate into 3 distinct sections based on sortOrder:
      // A) Top 8 Categories (sortOrder <= 173)
      // B) Find Your Move (sortOrder 174..177)
      // C) Shop For Family (sortOrder >= 178)
      const topCats = [];
      const moveCats = [];
      const familyCats = [];

      footwearCats.forEach((cat) => {
        const order = Number(cat.sortOrder) || 0;
        if (order >= 178) {
          familyCats.push(cat);
        } else if (order >= 174 && order <= 177) {
          moveCats.push(cat);
        } else {
          topCats.push(cat);
        }
      });

      // Sort Top 8 categories according to Reference Screenshot 5:
      // 1. Running Shoes
      // 2. Hiking & Wildlife Shoes
      // 3. Walking Shoes
      // 4. Football Shoes
      // 5. Racket Shoes
      // 6. Sandals & Flipflops
      // 7. Cricket Shoes
      // 8. Basketball Shoes
      const topOrder = [
        "running shoes",
        "hiking & wildlife shoes",
        "walking shoes",
        "football shoes",
        "racket shoes",
        "sandals & flipflops",
        "cricket shoes",
        "basketball shoes",
      ];

      topCats.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase().trim();
        const nameB = (b.name || "").toLowerCase().trim();
        const idxA = topOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = topOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      // Sort Find Your Move (4 cards):
      // 1. Walking Shoes (Your Morning 10k Stride)
      // 2. Running Shoes (Chase Your Next Personal Best)
      // 3. Football, Basketball & Cricket Shoes (Match-day Ready)
      // 4. Gym & Fitness Shoes (Dominate the Workout Floor)
      const moveOrder = [
        "walking shoes",
        "running shoes",
        "football, basketball & cricket",
        "gym & fitness",
      ];

      moveCats.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase().trim();
        const nameB = (b.name || "").toLowerCase().trim();
        const idxA = moveOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = moveOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      // Sort Shop For Family (4 cards):
      // 1. Men Shoes
      // 2. Womens Shoes
      // 3. Kids Shoes
      // 4. Flipflop & Sandals
      const familyOrder = [
        "men shoes",
        "womens shoes",
        "kids shoes",
        "flipflop & sandals",
      ];

      familyCats.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase().trim();
        const nameB = (b.name || "").toLowerCase().trim();
        const idxA = familyOrder.findIndex((kw) => nameA.includes(kw));
        const idxB = familyOrder.findIndex((kw) => nameB.includes(kw));
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });

      setTopCategories(topCats);
      setFindYourMove(moveCats);
      setShopForFamily(familyCats);

      // 2. Banners: subcategory === "Sports-footwear"
      const allBanners = Array.isArray(bannerRes.data)
        ? bannerRes.data
        : bannerRes.data?.banners || bannerRes.data?.data || [];

      const footwearBanners = allBanners.filter(
        (b) =>
          normalize(b.subcategory) === "sportsfootwear" && b.isActive !== false
      );

      // Order banners so Shoes 1.2 ("Football Collection World Cup") is first as in screenshot
      footwearBanners.sort((a, b) => {
        const titleA = (a.title || "").toLowerCase();
        const titleB = (b.title || "").toLowerCase();
        if (titleA.includes("1.2")) return -1;
        if (titleB.includes("1.2")) return 1;
        if (titleA.includes("1.4")) return -1;
        if (titleB.includes("1.4")) return 1;
        return 0;
      });

      setBanners(footwearBanners);
      setCurrentBannerIndex(1);
      setIsTransitioning(true);
      isResettingRef.current = false;
    } catch (error) {
      console.error("Shoes API fetch error:", error);
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
    const path = `/category/${encodeURIComponent(category.name)}`;

    navigate(path, {
      state: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });
  };

  const scrollMoveSlider = (direction) => {
    if (!moveSliderRef.current) return;
    const scrollAmount = 340;
    moveSliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className="shoes-page">
      <Navbar />
      <CategoryNav />

      <main className="shoes-container">
        {loading ? (
          <div className="shoes-loading-container">
            <div className="shoes-loading-spinner" />
            <p className="shoes-loading-text">
              Loading Sports Footwear Store...
            </p>
          </div>
        ) : (
          <>
            {/* SECTION 1: 8 SPORTS FOOTWEAR CATEGORIES GRID (Screenshot 5) */}
            {topCategories.length > 0 && (
              <section className="shoes-section shoes-categories-section">
                <div className="shoes-categories-grid">
                  {topCategories.map((cat) => (
                    <div
                      key={cat._id}
                      className="shoes-category-card"
                      onClick={() => handleCategoryClick(cat)}
                    >
                      <div className="shoes-category-image-wrapper">
                        <img
                          src={getImageUrl(cat.image)}
                          alt={cat.name}
                          className="shoes-category-image"
                          loading="lazy"
                        />
                      </div>
                      <h3 className="shoes-category-title">{cat.name}</h3>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 2: MARKETING HERO BANNER SLIDER (Screenshot 5 & 1) */}
            {banners.length > 0 && (
              <section className="shoes-section shoes-banner-section">
                <div
                  className="shoes-banner-container"
                  onMouseEnter={() => setIsBannerPaused(true)}
                  onMouseLeave={() => setIsBannerPaused(false)}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onTouchEnd}
                >
                  {/* Sliding Banner Track */}
                  <div
                    className="shoes-banner-track"
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
                        className="shoes-banner-slide"
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
                          alt={banner.title || "Sports Footwear Collection"}
                          className="shoes-banner-image"
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
                        className="shoes-banner-arrow shoes-banner-arrow-left"
                        onClick={handlePrevBanner}
                        aria-label="Previous Slide"
                      >
                        <FiChevronLeft size={24} />
                      </button>
                      <button
                        type="button"
                        className="shoes-banner-arrow shoes-banner-arrow-right"
                        onClick={handleNextBanner}
                        aria-label="Next Slide"
                      >
                        <FiChevronRight size={24} />
                      </button>
                    </>
                  )}

                  {/* Carousel Dots */}
                  {banners.length > 1 && (
                    <div className="shoes-banner-dots">
                      {banners.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`shoes-banner-dot ${
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

            {/* SECTION 3: "FIND YOUR MOVE" 4-CARD CAROUSEL (Screenshot 1) */}
            {findYourMove.length > 0 && (
              <section className="shoes-section shoes-move-section">
                <h2 className="shoes-section-title">Find Your Move</h2>
                <div className="shoes-move-wrapper">
                  <div className="shoes-move-grid" ref={moveSliderRef}>
                    {findYourMove.map((item) => (
                      <div
                        key={item._id}
                        className="shoes-move-card"
                        onClick={() => handleCategoryClick(item)}
                      >
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                          className="shoes-move-image"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    className="shoes-slider-arrow"
                    onClick={() => scrollMoveSlider("right")}
                    aria-label="Next Move"
                  >
                    <FiChevronRight size={22} />
                  </button>
                </div>
              </section>
            )}

            {/* SECTION 4: "SHOP FOR FAMILY" 4-CARD GRID (Screenshot 2) */}
            {shopForFamily.length > 0 && (
              <section className="shoes-section shoes-family-section">
                <h2 className="shoes-section-title">Shop For Family</h2>
                <div className="shoes-family-grid">
                  {shopForFamily.map((item) => (
                    <div
                      key={item._id}
                      className="shoes-family-card"
                      onClick={() => handleCategoryClick(item)}
                    >
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        className="shoes-family-image"
                        loading="lazy"
                      />
                    </div>
                  ))}
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

export default Shoes;
