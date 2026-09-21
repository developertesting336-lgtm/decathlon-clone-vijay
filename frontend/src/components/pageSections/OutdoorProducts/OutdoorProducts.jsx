import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./OutdoorProducts.css";
import "../../../styles/ProductSizeModal.css";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../../api/axios";
import socket from "../../../socket/socket";
import ProductSizeModal from "../../ProductSizeModal";

const OutdoorProducts = ({ section, data, style, customProducts, title, subtitle }) => {
  const { isWishlisted, handleToggle } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const sliderRef = useRef(null);

  // PRODUCT MODAL STATES
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const sectionData = data || section?.data || {};
  const displaySubtitle = subtitle || sectionData.subtitle || "Explore best of";
  const displayTitle = title || sectionData.title || "Outdoor\nShoes &\nSneakers.";

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

      const found = pageSections.find(
        (item) =>
          item.type === "outdoor-products" ||
          item.name === "Outdoor Products" ||
          item.name === "OutdoorProducts" ||
          (item.name && item.name.toLowerCase().includes("outdoor"))
      );

      const rawProds = found?.data?.products || found?.products || [];
      const validProds = rawProds.filter(
        (p) => p && typeof p === "object" && p.name
      );

      if (validProds.length > 0) {
        setProducts(validProds);
      } else {
        const prodRes = await api.get("/products?limit=12");
        setProducts(prodRes.data.products || []);
      }
    } catch (error) {
      console.error("Outdoor Products Error:", error);
      try {
        const prodRes = await api.get("/products?limit=12");
        setProducts(prodRes.data.products || []);
      } catch {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawProds =
      customProducts ||
      sectionData.products ||
      section?.products;

    if (rawProds && Array.isArray(rawProds) && rawProds.length > 0) {
      const valid = rawProds.filter((p) => p && typeof p === "object" && (p.name || p.title));
      if (valid.length > 0) {
        setProducts(valid);
        setLoading(false);
        return;
      }
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

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollability = useCallback(() => {
    if (!sliderRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = sliderRef.current;
    setCanScrollLeft(scrollLeft > 5);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
  }, []);

  useEffect(() => {
    checkScrollability();
    const slider = sliderRef.current;
    if (slider) {
      slider.addEventListener("scroll", checkScrollability, { passive: true });
      window.addEventListener("resize", checkScrollability);
      return () => {
        slider.removeEventListener("scroll", checkScrollability);
        window.removeEventListener("resize", checkScrollability);
      };
    }
  }, [products, checkScrollability]);

  const scrollLeft = () => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.querySelector(".outdoor-product-card");
    if (!card) return;
    const cardWidth = card.offsetWidth;
    const styles = window.getComputedStyle(sliderRef.current);
    const gap = parseFloat(styles.columnGap || styles.gap) || 12;
    sliderRef.current.scrollBy({
      left: -(cardWidth + gap),
      behavior: "smooth",
    });
  };

  const scrollRight = () => {
    if (!sliderRef.current) return;
    const card = sliderRef.current.querySelector(".outdoor-product-card");
    if (!card) return;
    const cardWidth = card.offsetWidth;
    const styles = window.getComputedStyle(sliderRef.current);
    const gap = parseFloat(styles.columnGap || styles.gap) || 12;
    sliderRef.current.scrollBy({
      left: cardWidth + gap,
      behavior: "smooth",
    });
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

  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <>
      <section className={`outdoor-products-section ${variantClass}`}>
        <div className="outdoor-products-container">
          <div className="outdoor-products-intro">
            <div className="outdoor-products-intro-text">
              <Link to="/shoes" style={{ textDecoration: "none", color: "inherit" }}>
                {displaySubtitle && <p>{displaySubtitle}</p>}
                <h2>
                  {displayTitle.includes("\n") ? (
                    displayTitle.split("\n").map((line, i) => (
                      <React.Fragment key={i}>
                        {line}
                        {i < displayTitle.split("\n").length - 1 && <br />}
                      </React.Fragment>
                    ))
                  ) : (
                    displayTitle
                  )}
                </h2>
              </Link>
            </div>

            <div className="outdoor-slider-buttons">
              <button
                type="button"
                className="outdoor-arrow"
                onClick={scrollLeft}
                disabled={!canScrollLeft}
                aria-label="Previous product"
              >
                ‹
              </button>

              <button
                type="button"
                className="outdoor-arrow"
                onClick={scrollRight}
                disabled={!canScrollRight}
                aria-label="Next product"
              >
                ›
              </button>
            </div>
          </div>

          <div className="outdoor-products-slider" ref={sliderRef}>
            {products.map((product) => (
              <div className="outdoor-product-card" key={product._id}>
                <div className="outdoor-product-image-wrapper">
                  {product.badge && (
                    <span className="outdoor-product-badge">
                      {product.badge}
                    </span>
                  )}

                  <Link
                    to={`/product/${product._id}`}
                    style={{ textDecoration: "none", color: "inherit", display: "block" }}
                  >
                    {product.images?.[0] ? (
                      <img
                        src={getImageUrl(product.images[0])}
                        alt={product.name || "Product"}
                        className="outdoor-product-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="outdoor-product-no-image">No Image</div>
                    )}
                  </Link>
                </div>

                <div className="outdoor-product-details">
                  <Link
                    to={`/product/${product._id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <p className="outdoor-product-name">
                      <strong>{product.brand || ""}</strong> {product.name}
                    </p>
                  </Link>

                  <div className="outdoor-rating">
                    <span className="stars">★★★★★</span>
                    <span className="review-count">
                      {product.reviews || ""}
                    </span>
                  </div>

                  <div className="outdoor-price">
                    <span>
                      ₹
                      {Number(
                        product.discountPrice || product.price || 0
                      ).toLocaleString("en-IN")}
                    </span>

                    {product.discount && (
                      <span className="outdoor-discount">
                        {product.discount}
                      </span>
                    )}
                  </div>

                  <div className="outdoor-mrp">
                    {product.price
                      ? `MRP ₹${Number(product.price).toLocaleString("en-IN")}`
                      : "MRP"}
                  </div>

                  <div className="outdoor-product-actions">
                    <button
                      type="button"
                      className={`outdoor-wishlist ${
                        isWishlisted(product._id) ? "active" : ""
                      }`}
                      aria-label="Add to wishlist"
                      onClick={() => handleToggle(product._id)}
                    >
                      {isWishlisted(product._id) ? "♥" : "♡"}
                    </button>

                    <button
                      type="button"
                      className="outdoor-cart"
                      onClick={() => handleOpenModal(product)}
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

export default OutdoorProducts;
