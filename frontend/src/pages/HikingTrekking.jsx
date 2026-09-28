import React from "react";

import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";

import HeroBanner from "../components/pageSections/HeroBanner/HeroBanner";
import CategoryCarousel from "../components/pageSections/CategoryCarousel/CategoryCarousel";
import PromoBanner from "../components/pageSections/PromoBanner/PromoBanner";
import OutdoorProducts from "../components/pageSections/OutdoorProducts/OutdoorProducts";
import ProductSection from "../components/pageSections/ProductSection/ProductSection";

import Footer from "../components/pageSections/Footer/Footer";

import "../styles/Home.css";

const HikingTrekking = () => {
  return (
    <div className="hiking-trekking-page">
      <Navbar />
      <CategoryNav />

      <main className="hiking-trekking-container home-container">
        <HeroBanner pageSlug="hiking-trekking" />
        <CategoryCarousel pageSlug="hiking-trekking" />
        <PromoBanner pageSlug="hiking-trekking" />
        <OutdoorProducts pageSlug="hiking-trekking" />
        <ProductSection pageSlug="hiking-trekking" />
      </main>

      <Footer />
    </div>
  );
};

export default HikingTrekking;
