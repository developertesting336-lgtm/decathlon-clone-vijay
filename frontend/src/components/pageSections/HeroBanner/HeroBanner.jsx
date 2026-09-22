import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./HeroBanner.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const HeroBanner = ({
  section,
  data,
  customBanners,
  style,
  pageSlug,
  getImageUrl: propGetImageUrl,
  navigate: propNavigate,
}) => {
  const navigateHook = useNavigate();
  const navigate = propNavigate || navigateHook;

  const [banners, setBanners] = useState([]);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [loading, setLoading] = useState(true);

  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const resolveImageUrl = useCallback(
    (image) => {
      if (!image) return "";
      if (propGetImageUrl && typeof propGetImageUrl === "function") {
        return propGetImageUrl(image);
      }
      if (
        typeof image === "string" &&
        (image.startsWith("http://") ||
          image.startsWith("https://") ||
          image.startsWith("data:"))
      ) {
        return image;
      }
      if (
        typeof image === "string" &&
        (image.startsWith("/assets/") || image.startsWith("assets/"))
      ) {
        return image.startsWith("/") ? image : `/${image}`;
      }
      const apiBaseUrl = api.defaults?.baseURL || "";
      const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
      if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
      if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
      return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
    },
    [propGetImageUrl]
  );

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const targetSlug = pageSlug || "hiking-trekking";
      const response = await api.get(`/pages/slug/${targetSlug}`);
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "hero-banner" ||
          item.name === "hero-banner" ||
          item.type === "promo-banner" ||
          (item.name && item.name.toLowerCase().includes("banner"))
      );

      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map((id) =>
          String(id)
        )
      );

      const rawBanners = found?.data?.banners || found?.banners || [];
      const validBanners = rawBanners.filter(
        (b) =>
          b &&
          typeof b === "object" &&
          (b.image || b.title) &&
          b.isActive !== false &&
          !disabledIds.has(String(b._id))
      );

      setBanners(validBanners);
      setCurrentBanner(0);
      setIsTransitioning(true);
    } catch (error) {
      console.error("HeroBanner fetch error:", error);
      setBanners([]);
      setCurrentBanner(0);
    } finally {
      setLoading(false);
    }
  }, [pageSlug]);

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
      ).map((id) => String(id))
    );

    if (rawBanners && Array.isArray(rawBanners) && rawBanners.length > 0) {
      const valid = rawBanners.filter(
        (b) =>
          b &&
          typeof b === "object" &&
          (b.image || b.title) &&
          b.isActive !== false &&
          !disabledIds.has(String(b._id))
      );
      if (valid.length > 0) {
        setBanners(valid);
        setCurrentBanner(0);
        setLoading(false);
        return;
      }
    }

    if (data?.image || section?.data?.image) {
      setBanners([
        {
          image: data?.image || section.data.image,
          link: data?.link || "/",
          title: data?.title || section?.data?.title || "Banner",
        },
      ]);
      setCurrentBanner(0);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [data, section, customBanners, fetchSection]);

  useEffect(() => {
    if (
      data?.banners?.length ||
      section?.data?.banners?.length ||
      customBanners?.length
    ) {
      return;
    }

    const handlePageUpdate = (updateData) => {
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

    socket.on("homepage_updated", handlePageUpdate);
    socket.on("page_updated", handlePageUpdate);
    return () => {
      socket.off("homepage_updated", handlePageUpdate);
      socket.off("page_updated", handlePageUpdate);
    };
  }, [data, section, customBanners, fetchSection]);

  // Clone first banner at end for seamless looping transition
  const sliderBanners = banners.length > 1 ? [...banners, banners[0]] : banners;

  // Auto-play interval
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentBanner((prev) => prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  // Handle loop reset seamlessly when moving past last banner
  useEffect(() => {
    if (banners.length <= 1 || currentBanner !== banners.length) return;
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

  const handlePrev = (e) => {
    e?.stopPropagation();
    if (banners.length <= 1) return;
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
    setIsTransitioning(true);
    setCurrentBanner((prev) => prev - 1);
  };

  const handleNext = (e) => {
    e?.stopPropagation();
    if (banners.length <= 1) return;
    setIsTransitioning(true);
    setCurrentBanner((prev) => prev + 1);
  };

  const handleDotClick = (index, e) => {
    e?.stopPropagation();
    setIsTransitioning(true);
    setCurrentBanner(index);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      handleNext();
    } else if (distance < -50) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const handleBannerClick = (bannerItem) => {
    if (bannerItem?.link && bannerItem.link !== "#" && bannerItem.link !== "/") {
      if (
        bannerItem.link.startsWith("http://") ||
        bannerItem.link.startsWith("https://")
      ) {
        window.location.href = bannerItem.link;
        return;
      }
      const cleanLink = bannerItem.link.startsWith("/")
        ? bannerItem.link
        : `/${bannerItem.link}`;
      navigate(cleanLink);
    }
  };

  if (loading || banners.length === 0) {
    return null;
  }

  const activeDot = currentBanner === banners.length ? 0 : currentBanner;
  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section
      className={`hero-banner-container ${variantClass}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Banners"
    >
      <div
        className="hero-banner-track"
        style={{
          transform: `translateX(-${currentBanner * 100}%)`,
          transition: isTransitioning
            ? "transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)"
            : "none",
        }}
      >
        {sliderBanners.map((banner, index) => (
          <div
            className="hero-banner-slide"
            key={`${banner._id || index}-${index}`}
            onClick={() => handleBannerClick(banner)}
            role="button"
            tabIndex={0}
            style={{ cursor: banner.link ? "pointer" : "default" }}
          >
            <img
              src={resolveImageUrl(banner.image)}
              alt={banner.title || `Promotion ${index + 1}`}
              loading={index === 0 ? "eager" : "lazy"}
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            type="button"
            className="hero-banner-arrow hero-banner-arrow-left"
            onClick={handlePrev}
            aria-label="Previous Slide"
          >
            <MdChevronLeft size={22} />
          </button>

          <button
            type="button"
            className="hero-banner-arrow hero-banner-arrow-right"
            onClick={handleNext}
            aria-label="Next Slide"
          >
            <MdChevronRight size={22} />
          </button>

          <div className="hero-banner-dots">
            {banners.map((_, index) => (
              <button
                key={index}
                type="button"
                className={`hero-banner-dot ${
                  activeDot === index ? "active" : ""
                }`}
                onClick={(e) => handleDotClick(index, e)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default HeroBanner;
