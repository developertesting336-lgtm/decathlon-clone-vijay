const GUEST_CART_KEY = "guest_cart";

export const getGuestCart = () => {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading guest cart:", err);
    return [];
  }
};

export const saveGuestCart = (cartItems) => {
  try {
    const validItems = Array.isArray(cartItems) ? cartItems : [];
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(validItems));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  } catch (err) {
    console.error("Error saving guest cart:", err);
  }
};

export const addToGuestCart = (product, size = "", color = "", quantity = 1) => {
  if (!product || !product._id) {
    return { success: false, message: "Invalid product" };
  }

  const pId = String(product._id);
  const addQty = Math.max(1, Number(quantity) || 1);
  const stock = Number(product.stock ?? 99);

  if (stock <= 0) {
    return { success: false, message: "Product is currently out of stock" };
  }

  const items = getGuestCart();
  const existingIndex = items.findIndex(
    (item) =>
      String(item.productId || item.product?._id) === pId &&
      String(item.size || "") === String(size || "")
  );

  if (existingIndex > -1) {
    const currentQty = Number(items[existingIndex].quantity || 1);
    const newQty = Math.min(stock, currentQty + addQty);
    if (newQty === currentQty && currentQty >= stock) {
      return { success: false, message: `Maximum available stock (${stock}) reached` };
    }
    items[existingIndex].quantity = newQty;
    // ensure product details are updated
    items[existingIndex].product = {
      ...items[existingIndex].product,
      ...product,
    };
  } else {
    items.push({
      productId: pId,
      product: {
        _id: pId,
        name: product.name,
        price: product.price,
        discountPrice: product.discountPrice,
        images: product.images,
        brand: product.brand,
        stock: product.stock,
        size: product.size,
        color: product.color,
      },
      size: size || "",
      color: color || "",
      quantity: Math.min(stock, addQty),
    });
  }

  saveGuestCart(items);
  return { success: true, message: "Added to cart successfully!" };
};

export const updateGuestCartQuantity = (productId, size = "", newQty = 1) => {
  const pId = String(productId);
  const qty = Number(newQty);
  let items = getGuestCart();

  if (qty <= 0) {
    items = items.filter(
      (item) =>
        !(
          String(item.productId || item.product?._id) === pId &&
          String(item.size || "") === String(size || "")
        )
    );
  } else {
    const index = items.findIndex(
      (item) =>
        String(item.productId || item.product?._id) === pId &&
        String(item.size || "") === String(size || "")
    );
    if (index > -1) {
      const stock = Number(items[index].product?.stock ?? 99);
      items[index].quantity = Math.min(stock, qty);
    }
  }

  saveGuestCart(items);
  return items;
};

export const updateGuestCartSize = (productId, oldSize = "", newSize = "") => {
  const pId = String(productId);
  const items = getGuestCart();

  const itemToUpdateIndex = items.findIndex(
    (item) =>
      String(item.productId || item.product?._id) === pId &&
      String(item.size || "") === String(oldSize || "")
  );

  if (itemToUpdateIndex === -1) return items;

  // Check if target item with newSize already exists
  const existingTargetIndex = items.findIndex(
    (item, idx) =>
      idx !== itemToUpdateIndex &&
      String(item.productId || item.product?._id) === pId &&
      String(item.size || "") === String(newSize || "")
  );

  if (existingTargetIndex > -1) {
    // Merge
    const stock = Number(items[existingTargetIndex].product?.stock ?? 99);
    items[existingTargetIndex].quantity = Math.min(
      stock,
      Number(items[existingTargetIndex].quantity || 1) +
        Number(items[itemToUpdateIndex].quantity || 1)
    );
    items.splice(itemToUpdateIndex, 1);
  } else {
    items[itemToUpdateIndex].size = newSize || "";
  }

  saveGuestCart(items);
  return items;
};

export const removeFromGuestCart = (productId, size = "") => {
  const pId = String(productId);
  const items = getGuestCart().filter(
    (item) =>
      !(
        String(item.productId || item.product?._id) === pId &&
        String(item.size || "") === String(size || "")
      )
  );
  saveGuestCart(items);
  return items;
};

export const clearGuestCart = () => {
  try {
    localStorage.removeItem(GUEST_CART_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cartUpdated"));
    }
  } catch (err) {
    console.error("Error clearing guest cart:", err);
  }
};

export const getGuestCartCount = () => {
  const items = getGuestCart();
  return items.reduce((total, item) => total + (Number(item.quantity) || 1), 0);
};
