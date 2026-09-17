import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/home/Home.css";

import api from "../api/axios";
import socket from "../socket/socket";

import CouponBanner from "../components/home/CouponBanner";
import CategoryCarousel from "../components/home/CategoryCarousel";
import PromoBanner from "../components/home/PromoBanner";
import CategoryShowcase from "../components/home/CategoryShowcase";
import ProductSection from "../components/home/ProductSection";
import SportsCategories from "../components/home/SportsCategories";
import PromoBanner2 from "../components/home/PromoBanner2";
import StormProofSection from "../components/home/StormProofSection";
import EverydayEssentials from "../components/home/EverydayEssentials";
import LovedCategories from "../components/home/LovedCategories";
import OutdoorProducts from "../components/home/OutdoorProducts";
import EquippingChampions from "../components/home/EquippingChampions";
import Footer from "../components/home/Footer";

const Home = () => {
  const navigate = useNavigate();

  const [pageSections, setPageSections] = useState(() => {
    try {
      const cached = sessionStorage.getItem("cached_home_sections");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem("cached_home_sections");
    } catch {
      return true;
    }
  });

  /* ========================================
     FETCH HOME SECTIONS
  ======================================== */

  const fetchHomeSections = async () => {
    try {
      const response = await api.get("/pages/slug/home");

      const secs = response.data?.page?.sections || [];

      setPageSections(secs);

      try {
        sessionStorage.setItem("cached_home_sections", JSON.stringify(secs));
      } catch (e) {
        // Ignore quota error
      }
    } catch (error) {
      console.error("Fetch Home Page Builder Sections Error:", error);
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     INITIAL LOAD + SOCKET
  ======================================== */

  useEffect(() => {
    fetchHomeSections();

    let debounceTimer;
    const handleUpdate = (data) => {
      if (data?.slug === "home" || !data?.slug) {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          fetchHomeSections();
        }, 250);
      }
    };

    socket.on("homepage_updated", handleUpdate);
    socket.on("product_created", handleUpdate);
    socket.on("product_updated", handleUpdate);
    socket.on("product_deleted", handleUpdate);
    socket.on("products_updated", handleUpdate);
    socket.on("category_created", handleUpdate);
    socket.on("category_updated", handleUpdate);
    socket.on("category_deleted", handleUpdate);
    socket.on("categories_updated", handleUpdate);
    socket.on("banner_created", handleUpdate);
    socket.on("banner_updated", handleUpdate);
    socket.on("banner_deleted", handleUpdate);
    socket.on("banners_updated", handleUpdate);
    socket.on("section_updated", handleUpdate);
    socket.on("page_updated", handleUpdate);

    return () => {
      clearTimeout(debounceTimer);
      socket.off("homepage_updated", handleUpdate);
      socket.off("product_created", handleUpdate);
      socket.off("product_updated", handleUpdate);
      socket.off("product_deleted", handleUpdate);
      socket.off("products_updated", handleUpdate);
      socket.off("category_created", handleUpdate);
      socket.off("category_updated", handleUpdate);
      socket.off("category_deleted", handleUpdate);
      socket.off("categories_updated", handleUpdate);
      socket.off("banner_created", handleUpdate);
      socket.off("banner_updated", handleUpdate);
      socket.off("banner_deleted", handleUpdate);
      socket.off("banners_updated", handleUpdate);
      socket.off("section_updated", handleUpdate);
      socket.off("page_updated", handleUpdate);
    };
  }, []);

  /* ========================================
     IMAGE URL
  ======================================== */

  const getImageUrl = (image) => {
    if (!image) return "";

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

  /* ========================================
     OTHER SECTION
  ======================================== */

  const OtherSection = ({ section }) => {
    const items = Array.isArray(section.items) ? section.items : [];

    if (!items.length) {
      return null;
    }

    return (
      <section className="custom-other-section">
        {section.name &&
          !section.name.toLowerCase().includes("carousel") &&
          !section.name.toLowerCase().includes("popular") &&
          !section.name.toLowerCase().includes("category") && (
            <div className="custom-other-header">
              <h2 className="custom-other-title">{section.name}</h2>
            </div>
          )}

        <div className="custom-other-grid">
          {items.map((item, itemIdx) => {
            const imageUrl = getImageUrl(item.image);

            const hasLink = Boolean(item.link);

            const handleClick = () => {
              if (!item.link) {
                return;
              }

              navigate(item.link);
            };

            return (
              <div
                key={item._id || itemIdx}
                className={`custom-other-card ${hasLink ? "clickable" : ""}`}
                onClick={handleClick}
              >
                {/* IMAGE */}

                <div className="custom-other-image-wrapper">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={item.name || "Category"}
                      className="custom-other-img"
                    />
                  ) : (
                    <div className="custom-other-no-img">No Image</div>
                  )}
                </div>

                {/* NAME */}

                <div className="custom-other-info">
                  <h3 className="custom-other-item-title">{item.name}</h3>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  /* ========================================
     RENDER SECTION
  ======================================== */

  const renderSection = (sec, idx) => {
    if (!sec) {
      return null;
    }

    const nameLower = (sec.name || "").toLowerCase();

    /* ========================================
       EVERYDAY ESSENTIALS / RAINY DAY COLLECTION (SECTION 9)
    ======================================== */

    if (
      nameLower.includes("rainy") ||
      nameLower.includes("monsoon") ||
      nameLower.includes("everyday") ||
      nameLower.includes("essentials") ||
      nameLower.includes("head to toe")
    ) {
      return (
        <EverydayEssentials
          key={sec._id || idx}
          section={sec}
          title={sec.name}
          customCategories={sec.categories}
          customItems={sec.items}
        />
      );
    }

    /* ========================================
       OTHER
    ======================================== */

    if (sec.type === "other") {
      return <OtherSection key={sec._id || idx} section={sec} />;
    }

    /* ========================================
       COUPON
    ======================================== */

    if (nameLower.includes("coupon")) {
      return <CouponBanner key={sec._id || idx} customBanners={sec.banners} />;
    }

    /* ========================================
       CATEGORY CAROUSEL
    ======================================== */

    if (nameLower.includes("carousel") || nameLower.includes("popular")) {
      return (
        <CategoryCarousel
          key={sec._id || idx}
          customCategories={sec.categories?.length ? sec.categories : sec.items}
          customItems={sec.items}
          title={sec.name}
        />
      );
    }

    /* ========================================
       PROMO BANNER 2
    ======================================== */

    if (
      nameLower.includes("promo banner 2") ||
      nameLower.includes("promobanner2")
    ) {
      return <PromoBanner2 key={sec._id || idx} customBanners={sec.banners} />;
    }

    /* ========================================
       PROMO
    ======================================== */

    if (nameLower.includes("promo")) {
      return <PromoBanner key={sec._id || idx} customBanners={sec.banners} />;
    }

    /* ========================================
       SHOWCASE
    ======================================== */

    if (nameLower.includes("showcase")) {
      return (
        <CategoryShowcase
          key={sec._id || idx}
          customCategories={sec.categories}
        />
      );
    }

    /* ========================================
       PRODUCT
    ======================================== */

    if (nameLower.includes("product section")) {
      return (
        <ProductSection
          key={sec._id || idx}
          customProducts={sec.products}
          title={sec.name}
        />
      );
    }

    /* ========================================
       SPORTS
    ======================================== */

    if (nameLower.includes("sports")) {
      return (
        <SportsCategories
          key={sec._id || idx}
          customCategories={sec.categories}
        />
      );
    }

    /* ========================================
       STORM
    ======================================== */

    if (nameLower.includes("storm")) {
      return (
        <StormProofSection key={sec._id || idx} customProducts={sec.products} />
      );
    }

    /* ========================================
       RAINY / MONSOON
    ======================================== */

    if (nameLower.includes("rainy") || nameLower.includes("monsoon")) {
      return (
        <EverydayEssentials
          key={sec._id || idx}
          section={sec}
          title={sec.name}
          customCategories={sec.categories}
          customItems={sec.items}
        />
      );
    }

    /* ========================================
       LOVED
    ======================================== */

    if (nameLower.includes("loved")) {
      return (
        <LovedCategories
          key={sec._id || idx}
          customCategories={sec.categories}
        />
      );
    }

    /* ========================================
       CHAMPIONS
    ======================================== */

    if (nameLower.includes("champions")) {
      return (
        <EquippingChampions
          key={sec._id || idx}
          customCategories={sec.categories}
        />
      );
    }

    /* ========================================
       OUTDOOR
    ======================================== */

    if (nameLower.includes("outdoor")) {
      return (
        <OutdoorProducts key={sec._id || idx} customProducts={sec.products} />
      );
    }

    /* ========================================
       GENERIC BANNER
    ======================================== */

    if (sec.type === "banner") {
      return <PromoBanner key={sec._id || idx} customBanners={sec.banners} />;
    }

    /* ========================================
       GENERIC CATEGORY
    ======================================== */

    if (sec.type === "category") {
      return (
        <CategoryCarousel
          key={sec._id || idx}
          customCategories={sec.categories}
          title={sec.name}
        />
      );
    }

    /* ========================================
       GENERIC PRODUCT
    ======================================== */

    if (sec.type === "product") {
      return (
        <ProductSection
          key={sec._id || idx}
          customProducts={sec.products}
          title={sec.name}
        />
      );
    }

    return null;
  };

  /* ========================================
     RENDER
  ======================================== */

  const hasDynamicSections = pageSections.length > 0;

  return (
    <main className="home-page">
      <div className="home-container">
        {loading && pageSections.length === 0 ? (
          <div className="home-skeleton-wrapper">
            <div className="home-skeleton-banner"></div>
            <div className="home-skeleton-row">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="home-skeleton-card"></div>
              ))}
            </div>
            <div className="home-skeleton-banner"></div>
          </div>
        ) : hasDynamicSections ? (
          pageSections.map((sec, idx) => renderSection(sec, idx))
        ) : (
          <>
            <CouponBanner />

            <CategoryCarousel />

            <PromoBanner />

            <CategoryShowcase />

            <ProductSection />

            <SportsCategories />

            <PromoBanner2 />

            <StormProofSection />

            <EverydayEssentials />

            <LovedCategories />

            <OutdoorProducts />

            <EquippingChampions />
          </>
        )}
      </div>

      <Footer />
    </main>
  );
};

export default Home;
