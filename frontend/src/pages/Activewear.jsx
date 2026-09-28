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

const Activewear = () => {
  return (
    <div className="activewear-page">
      <Navbar />
      <CategoryNav />

      <main className="activewear-container home-container">
        <HeroBanner pageSlug="activewear" />
        <CategoryCarousel pageSlug="activewear" />
        <PromoBanner pageSlug="activewear" />
        <ProductSection pageSlug="activewear" />
        <EverydayEssentials pageSlug="activewear" />
      </main>

      <Footer />
    </div>
  );
};

export default Activewear;
