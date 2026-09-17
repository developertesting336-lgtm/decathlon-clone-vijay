import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import CategoryNav from "../components/home/CategoryNav";
import Footer from "../components/home/Footer";
import ProductSizeModal from "../components/ProductSizeModal";
import StoreSection from "../components/StoreSection";
import useStorePage from "../hooks/useStorePage";

import "../styles/pages/sports-accessories.css";

const PAGE_SLUG = "sports-accessories";

const SportsAccessories = () => {
  const {
    page,
    sections,
    loading,
    notFound,
    selectedProduct,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor,
    quantity,
    setQuantity,
    adding,
    handleOpenCartModal,
    handleCloseCartModal,
    handleAddToCart,
    getImageUrl,
    formatPrice,
    isWishlisted,
    handleToggleWishlist,
    navigate,
  } = useStorePage(PAGE_SLUG);

  if (loading) {
    return (
      <div className="dynamic-page dynamic-page-sports-accessories sports-accessories-page">
        <Navbar />
        <CategoryNav />
        <div className="dynamic-page-loading">
          <div className="dynamic-skeleton-banner"></div>
          <div className="dynamic-skeleton-row"></div>
          <div className="dynamic-skeleton-row"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div className="dynamic-page dynamic-page-sports-accessories sports-accessories-page">
        <Navbar />
        <CategoryNav />
        <div className="dynamic-page-not-found">
          <h1>Sports Accessories Page Not Found</h1>
          <p>This page is currently unavailable or disabled.</p>
          <Link to="/" className="dynamic-home-btn">
            Return to Homepage
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="dynamic-page dynamic-page-sports-accessories sports-accessories-page">
      <Navbar />
      <CategoryNav />

      <main className="dynamic-page-container dynamic-page-container-sports-accessories sports-accessories-container">
        {sections.map((section, idx) => (
          <StoreSection
            key={section._id || idx}
            section={section}
            sectionIndex={idx}
            getImageUrl={getImageUrl}
            formatPrice={formatPrice}
            isWishlisted={isWishlisted}
            handleToggleWishlist={handleToggleWishlist}
            onOpenCartModal={handleOpenCartModal}
            navigate={navigate}
            pageSlug={PAGE_SLUG}
          />
        ))}
      </main>

      {/* PRODUCT SIZE MODAL */}
      {selectedProduct && (
        <ProductSizeModal
          product={selectedProduct}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={handleCloseCartModal}
          onAddToCart={handleAddToCart}
          adding={adding}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
        />
      )}

      <Footer />
    </div>
  );
};

export default SportsAccessories;
