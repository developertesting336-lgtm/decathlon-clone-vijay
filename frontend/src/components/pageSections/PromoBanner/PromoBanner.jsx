import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./PromoBanner.css";
import api from "../../../api/axios";

const PromoBanner = ({ subcategory }) => {
  const navigate = useNavigate();

  const [banners, setBanners] = useState([]);
  const [current, setCurrent] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  const isResettingRef = useRef(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const res = await api.get("/banners");

        const allBanners = res.data?.banners || [];

        const targetSub = (subcategory || "home page promo banner")
          .trim()
          .toLowerCase()
          .replace(/['’]/g, "'");

        const activeBanners = allBanners
          .filter(
            (banner) =>
              banner.isActive === true &&
              (banner.subcategory || "")
                .trim()
                .toLowerCase()
                .replace(/['’]/g, "'") === targetSub
          )
          .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateA - dateB;
          });

        setBanners(activeBanners);
        setCurrent(activeBanners.length > 1 ? 1 : 0);
        setIsTransitioning(false);
      } catch (error) {
        console.error("Promo Banner Error:", error);
        setBanners([]);
      }
    };

    fetchBanners();
  }, [subcategory]);

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
    if (current >= banners.length + 1) {
      timer = setTimeout(() => {
        isResettingRef.current = true;
        setIsTransitioning(false);
        setCurrent(1);
      }, 500);
    } else if (current <= 0) {
      timer = setTimeout(() => {
        isResettingRef.current = true;
        setIsTransitioning(false);
        setCurrent(banners.length);
      }, 500);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [current, banners.length]);

  // Auto-play interval without reversing
  useEffect(() => {
    if (isPaused || banners.length <= 1) return;

    const interval = setInterval(() => {
      if (isResettingRef.current) return;
      setIsTransitioning(true);
      setCurrent((prev) => {
        if (prev >= banners.length + 1) return prev;
        return prev + 1;
      });
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused, banners.length]);

  const handleTransitionEnd = (e) => {
    if (e && (e.target !== e.currentTarget || e.propertyName !== "transform")) return;

    if (current >= banners.length + 1) {
      isResettingRef.current = true;
      setIsTransitioning(false);
      setCurrent(1);
    } else if (current <= 0) {
      isResettingRef.current = true;
      setIsTransitioning(false);
      setCurrent(banners.length);
    }
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }

    const backendUrl = (api.defaults.baseURL || "").replace(
      /\/api\/?$/,
      ""
    );

    return `${backendUrl}/${String(image).replace(/^\/+/, "")}`;
  };

  const handleBannerClick = (banner) => {
    if (!banner?.link || banner.link === "#") return;

    if (
      banner.link.startsWith("http://") ||
      banner.link.startsWith("https://")
    ) {
      window.location.href = banner.link;
    } else {
      navigate(banner.link);
    }
  };

  const previousBanner = () => {
    if (banners.length <= 1 || isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrent((prev) => {
      if (prev <= 0) return prev;
      return prev - 1;
    });
  };

  const nextBanner = () => {
    if (banners.length <= 1 || isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrent((prev) => {
      if (prev >= banners.length + 1) return prev;
      return prev + 1;
    });
  };

  const handleDotClick = (index) => {
    if (isResettingRef.current) return;
    setIsTransitioning(true);
    setCurrent(index + 1);
  };

  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50) {
      nextBanner();
    } else if (distance < -50) {
      previousBanner();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!banners.length) {
    return null;
  }

  // Clone last banner at start and first banner at end for seamless bidirectional loop
  const extendedBanners =
    banners.length > 1
      ? [banners[banners.length - 1], ...banners, banners[0]]
      : banners;

  const activeDot =
    banners.length > 0
      ? current === 0
        ? banners.length - 1
        : current === banners.length + 1
        ? 0
        : current - 1
      : 0;

  return (
    <section
      className="promo-banner"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      aria-label="Promotional Banners"
    >
      <div
        className="promo-slider"
        onTransitionEnd={handleTransitionEnd}
        style={{
          transform: `translateX(-${current * 100}%)`,
          transition: isTransitioning
            ? "transform 0.5s ease-in-out"
            : "none",
        }}
      >
        {extendedBanners.map((banner, index) => {
          const rawImage =
            banner.images?.length > 0 ? banner.images[0] : banner.image;
          const image =
            typeof rawImage === "object" && rawImage?.url
              ? rawImage.url
              : rawImage;

          return (
            <div
              key={`${banner._id || index}-${index}`}
              className="promo-slide"
              onClick={() => handleBannerClick(banner)}
              style={{ cursor: banner.link ? "pointer" : "default" }}
            >
              <img
                src={getImageUrl(image)}
                alt={banner.title || `Promotion ${index + 1}`}
                loading={index === 1 ? "eager" : "lazy"}
              />
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <>
          <button
            className="promo-arrow promo-arrow-left"
            onClick={previousBanner}
            aria-label="Previous Banner"
          >
            <MdChevronLeft size={22} />
          </button>

          <button
            className="promo-arrow promo-arrow-right"
            onClick={nextBanner}
            aria-label="Next Banner"
          >
            <MdChevronRight size={22} />
          </button>

          <div className="promo-dots">
            {banners.map((_, index) => (
              <button
                key={index}
                className={`promo-dot ${
                  activeDot === index ? "active" : ""
                }`}
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