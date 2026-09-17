import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/PromoBanner.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const PromoBanner = ({ customBanners }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);

  const [currentBanner, setCurrentBanner] = useState(0);

  const [autoplay, setAutoplay] = useState(true);

  const [isTransitioning, setIsTransitioning] = useState(true);

  const [loading, setLoading] = useState(true);

  /*
  ========================================
  IMAGE URL
  ========================================
  */

  const getImageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  /*
  ========================================
  FETCH HOMEPAGE SECTION
  ========================================
  */

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/pages/slug/home");

      const pageSections = response.data?.page?.sections || [];

      const section = pageSections.find(
        (item) => item.name === "PromoBanner" || item.name === "Promo Banner" || item.type === "banner"
      );

      if (!section) {
        setBanners([]);
        setCurrentBanner(0);
        return;
      }

      setBanners(section.banners || []);
      setCurrentBanner(0);
      setAutoplay(true);
      setIsTransitioning(true);
    } catch (error) {
      console.error("Promo Banner Error:", error);
      setBanners([]);
      setCurrentBanner(0);
    } finally {
      setLoading(false);
    }
  }, []);

  /*
  ========================================
  INITIAL LOAD
  ========================================
  */

  useEffect(() => {
    if (customBanners && Array.isArray(customBanners) && customBanners.length > 0) {
      setBanners(customBanners);
      setCurrentBanner(0);
      setLoading(false);
      return;
    }
    fetchSection();
  }, [customBanners, fetchSection]);

  /*
  ========================================
  REALTIME UPDATE
  ========================================
  */

  useEffect(() => {
    const handleHomepageUpdate = (data) => {
      const sectionEvents = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
      ];

      const bannerEvents = [
        "banner_created",
        "banner_updated",
        "banner_deleted",
      ];

      if (sectionEvents.includes(data?.type)) {
        fetchSection();
        return;
      }

      if (bannerEvents.includes(data?.type)) {
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);

    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [fetchSection]);

  /*
  ========================================
  CLONE FIRST SLIDE
  ========================================
  */

  const sliderBanners = banners.length > 0 ? [...banners, banners[0]] : [];

  /*
  ========================================
  AUTO SLIDER
  ========================================
  */

  useEffect(() => {
    if (!autoplay || banners.length <= 1) {
      return;
    }

    const interval = setInterval(() => {
      setCurrentBanner((prev) => prev + 1);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [autoplay, banners.length]);

  /*
  ========================================
  LOOP HANDLING
  ========================================
  */

  useEffect(() => {
    if (banners.length === 0 || currentBanner !== banners.length) {
      return;
    }

    const timeout = setTimeout(() => {
      setIsTransitioning(false);

      setCurrentBanner(0);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [currentBanner, banners.length]);

  /*
  ========================================
  PREVIOUS
  ========================================
  */

  const handlePrev = () => {
    if (banners.length <= 1) {
      return;
    }

    setAutoplay(false);

    if (currentBanner === 0) {
      setIsTransitioning(false);

      setCurrentBanner(banners.length - 1);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });

      return;
    }

    setCurrentBanner((prev) => prev - 1);
  };

  /*
  ========================================
  NEXT
  ========================================
  */

  const handleNext = () => {
    if (banners.length <= 1) {
      return;
    }

    setAutoplay(false);

    setCurrentBanner((prev) => prev + 1);
  };

  /*
  ========================================
  DOT CLICK
  ========================================
  */

  const handleDotClick = (index) => {
    setAutoplay(false);

    setIsTransitioning(true);

    setCurrentBanner(index);
  };

  /*
  ========================================
  LOADING
  ========================================
  */

  if (loading) {
    return null;
  }

  /*
  ========================================
  EMPTY
  ========================================
  */

  if (banners.length === 0) {
    return null;
  }

  /*
  ========================================
  ACTIVE DOT
  ========================================
  */

  const activeDot = currentBanner === banners.length ? 0 : currentBanner;

  /*
  ========================================
  UI
  ========================================
  */

  const handleBannerClick = (bannerItem, index) => {
    if (bannerItem?.link && bannerItem.link !== "#") {
      if (
        bannerItem.link.startsWith("http://") ||
        bannerItem.link.startsWith("https://")
      ) {
        window.location.href = bannerItem.link;
      } else {
        navigate(bannerItem.link);
      }
      return;
    }

    // Default smart landing routes if no custom URL was assigned in CMS
    const fallbackRoutes = [
      "/monsoon-essentials",
      "/shoes",
      "/activewear",
      "/cycling",
    ];
    navigate(fallbackRoutes[index % fallbackRoutes.length]);
  };

  return (
    <section className="promo-banner">
      {/* =================================
          SLIDER
      ================================= */}

      <div
        className="promo-slider"
        style={{
          transform: `translateX(-${currentBanner * 100}%)`,
          transition: isTransitioning ? "transform 0.5s ease-in-out" : "none",
        }}
      >
        {sliderBanners.map((banner, index) => (
          <div
            className="promo-slide"
            key={`${banner._id}-${index}`}
            onClick={() => handleBannerClick(banner, index)}
            style={{ cursor: "pointer" }}
            role="button"
            tabIndex={0}
          >
            <img
              src={getImageUrl(banner.image)}
              alt={banner.title || "Promotion"}
            />
          </div>
        ))}
      </div>

      {/* =================================
          ARROWS
      ================================= */}

      {banners.length > 1 && (
        <>
          <button
            className="promo-arrow promo-arrow-left"
            type="button"
            onClick={handlePrev}
            aria-label="Previous Banner"
          >
            ‹
          </button>

          <button
            className="promo-arrow promo-arrow-right"
            type="button"
            onClick={handleNext}
            aria-label="Next Banner"
          >
            ›
          </button>

          <div className="promo-dots">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`promo-dot ${activeDot === index ? "active" : ""}`}
                onClick={() => handleDotClick(index)}
                aria-label={`Go to banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default PromoBanner;
