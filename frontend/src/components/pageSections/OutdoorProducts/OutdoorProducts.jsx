import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./OutdoorProducts.css";
import "../../../styles/ProductSizeModal.css";
import toast from "react-hot-toast";
import api, { useWishlist } from "../../../api/axios";
import ProductSizeModal from "../../ProductSizeModal";

const OutdoorProducts = () => {
  const { isWishlisted, handleToggle } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const sliderRef = useRef(null);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // IMAGE URL
  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      typeof image === "string" &&
      (image.startsWith("http://") ||
        image.startsWith("https://"))
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

    return `${backendUrl}${
      image.startsWith("/") ? "" : "/"
    }${image}`;
  };

  // FETCH ONLY OUTDOOR PRODUCTS
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          "/products?subcategory=Outdoor Products&limit=50"
        );

        const allProducts = response.data?.products || [];

        const outdoorProducts = allProducts.filter(
          (product) =>
            product?.isActive !== false &&
            String(product?.subcategory || "")
              .trim()
              .toLowerCase() === "outdoor products"
        );

        setProducts(outdoorProducts);
      } catch (error) {
        console.error("Outdoor Products Error:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // SCROLL
  const scroll = (direction) => {
    if (!sliderRef.current) return;

    const card = sliderRef.current.querySelector(
      ".outdoor-product-card"
    );

    if (!card) return;

    const gap = 12;

    sliderRef.current.scrollBy({
      left:
        direction === "left"
          ? -(card.offsetWidth + gap)
          : card.offsetWidth + gap,
      behavior: "smooth",
    });
  };

  // OPEN MODAL
  const handleOpenModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
    setAdding(false);
  };

  // CLOSE MODAL
  const handleCloseModal = () => {
    if (adding) return;

    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
  };

  // ADD TO CART
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

    if (Number(quantity) < 1) {
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

      toast.success(
        response?.data?.message ||
          "Product added to cart"
      );

      window.dispatchEvent(new Event("cartUpdated"));

      handleCloseModal();
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);

      if (error?.response?.status === 401) {
        toast.error("Please login again");
      } else {
        toast.error(
          error?.response?.data?.message ||
            "Failed to add product to cart"
        );
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <>
      <section className="outdoor-products-section">
        <div className="outdoor-products-container">

          {/* LEFT TITLE */}
          <div className="outdoor-products-intro">
            <div className="outdoor-products-intro-text">
              <Link
                to="/shoes"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <p>Explore best of</p>

                <h2>
                  Outdoor
                  <br />
                  Shoes &
                  <br />
                  Sneakers.
                </h2>
              </Link>
            </div>

            <div className="outdoor-slider-buttons">
              <button
                type="button"
                className="outdoor-arrow"
                onClick={() => scroll("left")}
                aria-label="Previous"
              >
                ‹
              </button>

              <button
                type="button"
                className="outdoor-arrow"
                onClick={() => scroll("right")}
                aria-label="Next"
              >
                ›
              </button>
            </div>
          </div>

          {/* PRODUCTS */}
          <div
            className="outdoor-products-slider"
            ref={sliderRef}
          >
            {products.map((product) => (
              <div
                className="outdoor-product-card"
                key={product._id}
              >
                {/* IMAGE */}
                <div className="outdoor-product-image-wrapper">
                  {product.badge && (
                    <span className="outdoor-product-badge">
                      {product.badge}
                    </span>
                  )}

                  <Link
                    to={`/product/${product._id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      display: "block",
                    }}
                  >
                    {product.images?.[0] ? (
                      <img
                        src={getImageUrl(
                          product.images[0]
                        )}
                        alt={product.name || "Product"}
                        className="outdoor-product-image"
                        loading="lazy"
                      />
                    ) : (
                      <div className="outdoor-product-no-image">
                        No Image
                      </div>
                    )}
                  </Link>
                </div>

                {/* DETAILS */}
                <div className="outdoor-product-details">
                  <Link
                    to={`/product/${product._id}`}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <p className="outdoor-product-name">
                      <strong>
                        {product.brand || ""}
                      </strong>{" "}
                      {product.name}
                    </p>
                  </Link>

                  <div className="outdoor-rating">
                    <span className="stars">
                      ★★★★★
                    </span>

                    <span className="review-count">
                      {product.reviews || ""}
                    </span>
                  </div>

                  <div className="outdoor-price">
                    <span>
                      ₹
                      {Number(
                        product.discountPrice ||
                          product.price ||
                          0
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
                      ? `MRP ₹${Number(
                          product.price
                        ).toLocaleString("en-IN")}`
                      : "MRP"}
                  </div>

                  <div className="outdoor-product-actions">
                    <button
                      type="button"
                      className={`outdoor-wishlist ${
                        isWishlisted(product._id)
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        handleToggle(product._id)
                      }
                      aria-label="Wishlist"
                    >
                      {isWishlisted(product._id)
                        ? "♥"
                        : "♡"}
                    </button>

                    <button
                      type="button"
                      className="outdoor-cart"
                      onClick={() =>
                        handleOpenModal(product)
                      }
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

      {/* SIZE MODAL */}
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
          formatPrice={(price) =>
            `₹${Number(price || 0).toLocaleString(
              "en-IN"
            )}`
          }
        />
      )}
    </>
  );
};

export default OutdoorProducts;
