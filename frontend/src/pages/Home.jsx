import React from "react";

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

import "../styles/Home.css";

const Home = () => {
  return (
    <main className="home-page">
      <Navbar />
      <CategoryNav />

      <div className="home-container">
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
