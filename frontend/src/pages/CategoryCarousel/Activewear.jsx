import React from "react";

import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";

import CategoryCarousel from "../../components/pageSections/CategoryCarousel/CategoryCarousel";
import PromoBanner from "../../components/pageSections/PromoBanner/PromoBanner";
import ProductSection from "../../components/pageSections/ProductSection/ProductSection";
import EverydayEssentials from "../../components/pageSections/EverydayEssentials/EverydayEssentials";

import Footer from "../../components/pageSections/Footer/Footer";

import "../../styles/CategoryCarousel/Activewear.css";

const Activewear = () => {
  return (
    <div className="activewear-page">
      <Navbar />

      <CategoryNav />

      <main className="activewear-container">
        {/* Men's Collection */}
        <CategoryCarousel
          subcategory="Men's Collection Activewear"
          title="Men's Collection"
          variant="circle"
        />

        {/* Promo Banner (Move in Balance) */}
        <PromoBanner subcategory="Activewear1" />

        {/* Women's Collection */}
        <CategoryCarousel
          subcategory="Women's Collection Activewear"
          title="Women's Collection"
          variant="circle"
        />

        {/* Women's Activewear Products */}
        <ProductSection
          subcategory="Women's Activewear"
          subtitle="Buy any 2 products"
          title={"Get ₹200/-\noff"}
        />

        {/* Style That Works Hard */}
        <EverydayEssentials
          subcategory="Style That Works Hard-Activewear"
          title="Style That Works Hard"
        />
      </main>

      <Footer />
    </div>
  );
};

export default Activewear;
