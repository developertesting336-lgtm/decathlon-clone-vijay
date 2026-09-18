import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api, { useWishlist } from "../api/axios";
import socket from "../socket/socket";

export const useStorePage = (pageSlug) => {
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  const targetSlug = (pageSlug || "").toLowerCase().trim();

  const [page, setPage] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Cart / Size Modal states
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  /* =========================================================
     IMAGE URL HELPER
  ========================================================= */
  const getImageUrl = useCallback((image) => {
    if (!image) return "";

    if (
      typeof image === "string" &&
      (
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:")
      )
    ) {
      return image;
    }

    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    if (typeof image === "string") {
      if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
      if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
      return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
    }

    return "";
  }, []);

  const formatPrice = useCallback((price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  }, []);

  /* =========================================================
     FETCH PAGE DATA
  ========================================================= */
  const fetchPageData = useCallback(async () => {
    if (!targetSlug) return;

    try {
      setLoading(true);
      setNotFound(false);

      let response;
      try {
        response = await api.get(`/pages/slug/${targetSlug}`);
      } catch (err) {
        if (err.response?.status === 404) {
          response = await api.get(`/pages/${targetSlug}`);
        } else {
          throw err;
        }
      }

      const pageData = response.data?.page || response.data;
      if (!pageData) {
        setNotFound(true);
        return;
      }

      setPage(pageData);
      if (pageData.title || pageData.name) {
        document.title = `${pageData.title || pageData.name} | Decathlon`;
      }
      const activeSections = (pageData.sections || [])
        .filter((sec) => sec.isActive !== false)
        .sort((a, b) => ((a.order !== undefined ? a.order : a.sortOrder) || 0) - ((b.order !== undefined ? b.order : b.sortOrder) || 0));

      setSections(activeSections);
    } catch (error) {
      console.error(`Failed to load page '${targetSlug}':`, error);
      if (error?.response?.status === 404) {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [targetSlug]);

  /* =========================================================
     INITIAL LOAD & SOCKET LISTENER
  ========================================================= */
  useEffect(() => {
    fetchPageData();

    const handleUpdate = (payload) => {
      const updatedSlug = payload?.data?.slug || payload?.slug;
      if (!updatedSlug || updatedSlug === targetSlug) {
        fetchPageData();
      }
    };

    const handleProductChange = () => {
      fetchPageData();
    };

    socket.on("homepage_updated", handleUpdate);
    socket.on("section_updated", handleUpdate);
    socket.on("page_updated", handleUpdate);
    socket.on("product_created", handleProductChange);
    socket.on("product_updated", handleProductChange);
    socket.on("product_deleted", handleProductChange);
    socket.on("products_updated", handleProductChange);

    return () => {
      socket.off("homepage_updated", handleUpdate);
      socket.off("section_updated", handleUpdate);
      socket.off("page_updated", handleUpdate);
      socket.off("product_created", handleProductChange);
      socket.off("product_updated", handleProductChange);
      socket.off("product_deleted", handleProductChange);
      socket.off("products_updated", handleProductChange);
    };
  }, [fetchPageData, targetSlug]);

  /* =========================================================
     CART MODAL HANDLERS
  ========================================================= */
  const handleOpenCartModal = (product) => {
    setSelectedProduct(product);
    setSelectedSize("");
    setSelectedColor("");
    setQuantity(1);
    setAdding(false);
  };

  const handleCloseCartModal = () => {
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
      toast.error("Please login first to add to cart");
      navigate("/login");
      return;
    }

    const sizes = Array.isArray(selectedProduct.size)
      ? selectedProduct.size
      : [];

    if (sizes.length > 0 && !selectedSize) {
      toast.error("Please select a size");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      toast.error("Quantity must be at least 1");
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
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));

      setSelectedProduct(null);
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    } catch (error) {
      console.error("Add to cart error:", error);
      if (error?.response?.status === 401) {
        toast.error("Please login again");
        navigate("/login");
        return;
      }
      toast.error(
        error?.response?.data?.message || "Failed to add product to cart"
      );
    } finally {
      setAdding(false);
    }
  };

  return {
    targetSlug,
    page,
    sections,
    loading,
    notFound,
    selectedProduct,
    selectedSize,
    setSelectedSize,
    selectedColor,
    setSelectedColor,
    quantity,
    setQuantity,
    adding,
    handleOpenCartModal,
    handleCloseCartModal,
    handleAddToCart,
    getImageUrl,
    formatPrice,
    isWishlisted,
    handleToggleWishlist: handleToggle,
    navigate,
    fetchPageData,
  };
};

export default useStorePage;
