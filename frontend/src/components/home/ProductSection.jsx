import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/home/ProductSection.css";
import "../../styles/ProductSizeModal.css";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../api/axios";
import socket from "../../socket/socket";
import ProductSizeModal from "../ProductSizeModal";

const ProductSection = ({ customProducts, title }) => {
  const { isWishlisted, handleToggle } = useWishlist();
  const [products, setProducts] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleProducts, setVisibleProducts] = useState(5);
  const [loading, setLoading] = useState(true);

  // PRODUCT MODAL STATES
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

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

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const section = pageSections.find(
        (item) => item.name === "Product Section" || item.name === "ProductSection" || item.type === "product"
      );

      const validProds = (section?.products || []).filter(
        (p) => p && typeof p === "object" && p.name
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
  }, []);

  useEffect(() => {
    if (customProducts && Array.isArray(customProducts) && customProducts.length > 0) {
      setProducts(customProducts);
      setCurrentIndex(0);
      setLoading(false);
      return;
    }
    fetchSection();
  }, [customProducts, fetchSection]);

  useEffect(() => {
    const handleHomepageUpdate = (data) => {
      const events = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
        "product_created",
        "product_updated",
        "product_deleted",
      ];

      if (events.includes(data?.type)) {
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);

    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [fetchSection]);

  useEffect(() => {
    const updateVisibleProducts = () => {
      const width = window.innerWidth;

      if (width <= 600) {
        setVisibleProducts(2);
      } else if (width <= 900) {
        setVisibleProducts(3);
      } else if (width <= 1100) {
        setVisibleProducts(4);
      } else {
        setVisibleProducts(5);
      }
    };

    updateVisibleProducts();
    window.addEventListener("resize", updateVisibleProducts);

    return () => {
      window.removeEventListener("resize", updateVisibleProducts);
    };
  }, []);

  const maxIndex = Math.max(products.length - visibleProducts, 0);

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

    const sizes = Array.isArray(selectedProduct.size)
      ? selectedProduct.size
      : [];

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
        },
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

      toast.error(
        error?.response?.data?.message || "Failed to add product to cart",
      );
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
        <div className="product-section-left">
          <p>Shop your</p>

          <h2>
            Workout
            <br />
            Checklist
          </h2>

          <div className="product-section-arrows">
            <button
              type="button"
              className="product-arrow"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              aria-label="Previous product"
            >
              ‹
            </button>

            <button
              type="button"
              className="product-arrow"
              onClick={handleNext}
              disabled={currentIndex === maxIndex}
              aria-label="Next product"
            >
              ›
            </button>
          </div>
        </div>

        <div className="product-viewport">
          <div
            className="product-list"
            style={{
              width: `${trackWidth}%`,
              transform: `translateX(-${translateAmount}%)`,
            }}
          >
            {products.map((product) => (
              <div
                className="product-card"
                key={product._id}
                style={{
                  flex: `0 0 ${cardWidth}%`,
                }}
              >
                <div className="product-card-content">
                  <Link
                    to={`/product/${product._id}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                    className="product-image-wrapper"
                  >
                    {product.images?.[0] ? (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name || "Product"}
                        className="product-image"
                      />
                    ) : (
                      <div className="product-image-placeholder">No Image</div>
                    )}
                  </Link>

                  <div className="product-info">
                    <Link
                      to={`/product/${product._id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                      className="product-name"
                    >
                      <strong>{product.brand || ""}</strong> {product.name}
                    </Link>

                    <div className="product-rating">
                      <span className="rating-stars">★★★★★</span>

                      <span className="review-count">
                        {product.reviews || ""}
                      </span>
                    </div>

                    <div className="product-price">
                      <span className="current-price">
                        {formatPrice(product.discountPrice || product.price)}
                      </span>

                      <span
                        className={`mrp ${
                          !product.price ? "mrp-placeholder" : ""
                        }`}
                      >
                        {product.price
                          ? `MRP ${formatPrice(product.price)}`
                          : "MRP"}
                      </span>
                    </div>

                    <div className="product-offer-wrapper">
                      {product.offer && (
                        <div className="product-offer">{product.offer}</div>
                      )}
                    </div>

                    <div className="product-actions">
                      <button
                        type="button"
                        className={`wishlist-button ${
                          isWishlisted(product._id) ? "active" : ""
                        }`}
                        aria-label="Add to wishlist"
                        onClick={() => handleToggle(product._id)}
                      >
                        {isWishlisted(product._id) ? "♥" : "♡"}
                      </button>

                      <button
                        type="button"
                        className="cart-button"
                        onClick={() => handleOpenModal(product)}
                      >
                        Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
