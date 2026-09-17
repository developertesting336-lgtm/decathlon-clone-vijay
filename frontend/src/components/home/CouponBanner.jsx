import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/CouponBanner.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const CouponBanner = ({ customBanners }) => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);

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

  const fetchCouponSection = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/pages/slug/home");

      const pageSections = response.data?.page?.sections || [];

      const section = pageSections.find(
        (item) => item.name === "CouponBanner" || (item.type === "banner" && item.name.includes("Coupon"))
      );

      if (!section || !section.banners || section.banners.length === 0) {
        setBanner(null);
        return;
      }

      setBanner(section.banners[0]);
    } catch (error) {
      console.error("Coupon Section Error:", error);
      setBanner(null);
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
      setBanner(customBanners[0]);
      setLoading(false);
      return;
    }
    fetchCouponSection();
  }, [customBanners, fetchCouponSection]);

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
        fetchCouponSection();
        return;
      }

      if (bannerEvents.includes(data?.type)) {
        fetchCouponSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);

    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [fetchCouponSection]);

  /*
  ========================================
  LOADING / EMPTY
  ========================================
  */

  if (loading || !banner?.image) {
    return null;
  }

  const handleBannerClick = () => {
    if (banner?.link && banner.link !== "#" && banner.link !== "/") {
      if (banner.link.startsWith("http://") || banner.link.startsWith("https://")) {
        window.location.href = banner.link;
        return;
      }
      navigate(banner.link);
    } else {
      navigate("/");
    }
  };

  return (
    <section className="coupon-banner">
      <div
        className="coupon-banner-clickable"
        onClick={handleBannerClick}
        style={{ cursor: "pointer", display: "block" }}
        role="button"
        tabIndex={0}
      >
        <img
          src={getImageUrl(banner.image)}
          alt={banner.title || "Coupon Offers"}
          className="coupon-banner-image"
        />
      </div>
    </section>
  );
};

export default CouponBanner;
