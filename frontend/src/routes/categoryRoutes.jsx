import React from "react";
import { Route } from "react-router-dom";
import CategoryProducts from "../pages/CategoryProducts";
import MonsoonEssentials from "../pages/MonsoonEssentials";
import Activewear from "../pages/Activewear";
import WorkoutEssentials from "../pages/WorkoutEssentials";
import Cycling from "../pages/Cycling";
import HikingTrekking from "../pages/HikingTrekking";
import Shoes from "../pages/Shoes";
import BagsBackpacks from "../pages/BagsBackpacks";
import SportsAccessories from "../pages/SportsAccessories";

const CategoryRoutes = (
  <>
    {/* Dedicated routes for each store page */}
    <Route path="/monsoon-essentials" element={<MonsoonEssentials />} />
    <Route path="/activewear" element={<Activewear />} />
    <Route path="/workout-essentials" element={<WorkoutEssentials />} />
    <Route path="/cycling" element={<Cycling />} />
    <Route path="/hiking-trekking" element={<HikingTrekking />} />
    <Route path="/shoes" element={<Shoes />} />
    <Route path="/bags-backpacks" element={<BagsBackpacks />} />
    <Route path="/sports-accessories" element={<SportsAccessories />} />

    {/* Product Category Listing routes */}
    <Route path="/products" element={<CategoryProducts />} />
    <Route path="/category/:category" element={<CategoryProducts />} />
    <Route path="/c/:category" element={<CategoryProducts />} />
    <Route path="/sports/:category" element={<CategoryProducts />} />
  </>
);

export default CategoryRoutes;
