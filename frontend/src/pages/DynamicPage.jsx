import React from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../components/pageSections/Footer/Footer";
import ProductSizeModal from "../components/ProductSizeModal";
import SectionRenderer from "../components/pageSections/SectionRenderer";
import useStorePage from "../hooks/useStorePage";

// Dedicated CSS files per page
import "../styles/home/Home.css";
import "../styles/pages/home.css";
import "../styles/pages/monsoon-essentials.css";
import "../styles/pages/activewear.css";
import "../styles/pages/workout-essentials.css";
import "../styles/pages/cycling.css";
import "../styles/pages/hiking-trekking.css";
import "../styles/pages/shoes.css";
import "../styles/pages/bags-backpacks.css";
import "../styles/pages/sports-accessories.css";

const DynamicPage = ({ slug: propSlug }) => {
  const params = useParams();
  const routeSlug = propSlug || params.slug || "home";
  const slug = routeSlug.toLowerCase().trim();
  const isHome = slug === "home" || slug === "index" || slug === "";

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
  } = useStorePage(slug);

  // LOADING STATE
  if (loading && sections.length === 0) {
    if (isHome) {
      return (
        <main className="home-page">
          <div className="home-container">
            <div className="home-skeleton-wrapper">
              <div className="home-skeleton-banner"></div>
              <div className="home-skeleton-row">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="home-skeleton-card"></div>
                ))}
              </div>
              <div className="home-skeleton-banner"></div>
            </div>
          </div>
          <Footer />
        </main>
      );
    }

    return (
      <div className={`dynamic-page dynamic-page-${slug} ${slug}-page`}>
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

  // NOT FOUND STATE
  if (notFound || (!loading && !page)) {
    return (
      <div className={`dynamic-page dynamic-page-${slug} ${slug}-page`}>
        <Navbar />
        <CategoryNav />
        <div className="dynamic-page-not-found">
          <h1>Page Not Found</h1>
          <p>The requested page &quot;{slug}&quot; is currently unavailable or disabled.</p>
          <Link to="/" className="dynamic-home-btn">
            Return to Homepage
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // HOME PAGE RENDER (exact same layout & container classes)
  if (isHome) {
    return (
      <main className="home-page">
        <div className="home-container">
          {sections.map((section, idx) => (
            <SectionRenderer
              key={section._id || section.id || idx}
              section={section}
              sectionIndex={idx}
              pageSlug="home"
            />
          ))}
        </div>
        <Footer />
      </main>
    );
  }

  // DEDICATED STORE PAGE RENDER (exact same layout & container classes)
  return (
    <div className={`dynamic-page dynamic-page-${slug} ${slug}-page`}>
      <Navbar />
      <CategoryNav />

      <main className={`dynamic-page-container dynamic-page-container-${slug} ${slug}-container`}>
        {sections.map((section, idx) => (
          <SectionRenderer
            key={section._id || section.id || idx}
            section={section}
            sectionIndex={idx}
            pageSlug={slug}
            getImageUrl={getImageUrl}
            formatPrice={formatPrice}
            isWishlisted={isWishlisted}
            handleToggleWishlist={handleToggleWishlist}
            onOpenCartModal={handleOpenCartModal}
            navigate={navigate}
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
          adding={adding}
          onClose={handleCloseCartModal}
          onAddToCart={handleAddToCart}
          formatPrice={formatPrice}
          getImageUrl={getImageUrl}
        />
      )}

      <Footer />
    </div>
  );
};

export default DynamicPage;
