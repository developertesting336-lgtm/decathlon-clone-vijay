import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  MdChevronLeft,
  MdChevronRight,
  MdFavorite,
  MdFavoriteBorder,
} from "react-icons/md";
import "./ProductSection.css";
import "../../../styles/ProductSizeModal.css";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../../api/axios";
import socket from "../../../socket/socket";
import ProductSizeModal from "../../ProductSizeModal";

const ProductSection = ({
  customProducts,
  title,
  subtitle,
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

  // Extract subtitle and title smartly
  const rawTitle = title !== undefined ? title : "Workout Checklist";
  const rawSubtitle = subtitle !== undefined ? subtitle : "";

  let displaySubtitle = rawSubtitle;
  let displayTitle = rawTitle;

  // If subtitle is empty, but title starts with "Shop your" (e.g. "Shop your Workout Checklist")
  if (!displaySubtitle) {
    if (typeof displayTitle === "string" && /^Shop your\s*/i.test(displayTitle)) {
      displaySubtitle = "Shop your";
      displayTitle = displayTitle.replace(/^Shop your\s*/i, "").trim();
    }

    if (
      typeof displayTitle === "string" &&
      /\sShoes Steal Deals$/i.test(displayTitle)
    ) {
      displaySubtitle = displayTitle.replace(/\sShoes Steal Deals$/i, "").trim();
      displayTitle = "Shoes\nSteal Deals";
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

  const isWorkoutChecklist = (product) => {
    if (!product || typeof product !== "object") return false;

    const subcategory =
      product.subcategory ||
      product.subCategory ||
      product.sub_category;

    if (Array.isArray(subcategory)) {
      if (
        subcategory.some((item) =>
          String(item?.name || item?.title || item?.slug || item || "")
            .trim()
            .toLowerCase() === "workout checklist"
        )
      ) {
        return true;
      }
    } else if (subcategory) {
      const subName = String(
        subcategory?.name ||
        subcategory?.title ||
        subcategory?.slug ||
        subcategory ||
        ""
      )
        .trim()
        .toLowerCase();

      if (subName === "workout checklist") {
        return true;
      }
    }

    // Also safely check if populated category object or categories array contains subcategory
    if (product.category && typeof product.category === "object") {
      const catSub =
        product.category.subcategory ||
        product.category.subCategory ||
        product.category.sub_category;
      const catSubName = String(
        catSub?.name || catSub?.title || catSub?.slug || catSub || ""
      )
        .trim()
        .toLowerCase();
      if (catSubName === "workout checklist") {
        return true;
      }
    }

    if (Array.isArray(product.categories)) {
      for (const cat of product.categories) {
        if (cat && typeof cat === "object") {
          const catSub =
            cat.subcategory || cat.subCategory || cat.sub_category;
          const catSubName = String(
            catSub?.name || catSub?.title || catSub?.slug || catSub || ""
          )
            .trim()
            .toLowerCase();
          if (catSubName === "workout checklist") {
            return true;
          }
        }
      }
    }

    return false;
  };

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let fetchedList = [];
      try {
        const prodRes = await api.get(
          "/products?subcategory=Workout Checklist&limit=50"
        );
        fetchedList = prodRes.data?.products || [];
      } catch {
        fetchedList = [];
      }

      if (!fetchedList.length) {
        try {
          const fallbackRes = await api.get("/products?limit=100");
          fetchedList = fallbackRes.data?.products || [];
        } catch {
          fetchedList = [];
        }
      }

      const workoutProducts = fetchedList.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          p.isActive !== false &&
          isWorkoutChecklist(p),
      );

      setProducts(workoutProducts);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Product Section Error:", error);
      setProducts([]);
      setCurrentIndex(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customProducts !== undefined && Array.isArray(customProducts)) {
      const valid = customProducts.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          (p.name || p.title) &&
          p.isActive !== false &&
          isWorkoutChecklist(p),
      );
      setProducts(valid);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [customProducts, fetchProducts]);

  useEffect(() => {
    const handleProductUpdate = (updateData) => {
      const type = typeof updateData === "string" ? updateData : updateData?.type;
      if (type && type.startsWith("product_")) {
        fetchProducts();
      }
    };

    socket.on("product_created", fetchProducts);
    socket.on("product_updated", fetchProducts);
    socket.on("product_deleted", fetchProducts);
    socket.on("homepage_updated", handleProductUpdate);

    return () => {
      socket.off("product_created", fetchProducts);
      socket.off("product_updated", fetchProducts);
      socket.off("product_deleted", fetchProducts);
      socket.off("homepage_updated", handleProductUpdate);
    };
  }, [fetchProducts]);

  // TOUCH SWIPE FOR MOBILE
  const [touchStartX, setTouchStartX] = useState(null);
  const [touchEndX, setTouchEndX] = useState(null);

  useEffect(() => {
    const updateVisibleProducts = () => {
      const width = window.innerWidth;
      if (width <= 480) {
        setVisibleProducts(2);
      } else if (width <= 768) {
        setVisibleProducts(3);
      } else if (width <= 992) {
        setVisibleProducts(4);
      } else {
        // Desktop & laptops: Exactly 5 cards visible
        setVisibleProducts(5);
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

  const handleTouchStart = (e) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > 40;
    const isRightSwipe = distance < -40;
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
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

  return (
    <>
      <section className="product-section">
        <div className="product-section__sidebar product-section-left">
          <div className="product-section__header-text">
            {displaySubtitle && (
              <div className="product-section__subtitle">
                {displaySubtitle}
              </div>
            )}
            <h2 className="product-section__title">
              {displayTitle}
            </h2>
          </div>

          <div className="product-section__navigation product-section-arrows">
            <button
              type="button"
              className="product-section__nav-btn product-arrow"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous product"
            >
              <MdChevronLeft size={20} />
            </button>

            <button
              type="button"
              className="product-section__nav-btn product-arrow"
              onClick={handleNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next product"
            >
              <MdChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          className="product-section__viewport product-viewport"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
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
                      <div className="product-section__brand-row">
                        <span className="product-section__brand">
                          {brand && brand.toLowerCase() !== "decathlon" ? brand : "QUECHUA"}
                        </span>
                        {product.gender && (
                          <span className="product-section__gender">{product.gender}</span>
                        )}
                      </div>

                      <Link
                        to={`/product/${product._id}`}
                        className="product-section__name-link product-name"
                        title={`${brand} ${name}`}
                      >
                        {name}
                      </Link>

                      <div className="product-section__rating product-rating">
                        <span className="product-section__stars rating-stars">
                          {getRatingStars(product.review || product.rating || 4.5)}
                        </span>
                        <span className="product-section__review-count review-count">
                          {reviewCount || `${(product.review || 4.5).toFixed(1)}k`}
                        </span>
                      </div>

                      <div className="product-section__pricing product-price">
                        <span className="product-section__current-price current-price">
                          {formatPrice(currentPrice)}
                        </span>
                        {mrp ? (
                          <span className="product-section__mrp mrp">
                            MRP {formatPrice(mrp)}
                          </span>
                        ) : (
                          <span className="product-section__mrp mrp mrp-placeholder">
                            MRP {formatPrice(Math.round(currentPrice * 1.35))}
                          </span>
                        )}
                      </div>

                      {product.offer && (
                        <div className="product-section__offer-wrapper product-offer-wrapper">
                          <span className="product-section__offer-badge product-offer">
                            {product.offer}
                          </span>
                        </div>
                      )}

                      <div className="product-section__actions product-actions">
                        <button
                          type="button"
                          className={`product-section__wishlist-btn wishlist-button ${
                            isWishlisted(product._id) ? "active" : ""
                          }`}
                          aria-label="Add to wishlist"
                          onClick={() => handleToggle(product._id)}
                        >
                          {isWishlisted(product._id) ? (
                            <MdFavorite size={16} />
                          ) : (
                            <MdFavoriteBorder size={16} />
                          )}
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
