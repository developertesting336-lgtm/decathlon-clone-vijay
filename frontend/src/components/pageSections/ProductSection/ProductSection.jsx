import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./ProductSection.css";
import "../../../styles/ProductSizeModal.css";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../../api/axios";
import socket from "../../../socket/socket";
import ProductSizeModal from "../../ProductSizeModal";

const ProductSection = ({
  section,
  data,
  style,
  customProducts,
  title,
  subtitle,
  pageSlug,
}) => {
  const { isWishlisted, handleToggle } = useWishlist();
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleProducts, setVisibleProducts] = useState(4.3);
  const [loading, setLoading] = useState(true);

  // PRODUCT MODAL STATES
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const sectionData = data || section?.data || {};
  const sectionStyle = style || section?.style || {};

  // Extract subtitle and title smartly
  const rawTitle =
    title !== undefined
      ? title
      : sectionData.title !== undefined && sectionData.title !== ""
      ? sectionData.title
      : section?.name || "Workout Checklist";

  const rawSubtitle =
    subtitle !== undefined
      ? subtitle
      : sectionData.subtitle !== undefined
      ? sectionData.subtitle
      : "";

  let displaySubtitle = rawSubtitle;
  let displayTitle = rawTitle;

  // If subtitle is empty, but title starts with "Shop your" (e.g. "Shop your Workout Checklist")
  if (!displaySubtitle) {
    if (typeof displayTitle === "string" && /^Shop your\s*/i.test(displayTitle)) {
      displaySubtitle = "Shop your";
      displayTitle = displayTitle.replace(/^Shop your\s*/i, "").trim();
    } else {
      displaySubtitle = "Shop your";
    }
  }

  // Format title for clean 2-line display matching reference image if it's "Workout Checklist"
  if (typeof displayTitle === "string" && displayTitle === "Workout Checklist") {
    displayTitle = "Workout\nChecklist";
  }

  const getImageUrl = (image) => {
    if (!image) return "";
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  const getRatingStars = (rating) => {
    const value = rating ? Math.min(5, Math.max(0, Number(rating))) : 5;
    const filledStars = Math.round(value);
    return `${"★".repeat(filledStars)}${"☆".repeat(5 - filledStars)}`;
  };

  const formatReviewCount = (reviews, reviewCount, numReviews) => {
    const val = reviews || reviewCount || numReviews;
    if (val === undefined || val === null || val === "") return "";
    if (typeof val === "string") return val;
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num >= 1000 ? `${(num / 1000).toFixed(1)}k` : `${num}`;
    }
    return "";
  };

  const getBrandAndTitle = (product) => {
    const brand = (product.brand || "DOMYOS").trim();
    let name = (product.name || "").trim();
    if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
      name = name.slice(brand.length).trim();
    }
    return { brand, name };
  };

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const targetSlug = pageSlug || "home";
      const response = await api.get(`/pages/slug/${targetSlug}`);
      const pageSections = response.data?.page?.sections || [];

      const found =
        (section?._id &&
          pageSections.find(
            (item) => String(item._id) === String(section._id),
          )) ||
        pageSections.find(
          (item) =>
            item.type === "product-section" ||
            item.name === "Product Section" ||
            item.name === "ProductSection" ||
            (item.name && item.name.toLowerCase().includes("checklist")) ||
            item.type === "product",
        );

      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map((id) =>
          String(id),
        ),
      );

      const rawProds = found?.data?.products || found?.products || [];
      const validProds = rawProds.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          p.name &&
          p.isActive !== false &&
          !disabledIds.has(String(p._id)),
      );

      if (validProds.length > 0) {
        setProducts(validProds);
      } else {
        const prodRes = await api.get("/products?limit=12");
        setProducts(prodRes.data.products || []);
      }
      setCurrentIndex(0);
    } catch (error) {
      console.error("Product Section Error:", error);
      try {
        const prodRes = await api.get("/products?limit=12");
        setProducts(prodRes.data.products || []);
      } catch {
        setProducts([]);
      }
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }, [pageSlug, section?._id]);

  useEffect(() => {
    const rawProds =
      customProducts ||
      sectionData.products ||
      section?.products ||
      section?.items;

    const disabledIds = new Set(
      (
        sectionData?.disabledItemIds ||
        section?.data?.disabledItemIds ||
        section?.disabledItemIds ||
        []
      ).map((id) => String(id)),
    );

    if (rawProds !== undefined && Array.isArray(rawProds)) {
      const valid = rawProds.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          (p.name || p.title) &&
          p.isActive !== false &&
          !disabledIds.has(String(p._id)),
      );
      setProducts(valid);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [customProducts, sectionData.products, section, fetchSection]);

  useEffect(() => {
    if (customProducts?.length || sectionData.products?.length || section?.products?.length) {
      return;
    }

    const handleHomepageUpdate = (updateData) => {
      const events = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
        "product_created",
        "product_updated",
        "product_deleted",
      ];
      if (events.includes(updateData?.type)) {
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);
    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [customProducts, sectionData.products, section, fetchSection]);

  useEffect(() => {
    const updateVisibleProducts = () => {
      const width = window.innerWidth;
      if (width <= 540) {
        setVisibleProducts(1.6);
      } else if (width <= 768) {
        setVisibleProducts(2.4);
      } else if (width <= 1024) {
        setVisibleProducts(3.3);
      } else {
        // Desktop: ~4.3 visible products (4 full cards + ~35% of the 5th card peeking)
        setVisibleProducts(4.3);
      }
    };

    updateVisibleProducts();
    window.addEventListener("resize", updateVisibleProducts);
    return () => {
      window.removeEventListener("resize", updateVisibleProducts);
    };
  }, []);

  const maxIndex = Math.max(Math.ceil(products.length - visibleProducts), 0);

  useEffect(() => {
    if (currentIndex > maxIndex) {
      setCurrentIndex(maxIndex);
    }
  }, [currentIndex, maxIndex]);

  const handlePrev = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const handleOpenModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
    setAdding(false);
  };

  const handleCloseModal = () => {
    if (adding) return;
    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!selectedProduct) return;
    const token = localStorage.getItem("token");

    if (!token) {
      toast.error("Please login first");
      return;
    }

    const sizes = Array.isArray(selectedProduct.size) ? selectedProduct.size : [];
    if (sizes.length > 0 && !selectedSize) {
      toast.warning("Please select a size");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      toast.warning("Quantity must be at least 1");
      return;
    }

    try {
      setAdding(true);
      const response = await api.post(
        "/cart",
        {
          productId: selectedProduct._id,
          quantity: Number(quantity),
          size: selectedSize || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));

      setSelectedProduct(null);
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      if (error?.response?.status === 401) {
        toast.error("Please login again");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to add product to cart");
    } finally {
      setAdding(false);
    }
  };

  if (loading || !products.length) {
    return null;
  }

  const trackWidth = (products.length / visibleProducts) * 100;
  const cardWidth = 100 / products.length;
  const translateAmount = currentIndex * cardWidth;
  const variantClass = sectionStyle?.variant ? `variant-${sectionStyle.variant}` : "";

  return (
    <>
      <section className={`product-section ${variantClass}`}>
        <div className="product-section__sidebar product-section-left">
          {displaySubtitle && (
            <div className="product-section__subtitle">
              {displaySubtitle}
            </div>
          )}
          <h2 className="product-section__title">
            {displayTitle}
          </h2>

          <div className="product-section__navigation product-section-arrows">
            <button
              type="button"
              className="product-section__nav-btn product-arrow"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous product"
            >
              ‹
            </button>

            <button
              type="button"
              className="product-section__nav-btn product-arrow"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next product"
            >
              ›
            </button>
          </div>
        </div>

        <div className="product-section__viewport product-viewport">
          <div
            className="product-section__track product-list"
            style={{
              width: `${trackWidth}%`,
              transform: `translateX(-${translateAmount}%)`,
            }}
          >
            {products.map((product) => {
              const { brand, name } = getBrandAndTitle(product);
              const hasDiscount =
                product.discountPrice > 0 && product.discountPrice < product.price;
              const currentPrice = hasDiscount
                ? product.discountPrice
                : product.price;
              const mrp = hasDiscount
                ? product.price
                : null;
              const reviewCount = formatReviewCount(
                product.reviews,
                product.reviewCount,
                product.numReviews
              );
              const tag =
                product.tag ||
                product.badge ||
                product.label ||
                (product.isOnlineExclusive ? "Online exclusive" : "");

              return (
                <div
                  className="product-section__card product-card"
                  key={product._id}
                  style={{
                    flex: `0 0 ${cardWidth}%`,
                  }}
                >
                  <div className="product-section__card-inner product-card-content">
                    <Link
                      to={`/product/${product._id}`}
                      className="product-section__image-wrapper product-image-wrapper"
                    >
                      {tag && (
                        <span className="product-section__tag">
                          {tag}
                        </span>
                      )}
                      {product.images?.[0] ? (
                        <img
                          src={getImageUrl(product.images[0])}
                          alt={product.name || "Product"}
                          className="product-section__image product-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="product-section__image-placeholder product-image-placeholder">
                          No Image
                        </div>
                      )}
                    </Link>

                    <div className="product-section__info product-info">
                      <Link
                        to={`/product/${product._id}`}
                        className="product-section__name-link product-name"
                        title={`${brand} ${name}`}
                      >
                        <span className="product-section__brand">{brand}</span>{" "}
                        <span className="product-section__name">{name}</span>
                      </Link>

                      <div className="product-section__rating product-rating">
                        <span className="product-section__stars rating-stars">
                          {getRatingStars(product.review || product.rating)}
                        </span>
                        {reviewCount && (
                          <span className="product-section__review-count review-count">
                            {reviewCount}
                          </span>
                        )}
                      </div>

                      <div className="product-section__pricing product-price">
                        {hasDiscount ? (
                          <>
                            <span className="product-section__current-price current-price">
                              {formatPrice(currentPrice)}
                            </span>
                            <span className="product-section__mrp mrp">
                              MRP {formatPrice(mrp)}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="product-section__current-price current-price">
                              {formatPrice(currentPrice)}
                            </span>
                            <span className="product-section__mrp mrp mrp-placeholder">
                              MRP
                            </span>
                          </>
                        )}
                      </div>

                      <div className="product-section__offer-wrapper product-offer-wrapper">
                        {product.offer ? (
                          <span className="product-section__offer-badge product-offer">
                            {product.offer}
                          </span>
                        ) : null}
                      </div>

                      <div className="product-section__actions product-actions">
                        <button
                          type="button"
                          className={`product-section__wishlist-btn wishlist-button ${
                            isWishlisted(product._id) ? "active" : ""
                          }`}
                          aria-label="Add to wishlist"
                          onClick={() => handleToggle(product._id)}
                        >
                          {isWishlisted(product._id) ? "♥" : "♡"}
                        </button>

                        <button
                          type="button"
                          className="product-section__cart-btn cart-button"
                          onClick={() => handleOpenModal(product)}
                        >
                          Add to cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selectedProduct && (
        <ProductSizeModal
          product={selectedProduct}
          selectedSize={selectedSize}
          setSelectedSize={setSelectedSize}
          selectedColor={selectedColor}
          setSelectedColor={setSelectedColor}
          quantity={quantity}
          setQuantity={setQuantity}
          onClose={handleCloseModal}
          onAddToCart={handleAddToCart}
          adding={adding}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
        />
      )}
    </>
  );
};

export default ProductSection;
