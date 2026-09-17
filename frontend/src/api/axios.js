import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import toast from "react-hot-toast";

let lastToastTime = 0;

export const isTokenExpired = (token) => {
  if (!token || typeof token !== "string") {
    return true;
  }
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return false;
    return decoded.exp * 1000 <= Date.now() + 2000;
  } catch {
    return true;
  }
};

export const getTokenRemainingTime = (token) => {
  if (!token || typeof token !== "string") return 0;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return 0;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const decoded = JSON.parse(jsonPayload);
    if (!decoded.exp) return 0;
    return Math.max(0, decoded.exp * 1000 - Date.now());
  } catch {
    return 0;
  }
};

export const handleAutoLogout = (
  reason = "Session expired. Please login again."
) => {
  const hadAuth = Boolean(
    localStorage.getItem("token") || localStorage.getItem("user")
  );

  localStorage.removeItem("token");
  localStorage.removeItem("user");

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("authChanged"));
    window.dispatchEvent(new Event("cartUpdated"));

    if (hadAuth) {
      const now = Date.now();
      if (now - lastToastTime > 3000) {
        lastToastTime = now;
        toast.error(reason);
      }

      const protectedPaths = [
        "/account",
        "/profile",
        "/checkout",
        "/delivery",
        "/payment",
      ];
      const isProtected = protectedPaths.some((path) =>
        window.location.pathname.startsWith(path)
      );

      if (isProtected) {
        window.location.href = "/login";
      }
    }
  }
};

const getBaseURL = () => {
  if (
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168."))
  ) {
    return `http://${window.location.hostname}:5000/api`;
  }
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  return "https://decathlon-clone-pi.vercel.app/api";
};

const api = axios.create({
  baseURL: getBaseURL(),
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      if (isTokenExpired(token)) {
        handleAutoLogout("Session expired. Please login again.");
        return Promise.reject(new axios.Cancel("Token expired"));
      }
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error?.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token) {
        handleAutoLogout(
          error?.response?.data?.message || "Session expired. Please login again."
        );
      }
    }
    return Promise.reject(error);
  }
);

export const toggleWishlist = async (productId) => {
  const token = localStorage.getItem("token");
  if (!token) {
    toast.error("Please login to add items to wishlist");
    return false;
  }

  try {
    const response = await api.post(
      "/wishlist",
      { productId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    toast.success(response.data?.message || "Added to wishlist ❤️");
    return true;
  } catch (error) {
    if (error.response?.data?.message === "Product already in wishlist") {
      try {
        await api.delete(`/wishlist/${productId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        toast.success("Removed from wishlist");
        return false;
      } catch (delErr) {
        toast.info("Product is already in your wishlist");
        return true;
      }
    }
    toast.error(error.response?.data?.message || "Failed to update wishlist");
    return false;
  }
};

export const useWishlist = () => {
  const [wishlistIds, setWishlistIds] = useState([]);

  const fetchWishlist = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setWishlistIds([]);
      return;
    }
    try {
      const response = await api.get("/wishlist", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const products = response.data?.wishlist?.products || [];
      const ids = products.map((p) => (typeof p === "string" ? p : p._id));
      setWishlistIds(ids);
    } catch (e) {
      console.error("useWishlist fetch error", e);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();

    const handleWishlistUpdated = () => {
      fetchWishlist();
    };

    window.addEventListener("wishlistUpdated", handleWishlistUpdated);

    return () => {
      window.removeEventListener("wishlistUpdated", handleWishlistUpdated);
    };
  }, [fetchWishlist]);

  const handleToggle = async (productId) => {
    await toggleWishlist(productId);
    window.dispatchEvent(new Event("wishlistUpdated"));
    fetchWishlist();
  };

  const isWishlisted = (productId) => {
    return wishlistIds.some((id) => String(id) === String(productId));
  };

  return { wishlistIds, isWishlisted, handleToggle };
};

export default api;
