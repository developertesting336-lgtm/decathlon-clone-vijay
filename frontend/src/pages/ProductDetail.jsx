import { addToGuestCart } from "../utils/guestCart";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { subscribeToWebPush } from "../utils/pushNotifications";
import {
  FiBell,
  FiShield,
  FiRotateCcw,
  FiWind,
  FiDroplet,
  FiLayers,
  FiChevronRight,
  FiShare2,
  FiEdit2,
  FiTrendingDown,
  FiClock,
  FiInfo,
  FiX,
  FiTag,
} from "react-icons/fi";
import { MdFavorite, MdFavoriteBorder } from "react-icons/md";
import toast from "react-hot-toast";

import api, { useWishlist } from "../api/axios";
import socket from "../socket/socket";
import Navbar from "../components/Navbar";
import CategoryNav from "../components/pageSections/CategoryNav/CategoryNav";
import Footer from "../components/pageSections/Footer/Footer";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ProductReviews, {
  StarRating,
} from "../components/ProductReviews/ProductReviews";
import SizeGuide from "../components/SizeGuide/SizeGuide";
import RelatedProducts from "../components/RelatedProducts/RelatedProducts";
import NotifyMe from "../components/NotifyMe/NotifyMe";
import PriceHistoryChart from "../components/PriceHistoryChart/PriceHistoryChart";
import VirtualTryOnModal from "../components/VirtualTryOn/VirtualTryOnModal";
import FittingRoomModal from "../components/FittingRoomModal/FittingRoomModal";
import { useDeliveryLocation } from "../utils/deliveryLocation";
import "../styles/ProductDetail.css";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  // Helper: check if product is wearable clothing (apparel: tops, trackpants, jackets, shorts, etc.)
  // (Excludes non-clothing: cycles, dumbbells, shoes, tents, bottles, backpacks, etc.)
  const isClothingProduct = useCallback((item) => {
    if (!item) return false;
    const text =
      `${item.name || ""} ${item.subcategory || ""} ${typeof item.category === "string" ? item.category : item.category?.name || ""}`.toLowerCase();

    // Hardware, gear, shoes, bags & accessories (NOT clothing)
    const nonClothing = [
      /\bcycles?\b/i,
      /\bbikes?\b/i,
      /\bbicycles?\b/i,
      /\bframe\b/i,
      /\bdumbbells?\b/i,
      /\bkettlebells?\b/i,
      /\bweights?\b/i,
      /\bbench\b/i,
      /\btents?\b/i,
      /\bsleeping bag\b/i,
      /\bmats?\b/i,
      /\byoga mat\b/i,
      /\btowels?\b/i,
      /\bbottles?\b/i,
      /\bsippers?\b/i,
      /\bflasks?\b/i,
      /\bbackpacks?\b/i,
      /\brucksacks?\b/i,
      /\bbags?\b/i,
      /\bpouches?\b/i,
      /\bshoes?\b/i,
      /\bboots?\b/i,
      /\btrainers?\b/i,
      /\bsneakers?\b/i,
      /\bsandals?\b/i,
      /\bflipflops?\b/i,
      /\bsunglasses\b/i,
      /\bgoggles\b/i,
      /\bwatches?\b/i,
      /\bropes?\b/i,
      /\bhelmets?\b/i,
      /\bpumps?\b/i,
      /\brackets?\b/i,
      /\bballs?\b/i,
      /\bskates?\b/i,
      /\bskateboards?\b/i,
      /\brollers?\b/i,
    ];
    if (nonClothing.some((r) => r.test(text))) return false;

    // Has apparel sizes (S, M, L, XL, etc.)
    const hasApparelSizes =
      Array.isArray(item.size) &&
      item.size.some((s) =>
        /^(xs|s|m|l|xl|xxl|2xl|3xl|\d{2,3})$/i.test(String(s).trim())
      );
    if (hasApparelSizes) return true;

    // Wearable apparel
    const clothing = [
      /\bshirts?\b/i,
      /\bt-?shirts?\b/i,
      /\btees?\b/i,
      /\bpolos?\b/i,
      /\bjackets?\b/i,
      /\bcoats?\b/i,
      /\braincoats?\b/i,
      /\bwindproof\b/i,
      /\bfleece\b/i,
      /\bvests?\b/i,
      /\bhoodies?\b/i,
      /\bsweatshirts?\b/i,
      /\bsweaters?\b/i,
      /\bjerseys?\b/i,
      /\btops?\b/i,
      /\btanks?\b/i,
      /\btrackpants?\b/i,
      /\bpants?\b/i,
      /\btrousers?\b/i,
      /\bshorts?\b/i,
      /\bjoggers?\b/i,
      /\bleggings?\b/i,
      /\btights?\b/i,
      /\bbottoms?\b/i,
      /\bjeans?\b/i,
      /\bskirts?\b/i,
      /\bactivewear\b/i,
      /\bsportswear\b/i,
      /\bapparel\b/i,
      /\bclothing\b/i,
      /\bgym\b/i,
      /\bfitness\b/i,
      /\bhiking\b/i,
    ];
    return clothing.some((r) => r.test(text));
  }, []);

  // Core product states
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selection states
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [addingToCart, setAddingToCart] = useState(false);
  const [priceComparison, setPriceComparison] = useState(null);
  const [showPriceHistoryModal, setShowPriceHistoryModal] = useState(false);
  const [isPriceTracking, setIsPriceTracking] = useState(false);
  const [priceAlertId, setPriceAlertId] = useState(null);
  const [showPriceAlertModal, setShowPriceAlertModal] = useState(false);
  const [targetPriceInput, setTargetPriceInput] = useState("");
  const [alertEmailInput, setAlertEmailInput] = useState("");
  const [settingAlert, setSettingAlert] = useState(false);

  // Pincode check synced with real-time delivery location
  const { location: deliveryLocation } = useDeliveryLocation();
  const [pincode, setPincode] = useState(
    () => deliveryLocation.pincode || "560001",
  );

  useEffect(() => {
    if (deliveryLocation?.pincode) {
      setPincode(deliveryLocation.pincode);
    }
  }, [deliveryLocation?.pincode]);

  // Accordion triggers
  const [openAccordion, setOpenAccordion] = useState(null);

  // Size chart modal
  const [showSizeModal, setShowSizeModal] = useState(false);

  // Virtual Try-On modal
  const [showTryOnModal, setShowTryOnModal] = useState(false);
  const [isFittingRoomOpen, setIsFittingRoomOpen] = useState(false);
  const [initialDroppedGarment, setInitialDroppedGarment] = useState(null);
  const [activeDragItem, setActiveDragItem] = useState(null);
  const [touchPointerPos, setTouchPointerPos] = useState({ x: 0, y: 0 });

  // Thumbnail drag-and-drop triggers for AI Virtual Try-On
  const handleThumbnailDragStart = (e, img, colorName = "") => {
    const fullUrl = getImageUrl(img);
    if (!fullUrl) return;
    setInitialDroppedGarment(fullUrl);
    setShowTryOnModal(true);

    if (e.dataTransfer) {
      const data = {
        imageUrl: fullUrl,
        name: product?.name,
        color: colorName || selectedColor,
      };
      e.dataTransfer.setData("application/json", JSON.stringify(data));
      e.dataTransfer.setData("text/plain", fullUrl);
      e.dataTransfer.effectAllowed = "copy";
    }
  };

  const handleThumbnailPointerDown = (e, img, colorName = "") => {
    if (e.button !== undefined && e.button !== 0) return;
    const fullUrl = getImageUrl(img);
    if (!fullUrl) return;

    const startX = e.clientX;
    const startY = e.clientY;
    let dragTriggered = false;

    const onPointerMove = (moveEvent) => {
      const dist = Math.hypot(
        moveEvent.clientX - startX,
        moveEvent.clientY - startY
      );
      if (dist > 8) {
        dragTriggered = true;
        setActiveDragItem({
          imageUrl: fullUrl,
          color: colorName || selectedColor,
        });
        setTouchPointerPos({ x: moveEvent.clientX, y: moveEvent.clientY });
        setShowTryOnModal(true);
        setInitialDroppedGarment(fullUrl);

        const dropZone = document.querySelector('[data-drop-zone="vton-model"]');
        if (dropZone) {
          const rect = dropZone.getBoundingClientRect();
          const isInside =
            moveEvent.clientX >= rect.left &&
            moveEvent.clientX <= rect.right &&
            moveEvent.clientY >= rect.top &&
            moveEvent.clientY <= rect.bottom;
          if (isInside) {
            dropZone.classList.add("drag-over");
          } else {
            dropZone.classList.remove("drag-over");
          }
        }
      }
    };

    const onPointerUp = (upEvent) => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);

      if (dragTriggered) {
        const dropZone = document.querySelector('[data-drop-zone="vton-model"]');
        if (dropZone) {
          dropZone.classList.remove("drag-over");
          const rect = dropZone.getBoundingClientRect();
          const isInside =
            upEvent.clientX >= rect.left &&
            upEvent.clientX <= rect.right &&
            upEvent.clientY >= rect.top &&
            upEvent.clientY <= rect.bottom;
          if (isInside) {
            setInitialDroppedGarment(fullUrl);
            toast.success("Garment dropped onto model! Ready to generate.", {
              id: "pdp-drop-success",
              icon: "✨",
            });
          }
        }
      }
      setActiveDragItem(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
  };

  // Rating and reviews summary
  const [ratingSummary, setRatingSummary] = useState({
    averageRating: 0,
    reviewCount: 0,
  });

  const handleRatingUpdate = useCallback(({ averageRating, reviewCount }) => {
    setRatingSummary({ averageRating, reviewCount });
    setProduct((prev) =>
      prev ? { ...prev, averageRating, reviewCount } : prev,
    );
  }, []);

  // Price formatter
  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  const getImageUrl = (image) => {
    if (!image) return null;
    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  // Scroll to top on id change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  // Fetch product by ID
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await api.get(`/products/${id}`);
        const prod = response.data?.product;

        if (!prod) {
          setError("Product not found");
          return;
        }

        setProduct(prod);
        if (response.data?.priceComparison) {
          setPriceComparison(response.data.priceComparison);
        }

        // Record recently viewed (local + authenticated API)
        try {
          const currentPrice =
            prod.discountPrice && Number(prod.discountPrice) > 0
              ? Number(prod.discountPrice)
              : Number(prod.price) || 0;

          const existingGuestStr = localStorage.getItem(
            "recently_viewed_guest",
          );
          let guestList = existingGuestStr ? JSON.parse(existingGuestStr) : [];
          if (!Array.isArray(guestList)) guestList = [];
          guestList = guestList.filter(
            (g) => (g.productId || g._id) !== prod._id,
          );
          guestList.unshift({
            _id: prod._id,
            productId: prod._id,
            product: prod,
            viewedPrice: currentPrice,
            lastViewedAt: new Date().toISOString(),
          });
          localStorage.setItem(
            "recently_viewed_guest",
            JSON.stringify(guestList.slice(0, 20)),
          );

          const token =
            localStorage.getItem("token") || localStorage.getItem("userToken");
          if (token) {
            api
              .post("/recently-viewed", { productId: prod._id })
              .catch(() => {});
          }
        } catch (viewErr) {
          console.warn("Could not record recently viewed:", viewErr);
        }
        setRatingSummary({
          averageRating: Number(
            prod.averageRating || prod.rating || prod.review || 0,
          ),
          reviewCount: Number(prod.reviewCount || 0),
        });
        document.title = `${prod.name || "Product"} | Decathlon`;

        if (Array.isArray(prod.color) && prod.color.length > 0) {
          setSelectedColor(prod.color[0]);
        } else {
          setSelectedColor("");
        }

        if (Array.isArray(prod.size) && prod.size.length > 0) {
          setSelectedSize(prod.size[0]);
        } else {
          setSelectedSize("");
        }
      } catch (err) {
        console.error("Fetch Product Detail Error:", err);
        setError(err.response?.data?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }

    const handleProductRealtime = (payload) => {
      const updatedId =
        payload?.productId || payload?.product?._id || payload?._id;
      if (updatedId === id) {
        if (payload?.type === "product_deleted") {
          setError("This product has been removed");
        } else {
          fetchProduct();
        }
      }
    };

    socket.on("product_updated", handleProductRealtime);
    socket.on("product_deleted", handleProductRealtime);

    return () => {
      socket.off("product_updated", handleProductRealtime);
      socket.off("product_deleted", handleProductRealtime);
    };
  }, [id]);

  // Check Price Alert tracking status for current product
  useEffect(() => {
    if (!id) return;
    const user = JSON.parse(localStorage.getItem("user") || "null");
    if (user?.email) {
      setAlertEmailInput(user.email);
    }
    api
      .get(`/price-alerts/status/${id}`)
      .then((res) => {
        if (res.data?.isTracking) {
          setIsPriceTracking(true);
          setPriceAlertId(res.data.alert?._id || null);
          if (res.data.alert?.targetPrice) {
            setTargetPriceInput(res.data.alert.targetPrice);
          }
        } else {
          setIsPriceTracking(false);
          setPriceAlertId(null);
        }
      })
      .catch(() => {});
  }, [id]);

  const handleOpenPriceAlert = () => {
    if (isPriceTracking && priceAlertId) {
      handleCancelPriceAlert();
      return;
    }
    const suggestedTarget = Math.round(currentPrice * 0.9);
    setTargetPriceInput(suggestedTarget);
    setShowPriceAlertModal(true);
  };

  const handleCancelPriceAlert = async () => {
    try {
      if (priceAlertId) {
        await api.delete(`/price-alerts/${priceAlertId}`);
      }
      setIsPriceTracking(false);
      setPriceAlertId(null);
      toast.success("Price tracking removed for this product");
    } catch (err) {
      toast.error("Failed to cancel price tracking");
    }
  };

  const handleSavePriceAlert = async (e) => {
    e.preventDefault();
    try {
      setSettingAlert(true);

      // 1. Request Web Push permission and register push subscription
      const pushRes = await subscribeToWebPush();

      // 2. Register price alert in backend
      const res = await api.post("/price-alerts", {
        productId: product._id,
        email: alertEmailInput || undefined,
        targetPrice: targetPriceInput ? Number(targetPriceInput) : undefined,
      });

      setIsPriceTracking(true);
      setPriceAlertId(res.data?.alert?._id || null);
      setShowPriceAlertModal(false);

      if (pushRes?.success) {
        toast.success("Price tracking enabled with Web Push alerts!");
      } else {
        toast.success(
          "Price alert set! You will receive notifications when the price drops.",
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to set price alert");
    } finally {
      setSettingAlert(false);
    }
  };

  // Pricing calculations
  const currentPrice = useMemo(() => {
    if (!product) return 0;
    return product.discountPrice && product.discountPrice < product.price
      ? product.discountPrice
      : product.price;
  }, [product]);

  const originalPrice = useMemo(() => {
    return Number(priceComparison?.originalPrice || product?.price || 0);
  }, [priceComparison, product]);

  const previousPrice = useMemo(() => {
    if (priceComparison?.previousPrice) return priceComparison.previousPrice;
    if (product?.previousPrice) return product.previousPrice;
    if (originalPrice > currentPrice) {
      return Math.round(currentPrice + (originalPrice - currentPrice) * 0.4);
    }
    return originalPrice;
  }, [priceComparison, product, originalPrice, currentPrice]);

  const priceDropAmount = useMemo(() => {
    if (priceComparison?.priceDrop !== undefined)
      return priceComparison.priceDrop;
    return previousPrice > currentPrice ? previousPrice - currentPrice : 0;
  }, [priceComparison, previousPrice, currentPrice]);

  const savingsAmount = useMemo(() => {
    if (priceComparison?.totalSavings !== undefined)
      return priceComparison.totalSavings;
    return originalPrice > currentPrice ? originalPrice - currentPrice : 0;
  }, [priceComparison, originalPrice, currentPrice]);

  const discountPercentage = useMemo(() => {
    if (priceComparison?.discountPercent !== undefined)
      return priceComparison.discountPercent;
    return originalPrice > 0
      ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
      : 0;
  }, [priceComparison, originalPrice, currentPrice]);

  const lowestPriceIn30Days = useMemo(() => {
    if (priceComparison?.lowestPriceIn30Days)
      return priceComparison.lowestPriceIn30Days;
    return (
      product?.lowestPriceIn30Days || Math.min(currentPrice, previousPrice)
    );
  }, [priceComparison, product, currentPrice, previousPrice]);

  const priceHistoryTimeline = useMemo(() => {
    let list = [];
    if (priceComparison?.history && priceComparison.history.length > 0) {
      list = [...priceComparison.history];
    } else {
      const now = Date.now();
      list = [
        {
          price: originalPrice,
          effectivePrice: originalPrice,
          effectiveDate: new Date(now - 45 * 86400000),
          reason: "Original launch price",
        },
        {
          price: originalPrice,
          effectivePrice: previousPrice,
          effectiveDate: new Date(now - 15 * 86400000),
          reason: "Previous season pricing",
        },
      ];
    }

    // Ensure the active current price is always the final 'Current' point
    const lastItem = list[list.length - 1];
    const lastEffPrice = Number(
      lastItem?.effectivePrice ||
        lastItem?.discountPrice ||
        lastItem?.price ||
        0,
    );
    if (lastEffPrice !== currentPrice && currentPrice > 0) {
      list.push({
        price: originalPrice,
        discountPrice: currentPrice,
        effectivePrice: currentPrice,
        effectiveDate: new Date(),
        reason: "Current selling price",
      });
    }

    return list;
  }, [priceComparison, originalPrice, previousPrice, currentPrice]);

  // Delivery estimation
  const deliveryDateString = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 2);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }, []);

  const handleCheckPincode = async () => {
    const cleanPin = pincode.trim();
    if (!cleanPin || cleanPin.length !== 6 || isNaN(cleanPin)) {
      toast.error("Please enter a valid 6-digit Pincode");
      return;
    }
    try {
      const res = await api.get(`/location/pincode/${cleanPin}`);
      const city = res.data?.city || res.data?.district || res.data?.cityState;
      const state = res.data?.state || "";
      const locLabel = [city, state].filter(Boolean).join(", ");
      toast.success(
        locLabel
          ? `Delivery available to ${locLabel} (${cleanPin})`
          : `Delivery is available for pincode ${cleanPin}`,
      );
    } catch {
      toast.success(`Delivery is available for pincode ${cleanPin}`);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    } else {
      toast.success(
        "Share product ID: " + (product?._id?.slice(-7) || "8404222"),
      );
    }
  };

  // Add to cart handler
  const handleAddToCart = async (
    targetProduct = product,
    targetSize = selectedSize,
    targetColor = selectedColor,
  ) => {
    const sizes = Array.isArray(targetProduct.size) ? targetProduct.size : [];
    if (sizes.length > 0 && !targetSize) {
      toast.error("Please select a size");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      const res = addToGuestCart(
        targetProduct,
        targetSize || "",
        targetColor || "",
        1,
      );
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      return;
    }

    try {
      setAddingToCart(true);
      await api.post(
        "/cart",
        {
          productId: targetProduct._id,
          quantity: 1,
          size: targetSize || "",
          color: targetColor || "",
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Added to cart successfully!");
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Add to cart error:", err);
      if (err.response?.status === 401) {
        toast.error("Session expired, please login again");
        navigate("/login");
        return;
      }
      toast.error(err.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <CategoryNav />
        <div className="product-detail-container">
          <LoadingSpinner
            message="Loading product details..."
            minHeight="55vh"
            size="large"
          />
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <Navbar />
        <div className="product-detail-container">
          <div
            style={{
              minHeight: "450px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "14px",
            }}
          >
            <h2>{error || "Product Not Found"}</h2>
            <Link
              to="/"
              style={{
                color: "#3643ba",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Return to Homepage
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const images = Array.isArray(product.images)
    ? product.images.filter(Boolean)
    : [];
  const displayImages = images.slice(0, 4);
  const remainingImagesCount = images.length > 4 ? images.length - 4 : 0;

  return (
    <div className="product-detail-page">
      <Navbar />
      <CategoryNav />

      <main className="product-detail-container">
        {/* =====================================================
            MAIN 2-COLUMN GRID (MOSAIC LEFT + BUYBOX RIGHT)
        ===================================================== */}
        <div className="pdp-main-grid">
          {/* LEFT: 2-COLUMN IMAGE MOSAIC (SCREENSHOT 1 & 3) */}
          <div className="pdp-mosaic-container">
            {displayImages.length > 0 ? (
              displayImages.map((img, idx) => (
                <div
                  key={idx}
                  className="pdp-mosaic-item pdp-draggable-mosaic-item"
                  draggable={true}
                  onDragStart={(e) => handleThumbnailDragStart(e, img)}
                  onPointerDown={(e) => handleThumbnailPointerDown(e, img)}
                  title="Drag to Decathlon Fitting Room model to try on"
                >
                  <img
                    src={getImageUrl(img)}
                    alt={`${product.name} view ${idx + 1}`}
                  />
                  <div className="pdp-mosaic-drag-badge">
                    <span>⠿ Drag to Try-On</span>
                  </div>
                  {idx === 3 && remainingImagesCount > 0 && (
                    <span className="pdp-mosaic-badge-more">
                      {remainingImagesCount} more
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div
                className="pdp-mosaic-item"
                style={{
                  gridColumn: "1 / -1",
                  minHeight: "340px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#f4f6f8",
                  color: "#64748b",
                  fontWeight: 600,
                }}
              >
                No product image available
              </div>
            )}
          </div>

          {/* RIGHT: STICKY BUY BOX (SCREENSHOT 1 & 2) */}
          <div className="pdp-buybox-sticky">
            {/* Brand & ID Share */}
            <div className="pdp-brand-row">
              <span className="pdp-brand-text">
                {product.brand || "DOMYOS"}
              </span>
              <div className="pdp-id-share-box">
                <span>
                  ID {product._id?.slice(-7).toUpperCase() || "8404222"}
                </span>
                <button
                  type="button"
                  className="pdp-share-icon-btn"
                  onClick={handleShare}
                  aria-label="Share"
                >
                  <FiShare2 />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="pdp-main-title">{product.name}</h1>

            {/* Rating Line */}
            <div className="pdp-rating-strip">
              <StarRating rating={ratingSummary.averageRating} size={15} />
              <span className="pdp-rating-num">
                {ratingSummary.averageRating > 0
                  ? ratingSummary.averageRating.toFixed(1)
                  : "0.0"}
              </span>
              <span style={{ color: "#ccc" }}>|</span>
              <a href="#customer-reviews" className="pdp-reviews-link-blue">
                {ratingSummary.reviewCount}{" "}
                {ratingSummary.reviewCount === 1 ? "review" : "reviews"}
              </a>
            </div>

            {/* Price Line & History Comparison */}
            <div className="pdp-price-comparison-card">
              {(product?.appliedOffer || priceComparison?.appliedOffer) && (
                <div className="pdp-active-offer-banner">
                  <div className="pdp-offer-badge-tag">
                    <FiTag />{" "}
                    {(product?.appliedOffer || priceComparison?.appliedOffer)
                      .badgeLabel || "Special Offer"}
                  </div>
                  <span className="pdp-offer-title">
                    {
                      (product?.appliedOffer || priceComparison?.appliedOffer)
                        .title
                    }
                  </span>
                  {(product?.appliedOffer || priceComparison?.appliedOffer)
                    .bannerText && (
                    <span className="pdp-offer-subtext">
                      {
                        (product?.appliedOffer || priceComparison?.appliedOffer)
                          .bannerText
                      }
                    </span>
                  )}
                </div>
              )}
              <div className="pdp-price-primary-row">
                <span className="pdp-current-price-val">
                  {formatPrice(currentPrice)}
                </span>
                {originalPrice > currentPrice && (
                  <span className="pdp-mrp-strike-val">
                    MRP {formatPrice(originalPrice)}
                  </span>
                )}
                {discountPercentage > 0 && (
                  <span className="pdp-discount-pill">
                    {discountPercentage}% OFF
                  </span>
                )}
              </div>

              {/* Price differences, discount percentage and savings */}
              <div className="pdp-savings-callout-row">
                {savingsAmount > 0 && (
                  <span className="pdp-save-badge">
                    Save <strong>{formatPrice(savingsAmount)}</strong> (
                    {discountPercentage}%)
                  </span>
                )}

                {priceDropAmount > 0 && (
                  <span className="pdp-price-drop-badge">
                    <FiTrendingDown />
                    <span>
                      Price dropped by{" "}
                      <strong>{formatPrice(priceDropAmount)}</strong>
                    </span>
                  </span>
                )}
              </div>

              {/* Historical Price Comparison Meta & Trend CTA */}
              <div className="pdp-price-meta-strip">
                {previousPrice > 0 && previousPrice !== currentPrice && (
                  <div className="pdp-price-meta-item">
                    <span className="meta-label">Previous:</span>
                    <strong className="meta-val">
                      {formatPrice(previousPrice)}
                    </strong>
                  </div>
                )}

                {lowestPriceIn30Days > 0 && (
                  <div className="pdp-price-meta-item">
                    <span className="meta-label">30-day low:</span>
                    <strong className="meta-val highlight-lowest">
                      {formatPrice(lowestPriceIn30Days)}
                    </strong>
                    {currentPrice <= lowestPriceIn30Days && (
                      <span className="pdp-best-price-tag">Best Price</span>
                    )}
                  </div>
                )}

                <button
                  type="button"
                  className={`pdp-price-track-btn ${isPriceTracking ? "active" : ""}`}
                  onClick={handleOpenPriceAlert}
                  title={
                    isPriceTracking
                      ? "Price tracking active. Click to disable."
                      : "Track price drops and receive instant Web Push alerts"
                  }
                >
                  <FiBell />
                  <span>
                    {isPriceTracking ? "Tracking Active" : "Track Price Drop"}
                  </span>
                </button>

                <button
                  type="button"
                  className="pdp-price-history-btn"
                  onClick={() => setShowPriceHistoryModal(true)}
                  title="View complete historical price changes and trends"
                >
                  <FiClock />
                  <span>Price History & Trends</span>
                </button>
              </div>
            </div>

            {/* Colour Selection */}
            <div className="pdp-colour-section">
              <div className="pdp-colour-header-row">
                <span className="pdp-colour-label">Colour</span>
                <span className="pdp-colour-count-text">
                  {Array.isArray(product.color) && product.color.length > 0
                    ? `${product.color.length} colours`
                    : "4 colours"}
                </span>
              </div>

              <div className="pdp-colour-thumbnails-row">
                {Array.isArray(product.color) && product.color.length > 0
                  ? product.color.map((color, idx) => {
                      const colorImg = images[idx % images.length];
                      return (
                        <button
                          key={idx}
                          type="button"
                          className={`pdp-colour-card-btn ${selectedColor === color ? "active" : ""}`}
                          draggable={Boolean(colorImg)}
                          onDragStart={(e) =>
                            colorImg && handleThumbnailDragStart(e, colorImg, color)
                          }
                          onPointerDown={(e) =>
                            colorImg && handleThumbnailPointerDown(e, colorImg, color)
                          }
                          onClick={() => {
                            setSelectedColor(color);
                            toast.success(`Selected color: ${color}`, {
                              id: "pdp-color-toast",
                            });
                          }}
                          title={`Color: ${color} (Drag onto model to try on)`}
                        >
                          {images.length > 0 ? (
                            <img
                              src={getImageUrl(colorImg)}
                              alt={color}
                            />
                          ) : (
                            <span style={{ fontSize: 11, color: "#64748b" }}>
                              {color}
                            </span>
                          )}
                        </button>
                      );
                    })
                  : [0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`pdp-colour-card-btn ${idx === 0 ? "active" : ""}`}
                      >
                        {images.length > 0 ? (
                          <img
                            src={getImageUrl(images[idx % images.length])}
                            alt={`Color option ${idx + 1}`}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: "#64748b" }}>
                            Option {idx + 1}
                          </span>
                        )}
                      </button>
                    ))}
              </div>
            </div>

            {/* Size Selection */}
            <div className="pdp-size-section">
              <div className="pdp-size-header-row">
                <span className="pdp-size-label-text">Select size</span>
                {Boolean(
                  product.category ||
                  (Array.isArray(product.categories) &&
                    product.categories.length > 0),
                ) && (
                  <button
                    type="button"
                    className="pdp-size-chart-btn"
                    onClick={() => setShowSizeModal(true)}
                    id="pdp-size-guide-trigger"
                    aria-label="Open size guide"
                  >
                    📏 Size Guide
                  </button>
                )}
              </div>

              <div className="pdp-fit-text-muted">
                72% of users say this fits as expected
              </div>

              <div className="pdp-size-boxes-row">
                {Array.isArray(product.size) && product.size.length > 0
                  ? product.size.map((sz, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`pdp-size-btn-rect ${selectedSize === sz ? "active" : ""}`}
                        onClick={() => {
                          setSelectedSize(sz);
                          toast.success(`Selected size: ${sz}`, {
                            id: "pdp-size-toast",
                          });
                        }}
                      >
                        {sz}
                      </button>
                    ))
                  : ["S", "M", "L", "XL", "2XL"].map((sz, idx) => (
                      <button
                        key={sz}
                        type="button"
                        className={`pdp-size-btn-rect ${selectedSize === sz || (!selectedSize && idx === 0) ? "active" : ""}`}
                        onClick={() => {
                          setSelectedSize(sz);
                          toast.success(`Selected size: ${sz}`, {
                            id: "pdp-size-toast",
                          });
                        }}
                      >
                        {sz}
                      </button>
                    ))}
              </div>

              {/* Decathlon Fitting Room Trigger - Exactly below Select size and above Add to cart */}
              {isClothingProduct(product) && (
                <button
                  type="button"
                  className="pdp-fitting-room-trigger-btn"
                  onClick={() => setIsFittingRoomOpen(true)}
                  id="pdp-virtual-tryon-trigger"
                  aria-label="Open Decathlon Fitting Room"
                >
                  <span className="pdp-sparkle-emoji">✨</span> Decathlon Fitting Room
                </button>
              )}
            </div>

            {/* Action Buttons: Wishlist + Add to Cart OR Notify Me When Available */}
            {Number(product.stock || 0) <= 0 ? (
              <NotifyMe
                productId={product._id}
                product={product}
                isWishlisted={isWishlisted(product._id)}
                onToggleWishlist={() => handleToggle(product._id, product)}
              />
            ) : (
              <div className="pdp-actions-row">
                <button
                  type="button"
                  className={`pdp-heart-btn ${isWishlisted(product._id) ? "active" : ""}`}
                  onClick={() => handleToggle(product._id, product)}
                  aria-label="Wishlist"
                >
                  {isWishlisted(product._id) ? (
                    <MdFavorite />
                  ) : (
                    <MdFavoriteBorder />
                  )}
                </button>

                <button
                  type="button"
                  className="pdp-add-cart-btn-decathlon"
                  onClick={() => handleAddToCart(product)}
                  disabled={addingToCart}
                >
                  {addingToCart ? "Adding..." : "Add to cart"}
                </button>
              </div>
            )}

            {/* Guarantees Strip */}
            <div className="pdp-guarantees-strip">
              <div className="pdp-guarantee-line">
                <div className="pdp-guarantee-item">
                  <FiShield /> <span>2 year warranty</span>
                </div>
                <div className="pdp-guarantee-item">
                  <span>🇮🇳</span> <span>Made In India</span>
                </div>
              </div>
              <div className="pdp-guarantee-line">
                <div className="pdp-guarantee-item">
                  <FiRotateCcw style={{ color: "#f57c00" }} />{" "}
                  <span>30 days return</span>
                </div>
              </div>
            </div>

            {/* Delivery & Services Box */}
            <div className="pdp-delivery-card-box">
              <div className="pdp-delivery-title-bold">Delivery & services</div>
              <div className="pdp-sold-by-subtext">
                Sold and fulfilled by: Decathlon Sports India Pvt Ltd
              </div>

              <div className="pdp-pincode-input-frame">
                <input
                  type="text"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) =>
                    setPincode(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="560001"
                />
                <button
                  type="button"
                  className="pdp-pincode-edit-btn"
                  onClick={handleCheckPincode}
                  aria-label="Edit Pincode"
                >
                  <FiEdit2 />
                </button>
              </div>

              <div className="pdp-service-bullet-row">
                <span className="pdp-green-dot"></span>
                <div className="pdp-bullet-content">
                  <strong>Standard delivery by {deliveryDateString}</strong>
                  <span className="pdp-green-order-timer">
                    Order within 8hrs 8mins
                  </span>
                </div>
              </div>

              <div className="pdp-service-bullet-row">
                <span className="pdp-green-dot"></span>
                <div className="pdp-bullet-content">
                  <strong>Pick up from store within 2 Hours for FREE</strong>
                  <span
                    className="pdp-view-stores-link"
                    onClick={() =>
                      toast("Pickup available at nearest Decathlon store")
                    }
                  >
                    View stores
                  </span>
                </div>
              </div>

              <div className="pdp-pod-line">
                <span className="pdp-green-dot"></span>
                <span>Pay on Delivery available *</span>
              </div>
            </div>
          </div>
        </div>

        {/* =====================================================
            BENEFITS SECTION (SCREENSHOT 3 & 4)
        ===================================================== */}
        <section
          className="pdp-benefits-section-decathlon"
          id="benefits-section"
        >
          <h3>Benefits</h3>

          <div className="pdp-benefits-cards-grid">
            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiLayers />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Pockets</h4>
                <p>Two large zip pockets on the sides.</p>
              </div>
            </div>

            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiWind />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Ventilation</h4>
                <p>Mesh panel at the back for ventilation.</p>
              </div>
            </div>

            <div className="pdp-benefit-grey-box">
              <div className="pdp-benefit-icon-wrap">
                <FiDroplet />
              </div>
              <div className="pdp-benefit-copy">
                <h4>Moisture Management</h4>
                <p>Breathable, quick-drying fabric to keep you dry.</p>
              </div>
            </div>
          </div>

          {/* 2-Column Accordion Triggers (Screenshot 4) */}
          <div className="pdp-accordion-two-columns">
            <div>
              <div
                className="pdp-accordion-trigger-row"
                onClick={() =>
                  setOpenAccordion(
                    openAccordion === "details" ? null : "details",
                  )
                }
              >
                <span className="trigger-title">Product details</span>
                <FiChevronRight />
              </div>

              <div
                className="pdp-accordion-trigger-row"
                onClick={() =>
                  setOpenAccordion(openAccordion === "tech" ? null : "tech")
                }
              >
                <span className="trigger-title">Technical information</span>
                <FiChevronRight />
              </div>
            </div>

            <div>
              <div
                className="pdp-accordion-trigger-row"
                onClick={() =>
                  setOpenAccordion(openAccordion === "specs" ? null : "specs")
                }
              >
                <span className="trigger-title">Product specifications</span>
                <FiChevronRight />
              </div>
            </div>

            {openAccordion && (
              <div className="pdp-drawer-content-pane">
                {openAccordion === "details" && (
                  <p>
                    {product.description ||
                      "Our passionate gym team developed these lightweight trackpants for regular gym cardio training. The ergonomic cut provides absolute ease of movement."}
                  </p>
                )}
                {openAccordion === "specs" && (
                  <div>
                    <strong>Main fabric:</strong> 100% Recycled Polyester |{" "}
                    <strong>Fit:</strong> Slim Fit / Jogger Style |{" "}
                    <strong>Brand:</strong> {product.brand || "DOMYOS"} |{" "}
                    <strong>Model Code:</strong> 8404222
                  </div>
                )}
                {openAccordion === "tech" && (
                  <div>
                    <strong>Care Advice:</strong> Wash inside out at 30Â°C.
                    Quick-dry synthetic mesh. Do not dry clean or bleach.
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* =====================================================
            "KNOW YOUR PRODUCT" BLACK BANNER (SCREENSHOT 4)
        ===================================================== */}
        <section className="pdp-know-product-section">
          <h2>Know your Product</h2>
          <p className="subtext">
            Our products are built to elevate experience and drive you to your
            full potential with comfort and ease like never before
          </p>

          <div className="pdp-know-grid">
            <div className="pdp-know-tile">
              <span className="pill">Fabric used</span>
              <h4>Breathable & Quick-Dry</h4>
              <p>Breathable, quick-drying fabric to keep you dry.</p>
            </div>

            <div className="pdp-know-tile">
              <span className="pill">Airy</span>
              <h4>Mesh panel at back</h4>
              <p>Mesh panel at the back for ventilation.</p>
            </div>

            <div className="pdp-know-tile">
              <span className="pill">Storage</span>
              <h4>Two large zip pockets</h4>
              <p>Two large zip pockets on the sides.</p>
            </div>
          </div>
        </section>

        {/* =====================================================
            RELATED PRODUCTS ("You May Also Like" - Live API)
        ===================================================== */}
        <RelatedProducts productId={id} title="You May Also Like" />

        {/* =====================================================
            CUSTOMER REVIEWS & BREAKDOWN (Live API)
        ===================================================== */}
        <ProductReviews
          productId={id}
          product={product}
          onRatingUpdate={handleRatingUpdate}
        />

        {/* =====================================================
            BOTTOM PERKS STRIP (PDF Page 10)
        ===================================================== */}
        <div className="pdp-perks-bottom-strip">
          <div className="pdp-perk-node">Easy Returns*</div>
          <div className="pdp-perk-node">Collect in-store</div>
          <div className="pdp-perk-node">Express Delivery*</div>
          <div className="pdp-perk-node">1 Mn+ happy customers</div>
          <div className="pdp-perk-node">We buy back</div>
        </div>
      </main>

      {/* =====================================================
          CATEGORY-BASED SIZE GUIDE MODAL
      ===================================================== */}
      {showSizeModal && (
        <SizeGuide
          product={product}
          categoryId={
            product.category?._id ||
            product.category ||
            (Array.isArray(product.categories) && product.categories[0]?._id) ||
            (Array.isArray(product.categories) && product.categories[0])
          }
          gender={product.gender}
          isOpen={showSizeModal}
          onClose={() => setShowSizeModal(false)}
        />
      )}

      {/* Price Alert & Web Push Modal */}
      {showPriceAlertModal && (
        <div
          className="pdp-modal-overlay"
          onClick={() => setShowPriceAlertModal(false)}
        >
          <div
            className="pdp-price-alert-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdp-modal-header">
              <div className="modal-header-titles">
                <h3>Track Price Drop & Web Push Alerts</h3>
                <p>{product.name}</p>
              </div>
              <button
                type="button"
                className="modal-close-icon-btn"
                onClick={() => setShowPriceAlertModal(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSavePriceAlert} className="pdp-alert-form">
              <div className="alert-price-preview">
                <div className="alert-price-box">
                  <span className="box-label">Current Selling Price</span>
                  <strong className="box-val">
                    {formatPrice(currentPrice)}
                  </strong>
                </div>
                <div className="alert-arrow">➔</div>
                <div className="alert-price-box target">
                  <span className="box-label">Alert Below Target</span>
                  <strong className="box-val">
                    {formatPrice(targetPriceInput || currentPrice)}
                  </strong>
                </div>
              </div>

              <div className="pdp-alert-field">
                <label>Notify me when price drops to or below (₹)</label>
                <input
                  type="number"
                  min="1"
                  max={currentPrice}
                  value={targetPriceInput}
                  onChange={(e) => setTargetPriceInput(e.target.value)}
                  placeholder={`e.g. ${Math.round(currentPrice * 0.9)}`}
                  required
                />
                <small>
                  Leave as default or set a custom target price threshold.
                </small>
              </div>

              <div className="pdp-alert-field">
                <label>Email Address</label>
                <input
                  type="email"
                  value={alertEmailInput}
                  onChange={(e) => setAlertEmailInput(e.target.value)}
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div className="pdp-webpush-callout">
                <div className="callout-icon">🔔</div>
                <div>
                  <strong>Instant Web Push Alerts Included</strong>
                  <p>
                    When you click 'Enable Price Alerts', your browser will ask
                    to allow notifications so you get native OS alerts instantly
                    on this device even if the browser is minimized.
                  </p>
                </div>
              </div>

              <div className="pdp-modal-actions">
                <button
                  type="button"
                  className="pdp-modal-cancel-btn"
                  onClick={() => setShowPriceAlertModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pdp-modal-submit-btn"
                  disabled={settingAlert}
                >
                  {settingAlert ? "Enabling..." : "Enable Price Alerts"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price History & Trends Modal */}
      {showPriceHistoryModal && (
        <div
          className="pdp-modal-overlay"
          onClick={() => setShowPriceHistoryModal(false)}
        >
          <div
            className="pdp-price-history-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pdp-modal-header">
              <div className="modal-header-titles">
                <h3>Price History & Comparison</h3>
                <p>{product.name}</p>
              </div>
              <button
                type="button"
                className="pdp-modal-close-btn"
                onClick={() => setShowPriceHistoryModal(false)}
                title="Close"
              >
                <FiX />
              </button>
            </div>

            <div className="pdp-history-summary-grid">
              <div className="summary-stat-box">
                <span className="stat-label">Current Selling Price</span>
                <strong className="stat-value current">
                  {formatPrice(currentPrice)}
                </strong>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">Original MRP</span>
                <strong className="stat-value">
                  {formatPrice(originalPrice)}
                </strong>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">Previous Price</span>
                <strong className="stat-value">
                  {formatPrice(previousPrice)}
                </strong>
              </div>
              <div className="summary-stat-box">
                <span className="stat-label">30-Day Lowest</span>
                <strong className="stat-value lowest">
                  {formatPrice(lowestPriceIn30Days)}
                </strong>
              </div>
            </div>

            <div className="pdp-history-timeline-section">
              {/* Visual Interactive Price Trend Graph */}
              <PriceHistoryChart
                history={priceHistoryTimeline}
                originalPrice={originalPrice}
                currentPrice={currentPrice}
              />

              <h4>Historical Product Pricing Records</h4>
              <p className="timeline-subtitle">
                Track price adjustments over time to make informed purchasing
                decisions
              </p>

              <div className="pdp-timeline-list">
                {priceHistoryTimeline.map((item, index) => {
                  const effPrice = item.effectivePrice || item.price;
                  const percentOfMRP = Math.round(
                    (effPrice / (originalPrice || 1)) * 100,
                  );
                  const isCurrent = index === priceHistoryTimeline.length - 1;

                  return (
                    <div
                      key={index}
                      className={`pdp-timeline-item ${isCurrent ? "current" : ""}`}
                    >
                      <div className="timeline-date-col">
                        <span className="timeline-date">
                          {new Date(item.effectiveDate).toLocaleDateString(
                            "en-IN",
                            {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            },
                          )}
                        </span>
                        <span className="timeline-reason">
                          {item.reason || "Price update"}
                        </span>
                      </div>

                      <div className="timeline-bar-col">
                        <div className="timeline-progress-track">
                          <div
                            className={`timeline-progress-fill ${isCurrent ? "current" : ""}`}
                            style={{
                              width: `${Math.min(100, Math.max(15, percentOfMRP))}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="timeline-price-col">
                        <strong className="timeline-price-val">
                          {formatPrice(effPrice)}
                        </strong>
                        {isCurrent && (
                          <span className="timeline-current-pill">Current</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pdp-history-footer">
              <span className="history-transparency-note">
                <FiInfo /> Historical pricing recorded from verified Decathlon
                catalog adjustments.
              </span>
              <button
                type="button"
                className="pdp-history-close-action"
                onClick={() => setShowPriceHistoryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Virtual Try-On Modal */}
      {(() => {
        const selectedColorIndex =
          Array.isArray(product?.color) && selectedColor
            ? product.color.indexOf(selectedColor)
            : -1;
        const activeGarmentImageUrl =
          initialDroppedGarment ||
          (selectedColorIndex >= 0 && images[selectedColorIndex]
            ? getImageUrl(images[selectedColorIndex])
            : images[0]
              ? getImageUrl(images[0])
              : product?.image
                ? getImageUrl(product.image)
                : "");

        return (
          <VirtualTryOnModal
            isOpen={showTryOnModal}
            onClose={() => {
              setShowTryOnModal(false);
              setInitialDroppedGarment(null);
            }}
            product={product}
            selectedGarmentImage={activeGarmentImageUrl}
            selectedColor={selectedColor}
            onAddToCart={() => handleAddToCart(product)}
            initialDroppedGarment={initialDroppedGarment}
          />
        );
      })()}

      {/* Decathlon Fitting Room Modal */}
      <FittingRoomModal
        isOpen={isFittingRoomOpen}
        onClose={() => setIsFittingRoomOpen(false)}
        product={product}
        selectedGarmentImage={
          Array.isArray(product?.color) &&
          selectedColor &&
          product.color.indexOf(selectedColor) >= 0 &&
          images[product.color.indexOf(selectedColor)]
            ? getImageUrl(images[product.color.indexOf(selectedColor)])
            : images[0]
            ? getImageUrl(images[0])
            : product?.image
            ? getImageUrl(product.image)
            : ""
        }
        selectedColor={selectedColor}
      />

      {/* Floating Touch Drag Avatar for Mobile */}
      {activeDragItem && (
        <div
          className="pdp-touch-drag-avatar"
          style={{
            position: "fixed",
            left: `${touchPointerPos.x - 30}px`,
            top: `${touchPointerPos.y - 30}px`,
            pointerEvents: "none",
            zIndex: 9999999,
          }}
        >
          <img
            src={activeDragItem.imageUrl}
            alt="Dragging"
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "12px",
              objectFit: "cover",
              border: "2.5px solid #0082c3",
              boxShadow: "0 8px 24px rgba(0, 130, 195, 0.4)",
              background: "#fff",
            }}
          />
        </div>
      )}

      <Footer />
    </div>
  );
};

export default ProductDetail;
