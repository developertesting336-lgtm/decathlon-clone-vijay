const GUEST_WISHLIST_KEY = "guest_wishlist";

export const getGuestWishlist = () => {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Error reading guest wishlist:", err);
    return [];
  }
};

export const getGuestWishlistIds = () => {
  const items = getGuestWishlist();
  return items.map((item) =>
    String(typeof item === "string" ? item : item._id || item.productId)
  );
};

export const isGuestWishlisted = (productId) => {
  if (!productId) return false;
  const targetId = String(productId);
  const ids = getGuestWishlistIds();
  return ids.includes(targetId);
};

export const saveGuestWishlist = (items) => {
  try {
    const validItems = Array.isArray(items) ? items : [];
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(validItems));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wishlistUpdated"));
    }
  } catch (err) {
    console.error("Error saving guest wishlist:", err);
  }
};

export const toggleGuestWishlist = (product) => {
  if (!product) return { success: false, added: false, message: "Invalid product" };

  const pId = String(typeof product === "string" ? product : product._id || product.productId);
  if (!pId) return { success: false, added: false, message: "Invalid product ID" };

  const items = getGuestWishlist();
  const existingIndex = items.findIndex(
    (item) =>
      String(typeof item === "string" ? item : item._id || item.productId) === pId
  );

  let added = false;
  let message = "";

  if (existingIndex > -1) {
    items.splice(existingIndex, 1);
    added = false;
    message = "Removed from wishlist";
  } else {
    // If full product object was passed, store it so guest wishlist page can render immediately
    const productData =
      typeof product === "object"
        ? {
            _id: pId,
            name: product.name || "",
            price: product.price || 0,
            discountPrice: product.discountPrice || 0,
            images: product.images || [],
            brand: product.brand || "",
            stock: product.stock ?? 99,
            size: product.size || [],
            color: product.color || [],
            category: product.category || "",
          }
        : { _id: pId };

    items.push(productData);
    added = true;
    message = "Added to wishlist ❤️";
  }

  saveGuestWishlist(items);
  return { success: true, added, message };
};

export const removeFromGuestWishlist = (productId) => {
  if (!productId) return getGuestWishlist();
  const pId = String(productId);
  const items = getGuestWishlist().filter(
    (item) =>
      String(typeof item === "string" ? item : item._id || item.productId) !== pId
  );
  saveGuestWishlist(items);
  return items;
};

export const clearGuestWishlist = () => {
  try {
    localStorage.removeItem(GUEST_WISHLIST_KEY);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wishlistUpdated"));
    }
  } catch (err) {
    console.error("Error clearing guest wishlist:", err);
  }
};
