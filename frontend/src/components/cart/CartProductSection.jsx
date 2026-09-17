import React, { useEffect, useState } from "react";
import { FiChevronLeft, FiChevronRight, FiHeart } from "react-icons/fi";
import { toast } from "react-toastify";

import "../../styles/cart/CartProductSection.css";
import ProductSizeModal from "../ProductSizeModal";
import { useWishlist } from "../../api/axios";

const CartProductSection = ({
  section,
  onAddToCart,
  getImageUrl,
  formatPrice,
}) => {
  const { isWishlisted, handleToggle } = useWishlist();
  const products = section?.products || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const convertToArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (value === undefined || value === null || value === "") {
      return [];
    }

    if (typeof value === "string") {
      const trimmedValue = value.trim();

      if (!trimmedValue) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmedValue);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }

        if (typeof parsed === "string" && parsed.trim()) {
          return [parsed.trim()];
        }
      } catch {
        if (trimmedValue.includes(",")) {
          return trimmedValue
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }

        return [trimmedValue];
      }
    }

    return [];
  };

  useEffect(() => {
    setCurrentIndex(0);
  }, [section?._id]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNext = () => {
    const maxIndex = Math.max(products.length - 5, 0);

    setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  };

  const handleAddClick = (product) => {
    const colors = convertToArray(product?.color);

    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor(colors.length ? colors[0] : "");
    setQuantity(1);
    setAdding(false);
  };

  const closeModal = () => {
    if (adding) return;

    setSelectedProduct(null);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
  };

  const handleConfirmAdd = async () => {
    if (!selectedProduct) return;

    const sizes = convertToArray(selectedProduct?.size);

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

      await onAddToCart(selectedProduct, selectedSize, quantity);

      toast.success("Product added to cart");

      setSelectedProduct(null);
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    } catch (error) {
      console.error("Add To Cart Error:", error);

      toast.error(
        error?.response?.data?.message || "Failed to add product to cart",
      );
    } finally {
      setAdding(false);
    }
  };

  if (!products.length) {
    return null;
  }

  return (
    <>
      <section className="cart-product-section">
        <div className="cart-product-section-header">
          <h2>{section?.name}</h2>

          {products.length > 5 && (
            <div className="cart-product-section-arrows">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                aria-label="Previous products"
              >
                <FiChevronLeft />
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= products.length - 5}
                aria-label="Next products"
              >
                <FiChevronRight />
              </button>
            </div>
          )}
        </div>

        <div className="cart-product-section-viewport">
          <div
            className="cart-product-section-track"
            style={{
              transform: `translateX(-${currentIndex * 20}%)`,
            }}
          >
            {products.map((product) => {
              const price = Number(
                product?.discountPrice || product?.price || 0,
              );

              const mrp = Number(product?.price || 0);

              const image = product?.images?.[0] || product?.image || "";

              return (
                <article
                  className="cart-product-section-card"
                  key={product?._id}
                >
                  <div className="cart-product-section-image">
                    {image ? (
                      <img
                        src={getImageUrl(image)}
                        alt={product?.name || "Product"}
                      />
                    ) : (
                      <div>No Image</div>
                    )}
                  </div>

                  <div className="cart-product-section-name">
                    <strong>{product?.brand || "DECATHLON"}</strong>{" "}
                    {product?.name}
                  </div>

                  <div className="cart-product-section-rating">
                    <span>★★★★★</span>

                    <small>({product?.reviewsCount || "5.3k"})</small>
                  </div>

                  <div className="cart-product-section-price">
                    <strong>{formatPrice(price)}</strong>

                    {mrp > price && <span>MRP {formatPrice(mrp)}</span>}
                  </div>

                  <div className="cart-product-section-actions">
                    <button
                      type="button"
                      className={`cart-product-section-wishlist ${
                        isWishlisted(product._id) ? "active" : ""
                      }`}
                      title="Wishlist"
                      onClick={() => handleToggle(product._id)}
                    >
                      <FiHeart
                        fill={isWishlisted(product._id) ? "#3945bd" : "none"}
                        color={isWishlisted(product._id) ? "#3945bd" : "currentColor"}
                      />
                    </button>

                    <button
                      type="button"
                      className="cart-product-section-add"
                      onClick={() => handleAddClick(product)}
                    >
                      Add to cart
                    </button>
                  </div>
                </article>
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
          onClose={closeModal}
          onAddToCart={handleConfirmAdd}
          adding={adding}
          getImageUrl={getImageUrl}
          formatPrice={formatPrice}
        />
      )}
    </>
  );
};

export default CartProductSection;
