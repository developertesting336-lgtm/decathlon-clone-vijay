import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CouponBanner.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const CouponBanner = ({ section, data, customBanners, style }) => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(null);
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

  const fetchCouponSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "coupon-banner" ||
          item.name === "CouponBanner" ||
          (item.name && item.name.toLowerCase().includes("coupon"))
      );

      const bannersList = found?.data?.banners || found?.banners || [];
      if (!bannersList.length) {
        setBanner(null);
        return;
      }
      setBanner(bannersList[0]);
    } catch (error) {
      console.error("Coupon Section Error:", error);
      setBanner(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const directBanners =
      data?.banners?.length
        ? data.banners
        : section?.data?.banners?.length
        ? section.data.banners
        : section?.banners?.length
        ? section.banners
        : customBanners;

    if (directBanners && Array.isArray(directBanners) && directBanners.length > 0) {
      setBanner(directBanners[0]);
      setLoading(false);
      return;
    }

    if (data?.image || section?.data?.image) {
      setBanner({ image: data?.image || section.data.image, link: data?.link || "/" });
      setLoading(false);
      return;
    }

    fetchCouponSection();
  }, [data, section, customBanners, fetchCouponSection]);

  useEffect(() => {
    // If banners were provided as direct props, parent handles socket updates
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
        fetchCouponSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);
    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [data, section, customBanners, fetchCouponSection]);

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

  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section className={`coupon-banner ${variantClass}`}>
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
