import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import {
  MdChevronLeft,
  MdChevronRight,
  MdFavorite,
  MdFavoriteBorder,
} from "react-icons/md";

/* =========================================================
   BANNER SECTION
========================================================= */
// eslint-disable-next-line no-unused-vars
const BannerSection = ({ section, getImageUrl, navigate, pageSlug }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const rawBanners =
    section?.banners || section?.items || section?.content || [];

  const bannersList =
    Array.isArray(rawBanners) && rawBanners.length > 0
      ? rawBanners.map((banner) => ({
          image: getImageUrl(
            banner.image?.url || banner.image || banner.imageUrl || "",
          ),
          link: banner.link || banner.route || "#",
        }))
      : [];

  useEffect(() => {
    if (bannersList.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % bannersList.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [bannersList.length]);

  if (!bannersList.length) return null;

  const currentBanner = bannersList[currentIndex] || bannersList[0];

  const handlePrev = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? bannersList.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % bannersList.length);
  };

  const handleClick = () => {
    if (currentBanner.link && currentBanner.link !== "#") {
      navigate(currentBanner.link);
    }
  };

  return (
    <section
      className={`dynamic-banner-section ${
        pageSlug ? `${pageSlug}-banner-section` : ""
      }`}
    >
      <div
        className={`dynamic-banner ${
          currentBanner.link && currentBanner.link !== "#"
            ? "clickable-banner"
            : ""
        }`}
        onClick={handleClick}
      >
        {currentBanner.image ? (
          <img
            key={currentIndex}
            src={currentBanner.image}
            alt="Page Banner"
            className="dynamic-banner-img"
          />
        ) : (
          <div className="dynamic-banner-placeholder">
            No banner image available
          </div>
        )}

        {bannersList.length > 1 && (
          <>
            <button
              type="button"
              className="dynamic-banner-arrow prev"
              onClick={handlePrev}
              aria-label="Previous Banner"
            >
              <MdChevronLeft />
            </button>
            <button
              type="button"
              className="dynamic-banner-arrow next"
              onClick={handleNext}
              aria-label="Next Banner"
            >
              <MdChevronRight />
            </button>
            <div className="dynamic-banner-dots">
              {bannersList.map((_, idx) => (
                <span
                  key={idx}
                  className={idx === currentIndex ? "active" : ""}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(idx);
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

/* =========================================================
   CATEGORY SECTION
========================================================= */
// eslint-disable-next-line no-unused-vars
const CategorySection = ({
  section,
  sectionIndex,
  getImageUrl,
  navigate,
  pageSlug,
}) => {
  let categories = [];

  if (
    Array.isArray(section.categoryItems) &&
    section.categoryItems.length > 0
  ) {
    categories = section.categoryItems
      .filter((ci) => ci && (ci.category || ci.customImage))
      .map((ci) => {
        const cat =
          typeof ci.category === "object"
            ? ci.category
            : { _id: ci.category, name: "Category" };
        const displayImage = ci.customImage || cat.image || "";
        const slug = cat.slug || "";
        let name = cat.name || "Category";
        if (
          pageSlug === "bags-backpacks" &&
          name.toLowerCase() === "backpacks"
        ) {
          name = "Duffle Bags";
        }
        const link = slug
          ? `/category/${slug}`
          : `/category/${encodeURIComponent(name.toLowerCase())}`;

        return {
          id: cat._id || `cat-${name}`,
          name,
          image: getImageUrl(displayImage),
          link,
        };
      });
  } else if (
    Array.isArray(section.categories) &&
    section.categories.length > 0
  ) {
    categories = section.categories
      .filter((c) => c && typeof c === "object" && c.name)
      .map((cat) => {
        const slug = cat.slug || "";
        let name = cat.name || "Category";
        if (
          pageSlug === "bags-backpacks" &&
          name.toLowerCase() === "backpacks"
        ) {
          name = "Duffle Bags";
        }
        const link = slug
          ? `/category/${slug}`
          : `/category/${encodeURIComponent(name.toLowerCase())}`;

        return {
          id: cat._id,
          name,
          image: getImageUrl(cat.image || ""),
          link,
        };
      });
  } else if (Array.isArray(section.items) && section.items.length > 0) {
    categories = section.items.map((item, idx) => ({
      id: item._id || `item-${idx}`,
      name: item.name || item.title || "Category",
      image: getImageUrl(item.image || ""),
      link: item.link || "#",
    }));
  }

  if (!categories.length) return null;

  const handleCategoryClick = (cat) => {
    if (!cat.link || cat.link === "#") return;
    navigate(cat.link, {
      state: { categoryId: cat.id, categoryName: cat.name },
    });
  };

  const title = section?.name || section?.title || "";
  const sectionNameClass = (title || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-");
  const sectionIndexClass =
    typeof sectionIndex === "number" ? `section-index-${sectionIndex + 1}` : "";

  return (
    <section
      className={`dynamic-category-section ${
        pageSlug ? `${pageSlug}-category-section` : ""
      } ${
        pageSlug && typeof sectionIndex === "number"
          ? `${pageSlug}-category-section-${sectionIndex + 1}`
          : ""
      } ${sectionNameClass ? `section-${sectionNameClass}` : ""} ${sectionIndexClass}`}
      data-section-index={sectionIndex}
    >
      {title && (
        <h2 className="dynamic-category-title dynamic-section-heading">
          {title}
        </h2>
      )}
      <div className="dynamic-category-scroll">
        {categories.map((cat, idx) => (
          <div
            key={cat.id || idx}
            className="dynamic-category-item"
            onClick={() => handleCategoryClick(cat)}
          >
            <div className="dynamic-category-circle">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} loading="lazy" />
              ) : (
                <div className="dynamic-category-placeholder">{cat.name}</div>
              )}
            </div>
            <p className="dynamic-category-name">{cat.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

/* =========================================================
   OTHER SECTION
========================================================= */
// eslint-disable-next-line no-unused-vars
const OtherSection = ({ section, getImageUrl, navigate, pageSlug }) => {
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const rawItems = section.items || section.categories || [];
  const items = Array.isArray(rawItems)
    ? rawItems.filter((item) => item && (item.name || item.image))
    : [];

  const checkScroll = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const handleResize = () => checkScroll();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [checkScroll, items.length]);

  if (!items.length) return null;

  const title = section.name || section.title || "";

  const handleScrollLeft = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: -sliderRef.current.clientWidth * 0.75,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  const handleScrollRight = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({
        left: sliderRef.current.clientWidth * 0.75,
        behavior: "smooth",
      });
      setTimeout(checkScroll, 350);
    }
  };

  return (
    <section
      className={`loved-categories other-section dynamic-other-section ${
        pageSlug ? `${pageSlug}-other-section` : ""
      }`}
    >
      <div className="loved-categories-container other-section-container dynamic-other-container">
        {title && (
          <h2 className="loved-categories-title other-section-title dynamic-other-title">
            {title}
          </h2>
        )}

        <div className="dynamic-other-slider-wrapper">
          {items.length > 4 && (canScrollLeft || canScrollRight) && (
            <>
              <button
                type="button"
                className={`dynamic-other-arrow prev ${!canScrollLeft ? "disabled" : ""}`}
                onClick={handleScrollLeft}
                disabled={!canScrollLeft}
                aria-label="Previous items"
              >
                <MdChevronLeft />
              </button>
              <button
                type="button"
                className={`dynamic-other-arrow next ${!canScrollRight ? "disabled" : ""}`}
                onClick={handleScrollRight}
                disabled={!canScrollRight}
                aria-label="Next items"
              >
                <MdChevronRight />
              </button>
            </>
          )}

          <div
            className="loved-categories-grid other-section-grid dynamic-other-grid"
            ref={sliderRef}
            onScroll={checkScroll}
          >
            {items.map((item, idx) => {
              const isWide =
                (items.length === 6 && idx >= 4) ||
                items.length === 2 ||
                item.isWide ||
                item.wide;
              const imageUrl = getImageUrl(item.image);
              const itemName = item.name || item.title || "";

              return (
                <div
                  key={item._id || idx}
                  className={`loved-category-card other-section-card dynamic-other-card ${
                    isWide ? "card-wide" : "card-standard"
                  } ${item.link && item.link !== "#" ? "clickable" : ""}`}
                  onClick={() => {
                    if (item.link && item.link !== "#") {
                      navigate(item.link);
                    }
                  }}
                  style={{
                    cursor:
                      item.link && item.link !== "#" ? "pointer" : "default",
                  }}
                >
                  <div className="dynamic-other-media">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={itemName || "Item"}
                        className="loved-category-image other-section-image dynamic-other-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="loved-category-no-image other-section-no-image dynamic-other-no-image">
                        {itemName || "No Image"}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   PRODUCT SECTION
========================================================= */
// eslint-disable-next-line no-unused-vars
const ProductSection = ({
  section,
  getImageUrl,
  formatPrice,
  isWishlisted,
  handleToggleWishlist,
  onOpenCartModal,
  pageSlug,
}) => {
  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const products = useMemo(() => {
    const rawProducts = section?.products || section?.items || [];
    return Array.isArray(rawProducts)
      ? rawProducts.filter(
          (p) => p && typeof p === "object" && (p.name || p.title),
        )
      : [];
  }, [section?.products, section?.items]);

  const rawTitle = section?.name || section?.title || "";

  const parseSectionTitle = (title) => {
    if (!title) return { sub: "", main: "Products" };
    if (title.includes("Shoes Steal Deals")) {
      return {
        sub: title.replace("Shoes Steal Deals", "").trim(),
        main: "Shoes Steal Deals",
      };
    }
    if (title.includes("Fresh Combos just dropped!")) {
      return {
        sub: title
          .replace("Fresh Combos just dropped!", "")
          .replace(/[-–—]/g, "")
          .trim(),
        main: "Fresh Combos just dropped!",
      };
    }
    if (title.includes(" - ")) {
      const parts = title.split(" - ");
      return { sub: parts[0].trim(), main: parts.slice(1).join(" - ").trim() };
    }
    return { sub: "", main: title };
  };

  const { sub: subTitle, main: mainTitle } = parseSectionTitle(rawTitle);

  const updateScrollButtons = useCallback(() => {
    const el = sliderRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = sliderRef.current;
    if (!el) return;

    updateScrollButtons();
    const timeout = setTimeout(updateScrollButtons, 150);

    el.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    return () => {
      clearTimeout(timeout);
      el.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [products, updateScrollButtons]);

  const handleScroll = (direction) => {
    const el = sliderRef.current;
    if (!el) return;
    const card =
      el.querySelector(".activewear-product-card") ||
      el.querySelector(".dynamic-product-card");
    const cardWidth = card ? card.offsetWidth : 215;
    const gap = 14;
    const scrollAmount = (cardWidth + gap) * 2;

    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!products.length) return null;

  return (
    <section
      className={`dynamic-product-section ${
        pageSlug ? `${pageSlug}-product-section` : ""
      }`}
    >
      <div
        className={`dynamic-product-left dynamic-product-header ${
          pageSlug ? `${pageSlug}-product-left` : ""
        }`}
      >
        <div className="dynamic-product-title-group">
          {subTitle && (
            <span className="dynamic-product-title-sub">{subTitle}</span>
          )}
          <h2 className="dynamic-product-section-title dynamic-product-title-main">
            {mainTitle === "Fresh Combos just dropped!" ? (
              <>
                <span className="dynamic-product-title-lead">Fresh Combos</span>
                <span className="dynamic-product-title-tail">
                  just dropped!
                </span>
              </>
            ) : (
              mainTitle
            )}
          </h2>
        </div>

        <div className="dynamic-arrow-group">
          <button
            type="button"
            className="dynamic-arrow-btn prev"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Previous products"
          >
            <MdChevronLeft />
          </button>
          <button
            type="button"
            className="dynamic-arrow-btn next"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Next products"
          >
            <MdChevronRight />
          </button>
        </div>
      </div>

      <div className="dynamic-product-slider-wrapper">
        <div className="dynamic-product-slider" ref={sliderRef}>
          {products.map((product) => {
            const id = product._id || product.id;
            const name = product.name || product.title || "Product";
            const brand =
              product.brand ||
              product.brandName ||
              (name.includes(" ") ? name.split(" ")[0] : "");
            const nameWithoutBrand =
              brand &&
              name.toUpperCase().startsWith(brand.toUpperCase() + " ") &&
              !name.toLowerCase().startsWith("rockrider expl")
                ? name.slice(brand.length + 1).trim()
                : name;

            const price = product.price || 0;
            const mrp =
              product.originalPrice ||
              product.mrp ||
              (product.discountPrice ? product.price : 0);
            const displayPrice = product.discountPrice || price;
            const displayMrp = mrp > displayPrice ? mrp : null;
            const discountPercent =
              product.discountPercent ||
              (displayMrp && displayMrp > displayPrice
                ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
                : 0);

            const image =
              (Array.isArray(product.images) && product.images[0]) ||
              product.image ||
              "";
            const imageUrl = getImageUrl(image);

            const formatReviewCount = (cnt) => {
              if (cnt === undefined || cnt === null || cnt === "") return "270";
              const str = String(cnt).trim();
              if (str.endsWith("k") || str.endsWith("K")) return str;
              const num = Number(str);
              if (isNaN(num)) return str;
              if (num >= 1000) {
                return (num / 1000).toFixed(1).replace(/\.0$/, "") + "k";
              }
              return String(num);
            };

            const reviewCount =
              product.reviewCount ||
              product.numReviews ||
              product.reviewsCount ||
              (product.review ? Math.round(product.review * 80) : 270);

            const ratingVal = Number(product.review || product.rating || 5);
            const numStars = Math.min(5, Math.max(1, Math.round(ratingVal)));
            const starText = "★".repeat(numStars) + "☆".repeat(5 - numStars);

            const productLink = `/product/${id}`;
            const wishlisted = isWishlisted ? isWishlisted(id) : false;

            return (
              <div
                key={id}
                className={`dynamic-product-card ${
                  pageSlug ? `${pageSlug}-product-card` : ""
                }`}
              >
                <div className="dynamic-product-image-box">
                  {(product.onSale || product.badge) && (
                    <span className="dynamic-product-badge">
                      {product.badge || "Sale"}
                    </span>
                  )}
                  <Link to={productLink} className="dynamic-product-img-link">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={name}
                        className="dynamic-product-img"
                        loading="lazy"
                      />
                    ) : (
                      <div className="dynamic-product-img-placeholder">
                        No image
                      </div>
                    )}
                  </Link>
                </div>

                <div className="dynamic-product-info">
                  <Link to={productLink} className="dynamic-product-name">
                    {brand && <strong>{brand} </strong>}
                    {nameWithoutBrand}
                  </Link>

                  <div className="dynamic-product-rating">
                    <span className="dynamic-rating-stars">{starText}</span>
                    <span className="dynamic-review-count">
                      {formatReviewCount(reviewCount)}
                    </span>
                  </div>

                  <div className="dynamic-product-pricing">
                    {displayMrp && displayMrp > displayPrice ? (
                      <>
                        <div className="dynamic-price-row">
                          <span className="dynamic-current-price">
                            {formatPrice(displayPrice)}
                          </span>
                          {(pageSlug === "cycling"
                            ? product.onSale
                            : discountPercent > 0) && (
                            <span className="dynamic-discount-badge">
                              {product.discountPercent || discountPercent}% off
                            </span>
                          )}
                        </div>
                        <div className="dynamic-mrp">
                          MRP{" "}
                          <span className="dynamic-mrp-strike">
                            {formatPrice(displayMrp)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className="dynamic-mrp-only">
                        MRP {formatPrice(displayPrice)}
                      </div>
                    )}
                  </div>

                  <div className="dynamic-card-actions">
                    <button
                      type="button"
                      className={`dynamic-wishlist-btn ${
                        wishlisted ? "active" : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (handleToggleWishlist) handleToggleWishlist(id);
                      }}
                      aria-label="Wishlist"
                    >
                      {wishlisted ? <MdFavorite /> : <MdFavoriteBorder />}
                    </button>
                    <button
                      type="button"
                      className="dynamic-cart-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenCartModal) onOpenCartModal(product);
                      }}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   STORE SECTION RENDERER (MASTER EXPORT)
========================================================= */
export const StoreSection = ({
  section,
  sectionIndex,
  getImageUrl,
  formatPrice,
  isWishlisted,
  handleToggleWishlist,
  onOpenCartModal,
  navigate,
  pageSlug,
}) => {
  if (!section) return null;

  const type = (section.type || section.sectionType || "").toLowerCase();
  const name = (section.name || section.title || "").toLowerCase();

  // Banner Section
  if (
    type === "banner" ||
    name.includes("banner") ||
    (Array.isArray(section.banners) && section.banners.length > 0)
  ) {
    return (
      <BannerSection
        section={section}
        getImageUrl={getImageUrl}
        navigate={navigate}
        pageSlug={pageSlug}
      />
    );
  }

  // Product Section
  if (
    type === "product" ||
    (Array.isArray(section.products) && section.products.length > 0)
  ) {
    return (
      <ProductSection
        section={section}
        getImageUrl={getImageUrl}
        formatPrice={formatPrice}
        isWishlisted={isWishlisted}
        handleToggleWishlist={handleToggleWishlist}
        onOpenCartModal={onOpenCartModal}
        pageSlug={pageSlug}
      />
    );
  }

  // Category Section
  if (
    type === "category" ||
    (Array.isArray(section.categoryItems) &&
      section.categoryItems.length > 0) ||
    (Array.isArray(section.categories) && section.categories.length > 0)
  ) {
    return (
      <CategorySection
        section={section}
        sectionIndex={sectionIndex}
        getImageUrl={getImageUrl}
        navigate={navigate}
        pageSlug={pageSlug}
      />
    );
  }

  // Other / Custom Items Section
  if (
    type === "other" ||
    (Array.isArray(section.items) && section.items.length > 0)
  ) {
    return (
      <OtherSection
        section={section}
        getImageUrl={getImageUrl}
        navigate={navigate}
        pageSlug={pageSlug}
      />
    );
  }

  return null;
};

export default StoreSection;
