import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./PromoBanner.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const PromoBanner = ({ section, data, customBanners, style }) => {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);

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

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "promo-banner" ||
          item.name === "PromoBanner" ||
          item.name === "Promo Banner" ||
          (item.name && item.name.toLowerCase().includes("promo") && !item.name.includes("2"))
      );

      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map((id) =>
          String(id),
        ),
      );

      const rawBanners = found?.data?.banners || found?.banners || [];
      const validBanners = rawBanners.filter(
        (b) =>
          b &&
          typeof b === "object" &&
          (b.image || b.title) &&
          b.isActive !== false &&
          !disabledIds.has(String(b._id)),
      );

      setBanners(validBanners);
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

  useEffect(() => {
    const rawBanners =
      data?.banners?.length
        ? data.banners
        : section?.data?.banners?.length
        ? section.data.banners
        : section?.banners?.length
        ? section.banners
        : customBanners;

    const disabledIds = new Set(
      (
        data?.disabledItemIds ||
        section?.data?.disabledItemIds ||
        section?.disabledItemIds ||
        []
      ).map((id) => String(id)),
    );

    if (rawBanners && Array.isArray(rawBanners) && rawBanners.length > 0) {
      const valid = rawBanners.filter(
        (b) =>
          b &&
          typeof b === "object" &&
          (b.image || b.title) &&
          b.isActive !== false &&
          !disabledIds.has(String(b._id)),
      );
      if (valid.length > 0) {
        setBanners(valid);
        setCurrentBanner(0);
        setLoading(false);
        return;
      }
    }

    if (data?.image || section?.data?.image) {
      setBanners([{ image: data?.image || section.data.image, link: data?.link || "/" }]);
      setCurrentBanner(0);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [data, section, customBanners, fetchSection]);

  useEffect(() => {
    if (data?.banners?.length || section?.data?.banners?.length || customBanners?.length) {
      return;
    }

    const handleHomepageUpdate = (updateData) => {
      const events = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
        "banner_created",
        "banner_updated",
        "banner_deleted",
      ];
      if (events.includes(updateData?.type)) {
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);
    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [data, section, customBanners, fetchSection]);

  const sliderBanners = banners.length > 0 ? [...banners, banners[0]] : [];

  useEffect(() => {
    if (!autoplay || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, [autoplay, banners.length]);

  useEffect(() => {
    if (banners.length === 0 || currentBanner !== banners.length) return;
    const timeout = setTimeout(() => {
      setIsTransitioning(false);
      setCurrentBanner(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsTransitioning(true);
        });
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [currentBanner, banners.length]);

  const handlePrev = () => {
    if (banners.length <= 1) return;
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

  const handleNext = () => {
    if (banners.length <= 1) return;
    setAutoplay(false);
    setCurrentBanner((prev) => prev + 1);
  };

  const handleDotClick = (index) => {
    setAutoplay(false);
    setIsTransitioning(true);
    setCurrentBanner(index);
  };

  if (loading || banners.length === 0) {
    return null;
  }

  const activeDot = currentBanner === banners.length ? 0 : currentBanner;

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
    const fallbackRoutes = [
      "/monsoon-essentials",
      "/shoes",
      "/activewear",
      "/cycling",
    ];
    navigate(fallbackRoutes[index % fallbackRoutes.length]);
  };

  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section className={`promo-banner ${variantClass}`}>
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
            key={`${banner._id || index}-${index}`}
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
