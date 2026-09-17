import React from "react";
import { FiX, FiMinus, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";

import "../styles/ProductSizeModal.css";

const ProductSizeModal = ({
  product,
  selectedSize,
  setSelectedSize,
  selectedColor,
  setSelectedColor,
  quantity,
  setQuantity,
  onClose,
  onAddToCart,
  adding,
  getImageUrl,
  formatPrice,
}) => {
  if (!product) return null;

  const convertToArray = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }

    if (value === undefined || value === null || value === "") {
      return [];
    }

    if (typeof value === "string") {
      const trimmed = value.trim();

      if (!trimmed) return [];

      try {
        const parsed = JSON.parse(trimmed);

        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }

        if (typeof parsed === "string" && parsed.trim()) {
          return [parsed.trim()];
        }
      } catch {}

      if (trimmed.includes(",")) {
        return trimmed
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      return [trimmed];
    }

    return [];
  };

  const sizes = convertToArray(product.size);
  const colors = convertToArray(product.color);

  const sellingPrice = Number(product.discountPrice || product.price || 0);

  const mrp = Number(product.price || 0);

  const decreaseQuantity = () => {
    setQuantity((prev) => Math.max(Number(prev) - 1, 1));
  };

  const increaseQuantity = () => {
    const stock = Number(product.stock || 999);

    if (Number(quantity) >= stock) {
      toast.warning("Maximum available quantity reached");
      return;
    }

    setQuantity((prev) => Math.min(Number(prev) + 1, stock));
  };

  const handleClose = () => {
    if (!adding) {
      onClose();
    }
  };

  const handleAdd = async () => {
    if (sizes.length > 0 && !selectedSize) {
      toast.warning("Please select a size");
      return;
    }

    if (colors.length > 0 && !selectedColor) {
      toast.warning("Please select a colour");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      toast.warning("Quantity must be at least 1");
      return;
    }

    try {
      await onAddToCart();
    } catch (error) {
      console.error("Add To Cart Error:", error);

      toast.error(
        error?.response?.data?.message || "Failed to add product to cart",
      );
    }
  };

  return (
    <div className="product-size-overlay" onClick={handleClose}>
      <div className="product-size-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="product-size-close"
          onClick={handleClose}
          disabled={adding}
          aria-label="Close"
        >
          <FiX />
        </button>

        <div className="product-size-product">
          <div className="product-size-product-image">
            {product.images?.[0] ? (
              <img
                src={getImageUrl(product.images[0])}
                alt={product.name || "Product"}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>

          <div className="product-size-product-info">
            <strong>{product.brand || "DECATHLON"}</strong>

            <div className="product-size-product-name">{product.name}</div>

            <div className="product-size-quantity-row">
              <span>Qty</span>

              <div className="product-size-quantity">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={adding || Number(quantity) <= 1}
                  aria-label="Decrease quantity"
                >
                  <FiMinus />
                </button>

                <span>{quantity}</span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  disabled={adding}
                  aria-label="Increase quantity"
                >
                  <FiPlus />
                </button>
              </div>
            </div>

            <div className="product-size-price">
              <strong>{formatPrice(sellingPrice)}</strong>

              {mrp > sellingPrice && <span>MRP {formatPrice(mrp)}</span>}
            </div>
          </div>
        </div>

        {colors.length > 0 && (
          <div className="product-size-colour-section">
            <div className="product-size-colour-heading">
              <h3>Colour Options</h3>

              <span>
                {colors.length} {colors.length === 1 ? "colour" : "colours"}
              </span>
            </div>

            <div className="product-size-colour-list">
              {colors.map((color, index) => {
                const image =
                  product.images?.[index] || product.images?.[0] || "";

                return (
                  <button
                    type="button"
                    key={`${color}-${index}`}
                    className={selectedColor === color ? "selected" : ""}
                    onClick={() => setSelectedColor(color)}
                    disabled={adding}
                    title={color}
                  >
                    {image ? (
                      <img src={getImageUrl(image)} alt={color} />
                    ) : (
                      <span>{color}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {sizes.length > 0 && (
          <div className="product-size-selector">
            <div className="product-size-title-row">
              <h3>Select Size</h3>

              <button type="button" className="product-size-chart">
                View size chart
              </button>
            </div>

            <div className="product-size-options">
              {sizes.map((size) => (
                <button
                  type="button"
                  key={size}
                  className={selectedSize === size ? "selected" : ""}
                  onClick={() => setSelectedSize(size)}
                  disabled={adding}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          className="product-size-add-button"
          disabled={adding}
          onClick={handleAdd}
        >
          {adding ? "Adding..." : "Add to Cart"}
        </button>
      </div>
    </div>
  );
};

export default ProductSizeModal;
