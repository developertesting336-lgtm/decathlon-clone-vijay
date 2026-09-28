import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CouponBanner.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const CouponBanner = ({ style } = {}) => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(true);

  // Return Cloudinary or backend image URL exactly as returned by API
  const getImageUrl = (image) => {
    if (!image || typeof image !== "string") return "";
    const trimmed = image.trim();

    // If already absolute URL (Cloudinary, HTTPS, HTTP, protocol-relative), return exactly as-is
    if (
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("//")
    ) {
      return trimmed;
    }

    const apiBaseUrl = api.defaults?.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    if (trimmed.startsWith("/uploads/")) {
      return `${backendUrl}${trimmed}`;
    }
    if (trimmed.startsWith("uploads/")) {
      return `${backendUrl}/${trimmed}`;
    }

    return `${backendUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  };

  const fetchCouponBanner = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch active banners from existing Banner API
      let bannersList = [];
      try {
        const response = await api.get("/banners?isActive=true");
        bannersList = response.data?.banners || [];
      } catch (err) {
        console.warn("Failed fetching with isActive=true query, retrying /banners:", err);
      }

      if (!bannersList.length) {
        const response = await api.get("/banners");
        bannersList = response.data?.banners || [];
      }

      // Filter active banners
      const activeBanners = bannersList.filter((b) => b && b.isActive !== false);

      // Find banner whose subcategory is "coupon banner" (handle case differences safely)
      const foundBanner =
        activeBanners.find((b) => {
          const sub = (b.subcategory || "").trim().toLowerCase();
          return sub === "coupon banner" || sub === "coupon-banner";
        }) ||
        activeBanners.find((b) => {
          const sub = (b.subcategory || "").trim().toLowerCase();
          return sub.includes("coupon");
        }) ||
        activeBanners.find((b) => {
          const type = (b.type || "").trim().toLowerCase();
          return type === "coupon" || type === "coupon banner" || type === "coupon-banner";
        }) ||
        activeBanners.find((b) => {
          const title = (b.title || "").trim().toLowerCase();
          return title.includes("coupon");
        });

      setBanner(foundBanner || null);
    } catch (error) {
      console.error("Coupon Banner API Error:", error);
      setBanner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCouponBanner();
  }, [fetchCouponBanner]);

  // Real-time banner updates when modified in Admin Banner Management
  useEffect(() => {
    const handleBannerChange = () => {
      fetchCouponBanner();
    };

    socket.on("banner_created", handleBannerChange);
    socket.on("banner_updated", handleBannerChange);
    socket.on("banner_deleted", handleBannerChange);
    socket.on("banners_updated", handleBannerChange);

    const handleHomepageBannerUpdate = (payload) => {
      if (
        payload?.type &&
        (payload.type.startsWith("banner_") || payload.type === "banners_updated")
      ) {
        fetchCouponBanner();
      }
    };
    socket.on("homepage_updated", handleHomepageBannerUpdate);

    return () => {
      socket.off("banner_created", handleBannerChange);
      socket.off("banner_updated", handleBannerChange);
      socket.off("banner_deleted", handleBannerChange);
      socket.off("banners_updated", handleBannerChange);
      socket.off("homepage_updated", handleHomepageBannerUpdate);
    };
  }, [fetchCouponBanner]);

  // Extract images array with backward compatibility to single image field
  const getBannerImages = () => {
    if (!banner) return [];
    if (Array.isArray(banner.images) && banner.images.length > 0) {
      const valid = banner.images.filter(
        (img) => typeof img === "string" && img.trim().length > 0
      );
      if (valid.length > 0) return valid;
    }
    if (banner.image && typeof banner.image === "string" && banner.image.trim().length > 0) {
      return [banner.image.trim()];
    }
    return [];
  };

  const images = getBannerImages();

  if (loading || images.length === 0) {
    return null;
  }

  const handleBannerClick = () => {
    const link = banner?.link?.trim();
    if (!link || link === "#") return;

    if (link.startsWith("http://") || link.startsWith("https://")) {
      window.location.href = link;
      return;
    }

    navigate(link);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleBannerClick();
    }
  };

  const isClickable = Boolean(banner?.link && banner.link.trim() !== "");
  const bannerTitle = banner?.title || "Get Your First-Order Coupon";
  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section className={`coupon-banner ${variantClass}`.trim()} aria-label={bannerTitle}>
      <div
        className={`coupon-banner-clickable ${isClickable ? "is-clickable" : ""} ${
          images.length > 1 ? "has-multiple" : ""
        }`}
        onClick={handleBannerClick}
        onKeyDown={handleKeyDown}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
      >
        {images.map((imgUrl, idx) => (
          <img
            key={`${imgUrl}-${idx}`}
            src={getImageUrl(imgUrl)}
            alt={bannerTitle || `Coupon Offer ${idx + 1}`}
            title={bannerTitle}
            className="coupon-banner-image"
          />
        ))}
      </div>
    </section>
  );
};

export default CouponBanner;
