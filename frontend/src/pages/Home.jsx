import React, { useState, useEffect } from "react";

import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";

import CouponBanner from "../components/pageSections/CouponBanner/CouponBanner";
import CategoryCarousel from "../components/pageSections/CategoryCarousel/CategoryCarousel";
import CategoryShowcase from "../components/pageSections/CategoryShowcase/CategoryShowcase";
import ProductSection from "../components/pageSections/ProductSection/ProductSection";
import PromoBanner from "../components/pageSections/PromoBanner/PromoBanner";
import PromoBanner2 from "../components/pageSections/PromoBanner2/PromoBanner2";
import SportsCategories from "../components/pageSections/SportsCategories/SportsCategories";
import EverydayEssentials from "../components/pageSections/EverydayEssentials/EverydayEssentials";
import LovedCategories from "../components/pageSections/LovedCategories/LovedCategories";
import OutdoorProducts from "../components/pageSections/OutdoorProducts/OutdoorProducts";
import EquippingChampions from "../components/pageSections/EquippingChampions/EquippingChampions";

import Footer from "../components/pageSections/Footer/Footer";
import api from "../api/axios";

import "../styles/Home.css";

const Home = () => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchHomeData = async () => {
      try {
        setLoading(true);
        const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 4000));
        await Promise.race([
          Promise.allSettled([
            api.get("/banners?isActive=true").catch(() => api.get("/banners")),
            api.get("/categories"),
            api.get("/products?limit=50"),
          ]),
          timeoutPromise,
        ]);
      } catch (err) {
        console.error("Home loading error:", err);
      } finally {
        if (isMounted) {
          // Allow subcomponents a brief moment to process state updates before revealing
          setTimeout(() => {
            if (isMounted) {
              setLoading(false);
              setTimeout(() => {
                window.dispatchEvent(new Event("resize"));
              }, 50);
            }
          }, 150);
        }
      }
    };

    fetchHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="home-page">
      <Navbar />
      <CategoryNav />

      {loading ? (
        <div className="home-container">
          <div
            className="home-skeleton-wrapper"
            aria-busy="true"
            aria-label="Loading homepage content"
          >
            <div className="home-loading-header">
              <div className="home-loading-spinner" />
              <span className="home-loading-text">Loading Decathlon...</span>
            </div>
            <div className="home-skeleton-banner home-skeleton-coupon"></div>
            <div className="home-skeleton-row">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="home-skeleton-card"></div>
              ))}
            </div>
            <div className="home-skeleton-banner home-skeleton-hero"></div>
            <div className="home-skeleton-products-wrapper">
              <div className="home-skeleton-title"></div>
              <div className="home-skeleton-products-row">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="home-skeleton-product-card"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className="home-container"
        style={loading ? { display: "none" } : undefined}
      >
        <CouponBanner />
        <CategoryCarousel />
        <PromoBanner />
        <CategoryShowcase />
        <ProductSection />
        <SportsCategories />
        <PromoBanner2 />
        <EverydayEssentials />
        <LovedCategories />
        <OutdoorProducts />
        <EquippingChampions />
      </div>

      <Footer />
    </main>
  );
};

export default Home;
