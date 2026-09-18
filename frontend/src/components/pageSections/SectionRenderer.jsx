import React from "react";
import HeroBanner from "./HeroBanner/HeroBanner";
import CouponBanner from "./CouponBanner/CouponBanner";
import CategoryCarousel from "./CategoryCarousel/CategoryCarousel";
import CategoryNav from "./CategoryNav/CategoryNav";
import CategoryShowcase from "./CategoryShowcase/CategoryShowcase";
import ProductSection from "./ProductSection/ProductSection";
import PromoBanner from "./PromoBanner/PromoBanner";
import PromoBanner2 from "./PromoBanner2/PromoBanner2";
import SportsCategories from "./SportsCategories/SportsCategories";
import StormProofSection from "./StormProofSection/StormProofSection";
import EverydayEssentials from "./EverydayEssentials/EverydayEssentials";
import LovedCategories from "./LovedCategories/LovedCategories";
import OutdoorProducts from "./OutdoorProducts/OutdoorProducts";
import EquippingChampions from "./EquippingChampions/EquippingChampions";
import Footer from "./Footer/Footer";
import StoreSection from "../StoreSection";

// Map of canonical section types to their respective React components
const SECTION_COMPONENTS = {
  "hero-banner": HeroBanner,
  "coupon-banner": CouponBanner,
  "category-carousel": CategoryCarousel,
  "category-nav": CategoryNav,
  "category-showcase": CategoryShowcase,
  "product-section": ProductSection,
  "promo-banner": PromoBanner,
  "promo-banner-2": PromoBanner2,
  "sports-categories": SportsCategories,
  "storm-proof": StormProofSection,
  "everyday-essentials": EverydayEssentials,
  "loved-categories": LovedCategories,
  "outdoor-products": OutdoorProducts,
  "equipping-champions": EquippingChampions,
  "footer": Footer,
  "store-section": StoreSection,
};

// Aliases and legacy mappings for backward compatibility
const SECTION_ALIASES = {
  HeroBanner: "hero-banner",
  CouponBanner: "coupon-banner",
  CategoryCarousel: "category-carousel",
  CategoryNav: "category-nav",
  CategoryShowcase: "category-showcase",
  ProductSection: "product-section",
  PromoBanner: "promo-banner",
  PromoBanner2: "promo-banner-2",
  SportsCategories: "sports-categories",
  StormProofSection: "storm-proof",
  EverydayEssentials: "everyday-essentials",
  LovedCategories: "loved-categories",
  OutdoorProducts: "outdoor-products",
  EquippingChampions: "equipping-champions",
  Footer: "footer",
  StoreSection: "store-section",
  // Legacy short types
  banner: "promo-banner",
  product: "product-section",
  category: "category-showcase",
};

/**
 * SectionRenderer dynamically renders a page section based on section.type.
 * Dispatches to canonical components uniformly across all pages (Home, Store pages, custom pages).
 */
const SectionRenderer = ({
  section,
  pageSlug,
  sectionIndex,
  getImageUrl,
  formatPrice,
  isWishlisted,
  handleToggleWishlist,
  onOpenCartModal,
  navigate,
  ...extraProps
}) => {
  if (!section) return null;

  // Check isActive flag (default to true if undefined)
  if (section.isActive === false) return null;

  // Canonical Section rendering
  const rawType = section.type || "";
  const normalizedType =
    SECTION_COMPONENTS[rawType]
      ? rawType
      : SECTION_ALIASES[rawType] ||
        SECTION_ALIASES[section.name] ||
        rawType.toLowerCase();

  const Component = SECTION_COMPONENTS[normalizedType];

  if (!Component) {
    // If not recognized canonical type, try StoreSection as fallback for non-home pages
    if (pageSlug && pageSlug !== "home" && pageSlug !== "index") {
      return (
        <StoreSection
          key={section._id || section.id || sectionIndex}
          section={section}
          sectionIndex={sectionIndex}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
          isWishlisted={isWishlisted}
          handleToggleWishlist={handleToggleWishlist}
          onOpenCartModal={onOpenCartModal}
          navigate={navigate}
          pageSlug={pageSlug}
          {...extraProps}
        />
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.warn(
        `[SectionRenderer] Unrecognized section type: "${rawType}" for section:`,
        section
      );
    }
    return null;
  }

  const sectionData = section.data || {};
  const sectionStyle = section.style || {};

  return (
    <Component
      key={section._id || section.id || section.order || sectionIndex}
      section={section}
      data={sectionData}
      style={sectionStyle}
      pageSlug={pageSlug}
      sectionIndex={sectionIndex}
      getImageUrl={getImageUrl}
      formatPrice={formatPrice}
      isWishlisted={isWishlisted}
      handleToggleWishlist={handleToggleWishlist}
      onOpenCartModal={onOpenCartModal}
      navigate={navigate}
      {...extraProps}
    />
  );
};

export default SectionRenderer;

