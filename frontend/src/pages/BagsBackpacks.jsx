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

const BagsBackpacks = () => {
  return (
    <div className="bags-backpacks-page">
      <Navbar />
      <CategoryNav />

      <main className="bags-backpacks-container home-container">
        <HeroBanner pageSlug="bags-backpacks" />
        <CategoryCarousel pageSlug="bags-backpacks" />
        <PromoBanner pageSlug="bags-backpacks" />
        <ProductSection pageSlug="bags-backpacks" />
        <EverydayEssentials pageSlug="bags-backpacks" />
      </main>

      <Footer />
    </div>
  );
};

export default BagsBackpacks;
