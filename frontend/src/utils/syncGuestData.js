import api from "../api/axios";
import { getGuestCart, clearGuestCart } from "./guestCart";
import { getGuestWishlistIds, clearGuestWishlist } from "./guestWishlist";

export const syncGuestCartAndWishlist = async (token) => {
  const authToken = token || localStorage.getItem("token");
  if (!authToken) return { cartSynced: false, wishlistSynced: false };

  const authHeaders = {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  };

  const guestCart = getGuestCart();
  const guestWishlistIds = getGuestWishlistIds();

  let cartSynced = false;
  let wishlistSynced = false;

  // 1. Sync Guest Cart
  if (Array.isArray(guestCart) && guestCart.length > 0) {
    try {
      const payload = {
        items: guestCart.map((item) => ({
          productId: String(item.productId || item.product?._id),
          quantity: Number(item.quantity) || 1,
          size: item.size || "",
          color: item.color || "",
        })),
      };

      await api.post("/cart/sync", payload, authHeaders);
      clearGuestCart();
      cartSynced = true;
    } catch (err) {
      console.error("Failed to sync guest cart on login:", err);
    }
  }

  // 2. Sync Guest Wishlist
  if (Array.isArray(guestWishlistIds) && guestWishlistIds.length > 0) {
    try {
      await api.post("/wishlist/sync", { productIds: guestWishlistIds }, authHeaders);
      clearGuestWishlist();
      wishlistSynced = true;
    } catch (err) {
      console.error("Failed to sync guest wishlist on login:", err);
    }
  }

  if (typeof window !== "undefined") {
    if (cartSynced) window.dispatchEvent(new Event("cartUpdated"));
    if (wishlistSynced) window.dispatchEvent(new Event("wishlistUpdated"));
  }

  return { cartSynced, wishlistSynced };
};
