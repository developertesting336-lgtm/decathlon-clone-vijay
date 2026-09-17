import React from "react";
import { FiX } from "react-icons/fi";
import { toast } from "react-toastify";

const CartSizeModal = ({
  item,
  product,
  selectedSize,
  setSelectedSize,
  onClose,
  onUpdate,
  updating,
  getImageUrl,
  formatPrice,
  getSellingPrice,
}) => {
  if (!item || !product) {
    return null;
  }

  if (!Array.isArray(product.size) || product.size.length === 0) {
    return null;
  }

  const handleSizeChart = () => {
    toast.info("Size chart coming soon");
  };

  return (
    <div className="cart-size-overlay" onClick={onClose}>
      <div className="cart-size-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="cart-size-close"
          onClick={onClose}
          disabled={updating}
        >
          <FiX />
        </button>

        <div className="cart-size-product">
          <div className="cart-size-product-image">
            {product.images?.[0] ? (
              <img
                src={getImageUrl(product.images[0])}
                alt={product.name || "Product"}
              />
            ) : (
              <span>No Image</span>
            )}
          </div>

          <div className="cart-size-product-info">
            <div className="cart-size-brand">
              {product.brand || "DECATHLON"}
            </div>

            <div className="cart-size-product-name">{product.name}</div>

            <div className="cart-size-product-price">
              {formatPrice(getSellingPrice(item))}
            </div>
          </div>
        </div>

        <div className="cart-size-title-row">
          <h3>Select Size</h3>

          <button
            type="button"
            className="cart-size-chart"
            onClick={handleSizeChart}
            disabled={updating}
          >
            View size chart
          </button>
        </div>

        <div className="cart-size-options">
          {product.size.map((size) => (
            <button
              key={size}
              type="button"
              className={selectedSize === size ? "selected" : ""}
              onClick={() => setSelectedSize(size)}
              disabled={updating}
            >
              {size}
            </button>
          ))}
        </div>

        <button
          type="button"
          className="cart-size-update"
          onClick={onUpdate}
          disabled={!selectedSize || updating}
        >
          {updating ? "Updating..." : "Update"}
        </button>
      </div>
    </div>
  );
};

export default CartSizeModal;
