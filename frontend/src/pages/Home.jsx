import React, { useEffect, useState } from "react";
import "../styles/home/Home.css";
import api from "../api/axios";
import socket from "../socket/socket";
import SectionRenderer from "../components/pageSections/SectionRenderer";
import Footer from "../components/pageSections/Footer/Footer";

const Home = () => {
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
     INITIAL LOAD + SOCKET REALTIME UPDATES
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
          pageSections
            .filter((sec) => sec.isActive !== false)
            .sort(
              (a, b) =>
                ((a.order !== undefined ? a.order : a.sortOrder) || 0) -
                ((b.order !== undefined ? b.order : b.sortOrder) || 0)
            )
            .map((sec, idx) => (
              <SectionRenderer
                key={sec._id || sec.id || idx}
                section={sec}
                sectionIndex={idx}
                pageSlug="home"
              />
            ))
        ) : (
          <>
            <SectionRenderer section={{ type: "coupon-banner" }} pageSlug="home" />
            <SectionRenderer section={{ type: "category-carousel" }} pageSlug="home" />
            <SectionRenderer section={{ type: "promo-banner" }} pageSlug="home" />
            <SectionRenderer section={{ type: "category-showcase" }} pageSlug="home" />
            <SectionRenderer section={{ type: "product-section" }} pageSlug="home" />
            <SectionRenderer section={{ type: "sports-categories" }} pageSlug="home" />
            <SectionRenderer section={{ type: "promo-banner-2" }} pageSlug="home" />
            <SectionRenderer section={{ type: "storm-proof" }} pageSlug="home" />
            <SectionRenderer section={{ type: "everyday-essentials" }} pageSlug="home" />
            <SectionRenderer section={{ type: "loved-categories" }} pageSlug="home" />
            <SectionRenderer section={{ type: "outdoor-products" }} pageSlug="home" />
            <SectionRenderer section={{ type: "equipping-champions" }} pageSlug="home" />
          </>
        )}
      </div>

      <Footer />
    </main>
  );
};

export default Home;
