import React from "react";
import { Route, Navigate } from "react-router-dom";
import CategoryProducts from "../pages/CategoryProducts";

// Dedicated Store Pages
import MonsoonEssentials from "../pages/CategoryCarousel/MonsoonEssentials";
import Activewear from "../pages/CategoryCarousel/Activewear";
import WorkoutEssentials from "../pages/CategoryCarousel/WorkoutEssentials";
import Cycling from "../pages/CategoryCarousel/Cycling";
import HikingTrekking from "../pages/CategoryCarousel/HikingTrekking";
import Shoes from "../pages/CategoryCarousel/Shoes";
import BagsBackpacks from "../pages/CategoryCarousel/BagsBackpacks";
import SportsAccessories from "../pages/CategoryCarousel/SportsAccessories";

const CategoryRoutes = (
  <>
    {/* Dedicated store pages */}
    <Route path="/monsoon-essentials" element={<MonsoonEssentials />} />
    <Route path="/activewear" element={<Activewear />} />
    <Route path="/workout-essentials" element={<WorkoutEssentials />} />
    <Route path="/cycling" element={<Cycling />} />
    <Route path="/cycle-store" element={<Cycling />} />
    <Route path="/hiking-trekking" element={<HikingTrekking />} />
    <Route path="/hiking-trekking-store" element={<HikingTrekking />} />
    <Route path="/shoes" element={<Shoes />} />
    <Route path="/sports-footwear" element={<Shoes />} />
    <Route path="/bags-backpacks" element={<BagsBackpacks />} />
    <Route path="/bags-store" element={<BagsBackpacks />} />
    <Route path="/bags" element={<BagsBackpacks />} />
    <Route path="/sports-accessories" element={<SportsAccessories />} />
    <Route path="/accessories-store" element={<SportsAccessories />} />
    <Route path="/accessories" element={<SportsAccessories />} />

    {/* Product Category Listing routes */}
    <Route path="/products" element={<CategoryProducts />} />
    <Route path="/category/:category" element={<CategoryProducts />} />
    <Route path="/c/:category" element={<CategoryProducts />} />
    <Route path="/sports/:category" element={<CategoryProducts />} />

    {/* Direct Category Showcase aliases */}
    <Route path="/running-shoes" element={<Navigate to="/category/running-shoes" replace />} />
    <Route path="/shorts" element={<Navigate to="/category/shorts" replace />} />
    <Route path="/pants" element={<Navigate to="/category/pants" replace />} />
    <Route path="/t-shirts" element={<Navigate to="/category/t-shirts" replace />} />
    <Route path="/football" element={<Navigate to="/category/football" replace />} />
    <Route path="/fitness-equipments" element={<Navigate to="/category/fitness-equipments" replace />} />
    <Route path="/trekking-shoes" element={<Navigate to="/category/trekking-shoes" replace />} />
    <Route path="/nutrition-care" element={<Navigate to="/category/nutrition-care" replace />} />

    {/* Direct Sports Categories aliases */}
    <Route path="/yoga" element={<Navigate to="/category/yoga" replace />} />
    <Route path="/camping" element={<Navigate to="/category/camping" replace />} />
    <Route path="/cricket" element={<Navigate to="/category/cricket" replace />} />
    <Route path="/badminton" element={<Navigate to="/category/badminton" replace />} />
    <Route path="/skating" element={<Navigate to="/category/skating" replace />} />
    <Route path="/tennis" element={<Navigate to="/category/tennis" replace />} />
    <Route path="/safari" element={<Navigate to="/category/safari" replace />} />
    <Route path="/all-sports" element={<Navigate to="/category/all-sports" replace />} />
  </>
);

export default CategoryRoutes;
