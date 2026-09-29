import React, { useCallback, useEffect, useState, useRef } from "react";
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
  subcategory,
}) => {
  const { isWishlisted, handleToggle } = useWishlist();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // PRODUCT MODAL STATES
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const targetSubcategory = subcategory || "Workout Checklist";

  // Extract subtitle and title smartly
  const rawTitle = title !== undefined ? title : targetSubcategory;
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

  const matchesSubcategory = useCallback((product, targetSub) => {
    if (!product || typeof product !== "object") return false;

    const norm = (str) =>
      String(str || "")
        .toLowerCase()
        .replace(/['’]/g, "'")
        .trim();
    const target = norm(targetSub);

    const checkValue = (val) => {
      if (!val) return false;
      if (Array.isArray(val)) {
        return val.some(
          (item) => norm(item?.name || item?.title || item) === target
        );
      }
      return norm(val?.name || val?.title || val) === target;
    };

    if (
      checkValue(
        product.subcategory || product.subCategory || product.sub_category
      )
    ) {
      return true;
    }

    if (product.category && typeof product.category === "object") {
      if (
        checkValue(
          product.category.subcategory ||
            product.category.subCategory ||
            product.category.sub_category
        )
      ) {
        return true;
      }
    }

    if (Array.isArray(product.categories)) {
      for (const cat of product.categories) {
        if (cat && typeof cat === "object") {
          if (
            checkValue(
              cat.subcategory || cat.subCategory || cat.sub_category
            )
          ) {
            return true;
          }
        }
      }
    }

    return false;
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      let fetchedList = [];
      try {
        const prodRes = await api.get(
          `/products?subcategory=${encodeURIComponent(targetSubcategory)}&limit=50`
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

      const filteredProducts = fetchedList.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          p.isActive !== false &&
          matchesSubcategory(p, targetSubcategory),
      );

      setProducts(filteredProducts);
    } catch (error) {
      console.error("Product Section Error:", error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [targetSubcategory, matchesSubcategory]);

  useEffect(() => {
    if (customProducts !== undefined && Array.isArray(customProducts)) {
      const valid = customProducts.filter(
        (p) =>
          p &&
          typeof p === "object" &&
          (p.name || p.title) &&
          p.isActive !== false &&
          matchesSubcategory(p, targetSubcategory),
      );
      setProducts(valid);
      setLoading(false);
      return;
    }

    fetchProducts();
  }, [customProducts, fetchProducts, targetSubcategory, matchesSubcategory]);

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

  const sliderRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = sliderRef.current;
    if (el) {
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [products, checkScroll]);

  const handlePrev = () => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.querySelector(".product-section__card");
    const amount = card ? card.offsetWidth + 12 : 260;
    sliderRef.current.scrollBy({ left: -amount, behavior: "smooth" });
  };

  const handleNext = () => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.querySelector(".product-section__card");
    const amount = card ? card.offsetWidth + 12 : 260;
    sliderRef.current.scrollBy({ left: amount, behavior: "smooth" });
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
              disabled={!canScrollLeft}
              aria-label="Previous product"
            >
              <MdChevronLeft size={20} />
            </button>

            <button
              type="button"
              className="product-section__nav-btn product-arrow"
              onClick={handleNext}
              disabled={!canScrollRight}
              aria-label="Next product"
            >
              <MdChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          className="product-section__viewport product-viewport"
          ref={sliderRef}
        >
          <div className="product-section__track product-list">
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
