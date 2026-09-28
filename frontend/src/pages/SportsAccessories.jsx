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

const SportsAccessories = () => {
  return (
    <div className="sports-accessories-page">
      <Navbar />
      <CategoryNav />

      <main className="sports-accessories-container home-container">
        <HeroBanner pageSlug="sports-accessories" />
        <CategoryCarousel pageSlug="sports-accessories" />
        <PromoBanner pageSlug="sports-accessories" />
        <ProductSection pageSlug="sports-accessories" />
        <EverydayEssentials pageSlug="sports-accessories" />
      </main>

      <Footer />
    </div>
  );
};

export default SportsAccessories;
