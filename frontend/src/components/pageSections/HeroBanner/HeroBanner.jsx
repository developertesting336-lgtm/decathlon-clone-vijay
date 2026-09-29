import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./HeroBanner.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const HeroBanner = ({
  customBanners,
  pageSlug,
  subcategory,
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

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/banners");
      const allBanners = res.data?.banners || [];
      const activeBanners = allBanners.filter(
        (b) => b && b.isActive !== false && (b.image || b.images?.length)
      );

      const norm = (str) =>
        String(str || "")
          .toLowerCase()
          .replace(/['’]/g, "'")
          .trim();

      if (subcategory) {
        const target = norm(subcategory);
        const matched = activeBanners.filter((b) => {
          const sub = norm(b.subcategory);
          return sub === target || sub.replace(/[-_\s]+/g, "") === target.replace(/[-_\s]+/g, "");
        });
        setBanners(matched);
        setCurrentBanner(0);
        setIsTransitioning(true);
        return;
      }

      const slugKey = (pageSlug || "").toLowerCase().replace(/[-_\s]+/g, "");

      let matched = activeBanners.filter((b) => {
        const title = (b.title || "").toLowerCase().replace(/[-_\s]+/g, "");
        const sub = (b.subcategory || "").toLowerCase().replace(/[-_\s]+/g, "");
        const type = (b.type || "").toLowerCase().replace(/[-_\s]+/g, "");

        if (slugKey.includes("monsoon") && (title.includes("monsoon") || sub.includes("monsoon"))) return true;
        if (slugKey.includes("activewear") && (title.includes("activewear") || sub.includes("activewear"))) return true;
        if (
          (slugKey.includes("cycling") || slugKey.includes("cycle")) &&
          (title.includes("cycle") || sub.includes("cycle") || title.includes("cycling") || sub.includes("cycling"))
        )
          return true;
        if (
          (slugKey.includes("hiking") || slugKey.includes("trekking")) &&
          (title.includes("hiking") || title.includes("trekking") || sub.includes("hiking") || sub.includes("trekking"))
        )
          return true;
        if ((slugKey.includes("shoe") || slugKey.includes("footwear")) && (title.includes("shoe") || sub.includes("shoe")))
          return true;
        if (slugKey.includes("bag") && (title.includes("bag") || sub.includes("bag"))) return true;
        if (slugKey.includes("accessories") && (title.includes("accessories") || sub.includes("accessories"))) return true;
        if (slugKey.includes("workout") && (title.includes("workout") || sub.includes("workout"))) return true;

        return slugKey && (title.includes(slugKey) || sub.includes(slugKey) || type.includes(slugKey));
      });

      if (matched.length === 0 && activeBanners.length > 0) {
        matched = activeBanners.slice(0, 5);
      }

      setBanners(matched);
      setCurrentBanner(0);
      setIsTransitioning(true);
    } catch (error) {
      console.error("HeroBanner fetch error:", error);
      setBanners([]);
      setCurrentBanner(0);
    } finally {
      setLoading(false);
    }
  }, [pageSlug, subcategory]);

  useEffect(() => {
    if (customBanners && Array.isArray(customBanners) && customBanners.length > 0) {
      const valid = customBanners.filter(
        (b) => b && typeof b === "object" && (b.image || b.title) && b.isActive !== false
      );
      if (valid.length > 0) {
        setBanners(valid);
        setCurrentBanner(0);
        setLoading(false);
        return;
      }
    }

    fetchBanners();
  }, [customBanners, fetchBanners]);

  useEffect(() => {
    const handleBannerUpdate = (updateData) => {
      const type = typeof updateData === "string" ? updateData : updateData?.type;
      if (!type || type.startsWith("banner_") || type === "banners_updated") {
        fetchBanners();
      }
    };

    socket.on("banner_created", fetchBanners);
    socket.on("banner_updated", fetchBanners);
    socket.on("banner_deleted", fetchBanners);
    socket.on("homepage_updated", handleBannerUpdate);

    return () => {
      socket.off("banner_created", fetchBanners);
      socket.off("banner_updated", fetchBanners);
      socket.off("banner_deleted", fetchBanners);
      socket.off("homepage_updated", handleBannerUpdate);
    };
  }, [fetchBanners]);

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

  return (
    <section
      className="hero-banner-container"
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
