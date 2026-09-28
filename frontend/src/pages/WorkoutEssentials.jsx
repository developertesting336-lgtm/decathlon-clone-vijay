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

const WorkoutEssentials = () => {
  return (
    <div className="workout-essentials-page">
      <Navbar />
      <CategoryNav />

      <main className="workout-essentials-container home-container">
        <HeroBanner pageSlug="workout-essentials" />
        <CategoryCarousel pageSlug="workout-essentials" />
        <PromoBanner pageSlug="workout-essentials" />
        <ProductSection pageSlug="workout-essentials" />
        <EverydayEssentials pageSlug="workout-essentials" />
      </main>

      <Footer />
    </div>
  );
};

export default WorkoutEssentials;
