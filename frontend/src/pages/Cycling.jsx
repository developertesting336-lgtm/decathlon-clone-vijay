import React from "react";

import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";

import HeroBanner from "../components/pageSections/HeroBanner/HeroBanner";
import CategoryCarousel from "../components/pageSections/CategoryCarousel/CategoryCarousel";
import PromoBanner from "../components/pageSections/PromoBanner/PromoBanner";
import ProductSection from "../components/pageSections/ProductSection/ProductSection";
import OutdoorProducts from "../components/pageSections/OutdoorProducts/OutdoorProducts";

import Footer from "../components/pageSections/Footer/Footer";

import "../styles/Home.css";

const Cycling = () => {
  return (
    <div className="cycling-page">
      <Navbar />
      <CategoryNav />

      <main className="cycling-container home-container">
        <HeroBanner pageSlug="cycling" />
        <CategoryCarousel pageSlug="cycling" />
        <PromoBanner pageSlug="cycling" />
        <ProductSection pageSlug="cycling" />
        <OutdoorProducts pageSlug="cycling" />
      </main>

      <Footer />
    </div>
  );
};

export default Cycling;
