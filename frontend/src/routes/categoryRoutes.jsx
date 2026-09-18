import React from "react";
import { Route } from "react-router-dom";
import CategoryProducts from "../pages/CategoryProducts";
import DynamicPage from "../pages/DynamicPage";

const CategoryRoutes = (
  <>
    {/* Dynamic store pages */}
    <Route path="/monsoon-essentials" element={<DynamicPage slug="monsoon-essentials" />} />
    <Route path="/activewear" element={<DynamicPage slug="activewear" />} />
    <Route path="/workout-essentials" element={<DynamicPage slug="workout-essentials" />} />
    <Route path="/cycling" element={<DynamicPage slug="cycling" />} />
    <Route path="/hiking-trekking" element={<DynamicPage slug="hiking-trekking" />} />
    <Route path="/shoes" element={<DynamicPage slug="shoes" />} />
    <Route path="/bags-backpacks" element={<DynamicPage slug="bags-backpacks" />} />
    <Route path="/sports-accessories" element={<DynamicPage slug="sports-accessories" />} />

    {/* General dynamic page routes */}
    <Route path="/pages/:slug" element={<DynamicPage />} />
    <Route path="/p/:slug" element={<DynamicPage />} />

    {/* Product Category Listing routes */}
    <Route path="/products" element={<CategoryProducts />} />
    <Route path="/category/:category" element={<CategoryProducts />} />
    <Route path="/c/:category" element={<CategoryProducts />} />
    <Route path="/sports/:category" element={<CategoryProducts />} />
  </>
);

export default CategoryRoutes;
