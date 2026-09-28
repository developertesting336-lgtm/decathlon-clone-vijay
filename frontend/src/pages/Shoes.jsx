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

const Shoes = () => {
  return (
    <div className="shoes-page">
      <Navbar />
      <CategoryNav />

      <main className="shoes-container home-container">
        <HeroBanner pageSlug="shoes" />
        <CategoryCarousel pageSlug="shoes" />
        <PromoBanner pageSlug="shoes" />
        <ProductSection pageSlug="shoes" />
        <EverydayEssentials pageSlug="shoes" />
      </main>

      <Footer />
    </div>
  );
};

export default Shoes;
