import React from "react";

import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";

import HeroBanner from "../components/pageSections/HeroBanner/HeroBanner";
import CategoryCarousel from "../components/pageSections/CategoryCarousel/CategoryCarousel";
import PromoBanner from "../components/pageSections/PromoBanner/PromoBanner";
import ProductSection from "../components/pageSections/ProductSection/ProductSection";
import EverydayEssentials from "../components/pageSections/EverydayEssentials/EverydayEssentials";

import Footer from "../components/pageSections/Footer/Footer";

import "../styles/Home.css";

const MonsoonEssentials = () => {
  return (
    <div className="monsoon-essentials-page">
      <Navbar />
      <CategoryNav />

      <main className="monsoon-essentials-container home-container">
        <HeroBanner pageSlug="monsoon-essentials" />
        <CategoryCarousel pageSlug="monsoon-essentials" />
        <PromoBanner pageSlug="monsoon-essentials" />
        <ProductSection pageSlug="monsoon-essentials" />
        <EverydayEssentials pageSlug="monsoon-essentials" />
      </main>

      <Footer />
    </div>
  );
};

export default MonsoonEssentials;
