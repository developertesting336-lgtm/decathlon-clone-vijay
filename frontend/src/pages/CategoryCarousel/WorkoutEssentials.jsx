import React, { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api, { useWishlist } from "../../api/axios";
import { FiChevronLeft, FiChevronRight, FiHeart } from "react-icons/fi";
import toast from "react-hot-toast";
import Navbar from "../../components/Navbar";
import CategoryNav from "../../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../../components/pageSections/Footer/Footer";
import ProductSizeModal from "../../components/ProductSizeModal";

import "../../styles/CategoryCarousel/WorkoutEssentials.css";
import "../../styles/ProductSizeModal.css";

const WorkoutEssentials = () => {
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  const [loading, setLoading] = useState(true);
  const [section1Items, setSection1Items] = useState([]);
  const [section2Items, setSection2Items] = useState([]);
  const [section3Items, setSection3Items] = useState([]);
  const [section4Items, setSection4Items] = useState([]);
  const [section5Items, setSection5Items] = useState([]);

  // Iconic Products states
  const [iconicProducts, setIconicProducts] = useState([]);
  const productSliderRef = useRef(null);

  // Modal states for Add to Cart
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const getImageUrl = (image) => {
    if (!image) return "/images/placeholder.jpg";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) {
      return `${backendUrl}${image}`;
    }
    if (image.startsWith("uploads/")) {
      return `${backendUrl}/${image}`;
    }
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  useEffect(() => {
    fetchCategories();
    fetchIconicProducts();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await api.get("/categories");

      const categories = Array.isArray(response.data)
        ? response.data
        : response.data?.categories || response.data?.data || [];

      const normalize = (str) => (str || "").toLowerCase().trim();

      // Section 1: Workout Essentials (8 accessory badges: Yoga mats, Dumbbells, etc.)
      const sec1 = categories
        .filter((c) => normalize(c.subcategory) === "workout essentials")
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Section 2: YOUR FAVORITE SPORT EQUIPMENTS (4 large cards: Treadmill, Bike, Elliptical, Bodybuilding)
      const sec2 = categories
        .filter(
          (c) =>
            normalize(c.subcategory).includes("favorite sport") ||
            normalize(c.subcategory).includes("equipments-workout")
        )
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Section 3: Workout Essentials - 2 (8 apparel items: Men/Women Trousers, Shorts, Tops, Jackets)
      const apparelOrder = [
        "men trousers",
        "men shorts",
        "men t-shirt",
        "men jackets",
        "women leggings",
        "women tops",
        "women jackets",
        "women shorts",
      ];

      const sec3 = categories
        .filter((c) => normalize(c.subcategory) === "workout essentials - 2")
        .sort((a, b) => {
          const idxA = apparelOrder.indexOf(normalize(a.name));
          const idxB = apparelOrder.indexOf(normalize(b.name));
          if (idxA !== -1 && idxB !== -1) return idxA - idxB;
          if (idxA !== -1) return -1;
          if (idxB !== -1) return 1;
          return (a.sortOrder || 0) - (b.sortOrder || 0);
        });

      // Section 4 & 5: Workout Essentials - 3
      // Section 4: Fitness Essentials (Massagers, Supports, Nutrition, Bags)
      const heroBannerNames = ["yoga", "boxing"];

      const sec4 = categories
        .filter(
          (c) =>
            normalize(c.subcategory) === "workout essentials - 3" &&
            !heroBannerNames.includes(normalize(c.name))
        )
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Section 5: Featured Hero Banners (Yoga & Boxing - 2 Large Cards)
      const sec5 = categories
        .filter(
          (c) =>
            normalize(c.subcategory) === "workout essentials - 3" &&
            heroBannerNames.includes(normalize(c.name))
        )
        .sort((a, b) => {
          return normalize(a.name) === "yoga" ? -1 : 1;
        });

      setSection1Items(sec1);
      setSection2Items(sec2);
      setSection3Items(sec3);
      setSection4Items(sec4);
      setSection5Items(sec5);
    } catch (error) {
      console.error("Error fetching categories from API with axios:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchIconicProducts = async () => {
    try {
      const response = await api.get(
        "/products?subcategory=Workout Essentials-Product&limit=50"
      );
      const prods = response.data?.products || [];
      const activeProducts = prods.filter((p) => p.isActive !== false);
      setIconicProducts(activeProducts);
    } catch (error) {
      console.error("Error fetching iconic products with axios:", error);
    }
  };

  const handleCardClick = (category) => {
    if (!category) return;
    const path = `/category/${encodeURIComponent(category.name)}`;

    navigate(path, {
      state: {
        categoryName: category.name,
        categoryId: category._id,
      },
    });
  };

  const scrollProducts = (direction) => {
    if (!productSliderRef.current) return;
    const scrollAmount = 320;
    productSliderRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const getReviewCount = (product) => {
    if (product.reviewCount || product.numReviews) {
      const val = Number(product.reviewCount || product.numReviews);
      return val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`;
    }
    const name = (product.name || "").toLowerCase();
    if (name.includes("punching wall bag")) return "234";
    if (name.includes("handgrip") || name.includes("medium-resistance")) return "2.5k";
    if (name.includes("vibrating") || name.includes("massag")) return "10.8k";
    if (name.includes("weighted vest")) return "784";
    if (name.includes("push-up bar")) return "3.7k";
    if (name.includes("pull up bar")) return "1.2k";
    return "500+";
  };

  // Open modal for size/quantity selection
  const handleOpenProductModal = (product) => {
    const sizes = Array.isArray(product.size) ? product.size : [];
    setSelectedProduct(product);
    setSelectedSize(sizes.length === 1 ? sizes[0] : "");
    setSelectedColor(product.color?.[0] || "");
    setQuantity(1);
    setAdding(false);
  };

  const handleCloseProductModal = () => {
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

    const sizes = Array.isArray(selectedProduct.size)
      ? selectedProduct.size
      : [];

    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    try {
      setAdding(true);
      const response = await api.post(
        "/cart",
        {
          productId: selectedProduct._id,
          quantity: Number(quantity) || 1,
          size: selectedSize || "",
          color: selectedColor || "",
        }
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));
      handleCloseProductModal();
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      toast.error(
        error?.response?.data?.message || "Failed to add product to cart"
      );
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="workout-essentials-page">
      <Navbar />

      <CategoryNav />

      <main className="workout-essentials-container">
        {loading ? (
          <div className="category-loading">Loading Workout Essentials...</div>
        ) : (
          <>
            {/* SECTION 1: Accessories & Small Gear (8 Octagonal Badges) */}
            {section1Items.length > 0 && (
              <section className="workout-section workout-accessories-section">
                <div className="workout-section-content">
                  <div className="workout-accessories-grid">
                    {section1Items.map((item) => (
                      <div
                        key={item._id}
                        className="workout-accessory-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="workout-accessory-badge">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="workout-accessory-img"
                            loading="lazy"
                          />
                        </div>
                        <h3 className="workout-accessory-title">{item.name}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 2: Favorite Sport Equipments (4 Large Cards) */}
            {section2Items.length > 0 && (
              <section className="workout-section workout-equipments-section">
                <div className="workout-section-content">
                  <h2 className="workout-section-heading">
                    YOUR FAVORITE SPORT EQUIPMENTS
                  </h2>
                  <div className="workout-equipments-grid">
                    {section2Items.map((item) => (
                      <div
                        key={item._id}
                        className="workout-equipment-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="workout-equipment-img-wrapper">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="workout-equipment-img"
                            loading="lazy"
                          />
                        </div>
                        <div className="workout-equipment-overlay">
                          <h3 className="workout-equipment-title">
                            {item.name}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 3: Workout Apparel Collection (8 Oval Badges) */}
            {section3Items.length > 0 && (
              <section className="workout-section workout-apparel-section">
                <div className="workout-section-content">
                  <div className="workout-apparel-grid">
                    {section3Items.map((item) => (
                      <div
                        key={item._id}
                        className="workout-apparel-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="workout-apparel-badge">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="workout-apparel-img"
                            loading="lazy"
                          />
                        </div>
                        <h3 className="workout-apparel-title">{item.name}</h3>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 4: Fitness Essentials (4 Large Cards) */}
            {section4Items.length > 0 && (
              <section className="workout-section workout-essentials-sub-section">
                <div className="workout-section-content">
                  <h2 className="workout-section-heading-regular">
                    Fitness Essentials
                  </h2>
                  <div className="workout-essentials-sub-grid">
                    {section4Items.map((item) => (
                      <div
                        key={item._id}
                        className="workout-essential-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="workout-essential-img-wrapper">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="workout-essential-img"
                            loading="lazy"
                          />
                        </div>
                        <div className="workout-essential-overlay">
                          <h3 className="workout-essential-title">
                            {item.name}
                          </h3>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 5: Featured Hero Cards (2 Columns: Yoga & Boxing) */}
            {section5Items.length > 0 && (
              <section className="workout-section workout-featured-section">
                <div className="workout-section-content">
                  <div className="workout-featured-grid">
                    {section5Items.map((item) => (
                      <div
                        key={item._id}
                        className="workout-featured-card"
                        onClick={() => handleCardClick(item)}
                      >
                        <div className="workout-featured-img-wrapper">
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="workout-featured-img"
                            loading="lazy"
                          />
                        </div>
                        <div className="workout-featured-overlay">
                          <h2 className="workout-featured-title">{item.name}</h2>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 6: Iconic Products Slider (Matches Screenshot 2) */}
            {iconicProducts.length > 0 && (
              <section className="workout-section workout-iconic-section">
                <div className="workout-section-content">
                  <div className="iconic-products-header">
                    <h2 className="iconic-products-title">Iconic Products</h2>
                    <div className="iconic-products-controls">
                      <button
                        type="button"
                        className="iconic-arrow-btn"
                        onClick={() => scrollProducts("left")}
                        aria-label="Previous Products"
                      >
                        <FiChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        className="iconic-arrow-btn"
                        onClick={() => scrollProducts("right")}
                        aria-label="Next Products"
                      >
                        <FiChevronRight size={20} />
                      </button>
                    </div>
                  </div>

                  <div
                    className="iconic-products-slider"
                    ref={productSliderRef}
                  >
                    {iconicProducts.map((product) => (
                      <div className="iconic-product-card" key={product._id}>
                        <Link
                          to={`/product/${product._id}`}
                          className="iconic-product-image-link"
                        >
                          <div className="iconic-product-image-wrapper">
                            <img
                              src={getImageUrl(product.images?.[0])}
                              alt={product.name}
                              className="iconic-product-image"
                              loading="lazy"
                            />
                          </div>
                        </Link>

                        <div className="iconic-product-info">
                          <Link
                            to={`/product/${product._id}`}
                            className="iconic-product-title-link"
                          >
                            <p className="iconic-product-title">
                              <span className="iconic-product-brand">
                                {product.brand || "DOMYOS"}
                              </span>{" "}
                              {product.name}
                            </p>
                          </Link>

                          <div className="iconic-product-rating">
                            <span className="iconic-rating-stars">★★★★★</span>
                            <span className="iconic-review-count">
                              {getReviewCount(product)}
                            </span>
                          </div>

                          <div className="iconic-product-pricing">
                            <span className="iconic-selling-price">
                              ₹
                              {Number(
                                product.discountPrice || product.price || 0
                              ).toLocaleString("en-IN")}
                            </span>
                            {product.price &&
                              product.discountPrice &&
                              product.price > product.discountPrice && (
                                <span className="iconic-mrp-price">
                                  MRP ₹
                                  {Number(product.price).toLocaleString("en-IN")}
                                </span>
                              )}
                          </div>

                          <div className="iconic-product-actions">
                            <button
                              type="button"
                              className={`iconic-wishlist-btn ${
                                isWishlisted(product._id) ? "active" : ""
                              }`}
                              onClick={() => handleToggle(product._id)}
                              aria-label="Wishlist"
                            >
                              <FiHeart
                                size={16}
                                fill={
                                  isWishlisted(product._id)
                                    ? "#e53935"
                                    : "none"
                                }
                                color={
                                  isWishlisted(product._id)
                                    ? "#e53935"
                                    : "#444444"
                                }
                              />
                            </button>

                            <button
                              type="button"
                              className="iconic-add-to-cart-btn"
                              onClick={() => handleOpenProductModal(product)}
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Product Size / Add to Cart Modal */}
      <ProductSizeModal
        product={selectedProduct}
        selectedSize={selectedSize}
        setSelectedSize={setSelectedSize}
        selectedColor={selectedColor}
        setSelectedColor={setSelectedColor}
        quantity={quantity}
        setQuantity={setQuantity}
        onClose={handleCloseProductModal}
        onAddToCart={handleAddToCart}
        adding={adding}
        getImageUrl={getImageUrl}
        formatPrice={formatPrice}
      />

      <Footer />
    </div>
  );
};

export default WorkoutEssentials;