import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  FiSearch,
  FiUser,
  FiMapPin,
  FiHelpCircle,
  FiHeart,
  FiShoppingBag,
  FiShoppingCart,
  FiCreditCard,
  FiAward,
  FiMail,
  FiLogOut,
  FiMonitor,
  FiMessageSquare,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiGrid,
  FiEdit2,
  FiBell,
  FiPackage,
} from "react-icons/fi";
import socket from "../socket/socket";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api, {
  isTokenExpired,
  handleAutoLogout,
  useWishlist,
} from "../api/axios";
import DecathlonLogo from "./DecathlonLogo";
import ProductSizeModal from "./ProductSizeModal";
import LocationPickerModal from "./LocationPickerModal";
import { useDeliveryLocation } from "../utils/deliveryLocation";
import "../styles/Navbar.css";
import "../styles/ProductSizeModal.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWishlisted, handleToggle: toggleWishlistIcon } = useWishlist();
  const { location: deliveryLocation, detecting: detectingLocation } = useDeliveryLocation({
    autoDetect: true,
  });
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

  // NOTIFICATION STATES
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const notificationRef = useRef(null);

  // DECATHLON SEARCH MODAL STATES
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ products: [], categories: [] });
  const [popularProducts, setPopularProducts] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [popularSlideIndex, setPopularSlideIndex] = useState(0);
  const [topProductsSlideIndex, setTopProductsSlideIndex] = useState(0);

  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem("decathlon_recent_searches");
      return saved ? JSON.parse(saved) : ["Bags"];
    } catch {
      return ["Bags"];
    }
  });

  const trendingSearches = [
    "Rain coats",
    "Shoes for men",
    "Cycles",
    "Bags",
    "Jackets",
    "Yoga mat",
    "Track pants",
    "Tent",
    "Football",
  ];

  const searchContainerRef = useRef(null);
  const accountContainerRef = useRef(null);
  const [accountDropdownOpen, setAccountDropdownOpen] = useState(false);

  useEffect(() => {
    const handleOutside = (e) => {
      if (accountContainerRef.current && !accountContainerRef.current.contains(e.target)) {
        setAccountDropdownOpen(false);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  // PRODUCT MODAL STATES FOR ADD TO CART FROM SEARCH
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const accountTab = new URLSearchParams(location.search).get("tab");
  const isOrdersPage =
    location.pathname.startsWith("/account/orders-returns") ||
    (location.pathname === "/account" &&
      (accountTab === "orders" || accountTab === "order-returns" || accountTab === "address"));

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

  const formatPrice = (price) => {
    return `₹${Number(price || 0).toLocaleString("en-IN")}`;
  };

  const loadUser = () => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser) {
      if (isTokenExpired(token)) {
        handleAutoLogout();
        setUser(null);
        return;
      }
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("User data error:", error);
        setUser(null);
      }
    } else {
      setUser(null);
    }
  };

  const fetchCartCount = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setCartCount(0);
      return;
    }
    try {
      const response = await api.get("/cart", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const items = response.data.cart?.items || [];
      const count = items.reduce((total, item) => total + (item.quantity || 1), 0);
      setCartCount(count);
    } catch (error) {
      console.error("Navbar Fetch Cart Error:", error);
      setCartCount(0);
    }
  };

  // FETCH NOTIFICATIONS
  const fetchNotifications = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token || isTokenExpired(token)) {
      setNotifications([]);
      setUnreadNotificationsCount(0);
      return;
    }

    try {
      setLoadingNotifications(true);
      const res = await api.get("/notifications?limit=20");
      const list = res.data?.notifications || [];
      setNotifications(list);
      setUnreadNotificationsCount(
        res.data?.unreadCount !== undefined
          ? res.data.unreadCount
          : list.filter((n) => !n.read).length
      );
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Navbar Notifications Error:", err);
      }
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadNotificationsCount(0);
      toast.success("All notifications marked as read");
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleNotificationItemClick = async (notif) => {
    if (!notif.read && notif._id) {
      try {
        await api.patch(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error("Mark read error:", err);
      }
    }
    setShowNotifications(false);
    if (notif.url) {
      navigate(notif.url);
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "RESTOCK":
      case "STOCK":
        return <FiBell style={{ color: "#2563eb" }} />;
      case "ORDER":
      case "ORDER_PLACED":
      case "ORDER_DELIVERED":
        return <FiPackage style={{ color: "#16a34a" }} />;
      case "OFFER":
        return <FiAward style={{ color: "#ea580c" }} />;
      default:
        return <FiBell style={{ color: "#3643ba" }} />;
    }
  };

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(e.target)
      ) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  // FETCH POPULAR PRODUCTS FOR SEARCH MODAL
  useEffect(() => {
    const fetchPopular = async () => {
      try {
        const response = await api.get("/products?limit=10");
        setPopularProducts(response.data.products || []);
      } catch (error) {
        console.error("Fetch Popular Search Products Error:", error);
      }
    };
    fetchPopular();
  }, []);

  useEffect(() => {
    loadUser();
    fetchCartCount();
    fetchNotifications();

    const handleAuthChange = () => {
      loadUser();
      fetchCartCount();
      fetchNotifications();
    };

    const handleCartChange = () => {
      fetchCartCount();
    };

    const handleNewNotification = (newNotif) => {
      if (newNotif) {
        setNotifications((prev) => [newNotif, ...prev]);
        setUnreadNotificationsCount((prev) => prev + 1);
        toast((t) => (
          <div
            style={{ cursor: "pointer" }}
            onClick={() => {
              toast.dismiss(t.id);
              if (newNotif.url) navigate(newNotif.url);
            }}
          >
            <div style={{ fontWeight: 700, fontSize: "13px" }}>{newNotif.title}</div>
            <div style={{ fontSize: "12px", color: "#555" }}>{newNotif.message}</div>
          </div>
        ), { icon: "🔔", duration: 5000 });
      }
    };

    const handleRestock = () => {
      fetchNotifications();
    };

    window.addEventListener("authChanged", handleAuthChange);
    window.addEventListener("cartUpdated", handleCartChange);
    window.addEventListener("notificationsUpdated", fetchNotifications);

    socket.on("notification", handleNewNotification);
    socket.on("product_restocked", handleRestock);

    const handleOpenLocationModal = () => setLocationModalOpen(true);
    window.addEventListener("openLocationModal", handleOpenLocationModal);

    return () => {
      window.removeEventListener("openLocationModal", handleOpenLocationModal);
      window.removeEventListener("authChanged", handleAuthChange);
      window.removeEventListener("cartUpdated", handleCartChange);
      window.removeEventListener("notificationsUpdated", fetchNotifications);
      socket.off("notification", handleNewNotification);
      socket.off("product_restocked", handleRestock);
    };
  }, [fetchNotifications, navigate]);

  // DEBOUNCED SEARCH API CALL
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ products: [], categories: [] });
      setTopProductsSlideIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await api.get(
          `/products?search=${encodeURIComponent(searchQuery.trim())}`
        );
        setSearchResults({
          products: response.data.products || [],
          categories: response.data.categories || [],
        });
        setTopProductsSlideIndex(0);
      } catch (error) {
        console.error("Search API Error:", error);
        setSearchResults({ products: [], categories: [] });
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // OUTSIDE CLICK LISTENER TO CLOSE SEARCH MODAL
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setUser(null);
    setCartCount(0);

    window.dispatchEvent(new Event("authChanged"));
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchResults({ products: [], categories: [] });
  };

  const handleSearchSubmit = (term) => {
    const q = (term !== undefined ? term : searchQuery).trim();
    if (!q) return;
    setIsSearchFocused(false);

    // SAVE TO RECENT SEARCHES
    setRecentSearches((prev) => {
      const updated = [q, ...prev.filter((t) => t !== q)].slice(0, 5);
      try {
        localStorage.setItem("decathlon_recent_searches", JSON.stringify(updated));
      } catch {}
      return updated;
    });

    navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleSelectKeyword = (term) => {
    handleSearchSubmit(term);
  };

  const handleSelectProduct = (product) => {
    setIsSearchFocused(false);
    navigate(`/product/${product._id}`);
  };

  const handleCloseModal = () => {
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
      toast.error("Please login first");
      return;
    }

    const sizes = Array.isArray(selectedProduct.size) ? selectedProduct.size : [];

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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success(response?.data?.message || "Product added to cart");
      window.dispatchEvent(new Event("cartUpdated"));

      setSelectedProduct(null);
      setSelectedSize("");
      setSelectedColor("");
      setQuantity(1);
    } catch (error) {
      console.error("ADD TO CART ERROR:", error);
      if (error?.response?.status === 401) {
        toast.error("Please login again");
        return;
      }
      toast.error(error?.response?.data?.message || "Failed to add product to cart");
    } finally {
      setAdding(false);
    }
  };

  // SUGGESTIONS LIST DERIVED DYNAMICALLY FROM MATCHED CATEGORIES AND PRODUCTS
  const suggestedQueries = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return [];

    const suggestions = new Set();
    suggestions.add(q);

    // Add matching category names
    if (Array.isArray(searchResults.categories)) {
      searchResults.categories.forEach((cat) => {
        if (cat.name) suggestions.add(cat.name);
      });
    }

    // Add matching top product names
    if (Array.isArray(searchResults.products)) {
      searchResults.products.slice(0, 3).forEach((prod) => {
        if (prod.name) suggestions.add(prod.name);
      });
    }

    return Array.from(suggestions).slice(0, 6);
  }, [searchQuery, searchResults]);

  const popularVisibleCount = 3;
  const maxPopularSlide = Math.max(popularProducts.length - popularVisibleCount, 0);

  const topProductsVisibleCount = 3;
  const maxTopProductsSlide = Math.max(
    (searchResults.products?.length || 0) - topProductsVisibleCount,
    0
  );

  return (
    <>
      {/* SCREEN BACKDROP OVERLAY WHEN SEARCH IS ACTIVE */}
      {isSearchFocused && (
        <div
          className="search-modal-backdrop"
          onClick={() => setIsSearchFocused(false)}
        />
      )}

      <header className="navbar-wrapper">
        <div className={`navbar ${isOrdersPage ? "orders-navbar" : ""}`}>
          {/* LOGO */}
          <Link to="/" className="navbar-logo" aria-label="Decathlon Home">
            <DecathlonLogo className="decathlon-official-logo" height={26} />
          </Link>

          {/* SEARCH BAR CONTAINER */}
          <div
            className={`navbar-search ${isSearchFocused ? "search-active" : ""}`}
            ref={searchContainerRef}
          >
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearchSubmit();
                }
              }}
              placeholder={
                isOrdersPage
                  ? 'Search for "Cricket Bat"...'
                  : "Search for 60+ sports and 6,000+ products"
              }
            />
            {searchQuery ? (
              <FiX className="search-clear-icon" onClick={handleClearSearch} />
            ) : (
              <span className="search-cursor"></span>
            )}

            {/* DECATHLON SEARCH MODAL POPOVER */}
            {isSearchFocused && (
              <div className="decathlon-search-modal">
                {/* 1. WHEN SEARCH QUERY IS EMPTY */}
                {!searchQuery.trim() && (
                  <div className="search-modal-content">
                    {/* RECENT SEARCHES */}
                    {recentSearches.length > 0 && (
                      <div className="search-modal-section">
                        <div className="search-modal-section-title">
                          <span>Recent searches</span>
                          <FiEdit2 className="search-edit-icon" />
                        </div>
                        <div className="search-recent-grid">
                          {recentSearches.map((term, idx) => (
                            <div
                              key={idx}
                              className="search-recent-card"
                              onClick={() => handleSelectKeyword(term)}
                            >
                              <div className="search-recent-img">
                                {popularProducts[idx]?.images?.[0] ? (
                                  <img
                                    src={getImageUrl(popularProducts[idx].images[0])}
                                    alt={term}
                                  />
                                ) : (
                                  <FiGrid />
                                )}
                              </div>
                              <span>{term}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* TRENDING SEARCHES */}
                    <div className="search-modal-section">
                      <div className="search-modal-section-title">
                        <span>Trending searches</span>
                      </div>
                      <div className="search-trending-pills">
                        {trendingSearches.map((term, idx) => (
                          <button
                            key={idx}
                            type="button"
                            className="trending-pill-btn"
                            onClick={() => handleSelectKeyword(term)}
                          >
                            {term}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* MOST POPULAR CAROUSEL */}
                    {popularProducts.length > 0 && (
                      <div className="search-modal-section">
                        <div className="search-modal-section-header">
                          <h3>Most Popular</h3>
                          <div className="search-slider-arrows">
                            <button
                              type="button"
                              onClick={() =>
                                setPopularSlideIndex((prev) => Math.max(prev - 1, 0))
                              }
                              disabled={popularSlideIndex === 0}
                            >
                              <FiChevronLeft />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setPopularSlideIndex((prev) =>
                                  Math.min(prev + 1, maxPopularSlide)
                                )
                              }
                              disabled={popularSlideIndex === maxPopularSlide}
                            >
                              <FiChevronRight />
                            </button>
                          </div>
                        </div>

                        <div className="search-slider-viewport">
                          <div
                            className="search-slider-track"
                            style={{
                              transform: `translateX(-${popularSlideIndex * 33.33}%)`,
                            }}
                          >
                            {popularProducts.map((prod) => (
                              <div
                                key={prod._id}
                                className="search-product-card"
                                onClick={() => handleSelectProduct(prod)}
                              >
                                <div className="search-product-img-wrapper">
                                  {prod.discountPrice > 0 && (
                                    <span className="search-badge sale">Sale</span>
                                  )}
                                  {prod.images?.[0] ? (
                                    <img
                                      src={getImageUrl(prod.images[0])}
                                      alt={prod.name}
                                    />
                                  ) : (
                                    <div className="search-card-no-img">No Img</div>
                                  )}
                                </div>

                                <div className="search-product-details">
                                  <div className="search-product-title">
                                    <strong>{prod.brand || "DECATHLON"}</strong>{" "}
                                    {prod.name}
                                  </div>
                                  <div className="search-product-rating">
                                    <span className="stars">★★★★★</span>
                                    <span className="count">{prod.reviews || "4.3k"}</span>
                                  </div>
                                  <div className="search-product-price-row">
                                    <strong className="current-price">
                                      {formatPrice(prod.discountPrice || prod.price)}
                                    </strong>
                                    {prod.price > (prod.discountPrice || 0) &&
                                      prod.discountPrice > 0 && (
                                        <span className="mrp-price">
                                          MRP {formatPrice(prod.price)}
                                        </span>
                                      )}
                                  </div>
                                  <div className="search-product-actions">
                                    <button
                                      type="button"
                                      className={`search-wishlist-btn ${
                                        isWishlisted(prod._id) ? "active" : ""
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWishlistIcon(prod._id);
                                      }}
                                    >
                                      {isWishlisted(prod._id) ? "♥" : "♡"}
                                    </button>
                                    <button
                                      type="button"
                                      className="search-add-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectProduct(prod);
                                      }}
                                    >
                                      Add to cart
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. WHEN SEARCH QUERY HAS TYPED TEXT */}
                {searchQuery.trim() && (
                  <div className="search-modal-content">
                    {/* SUGGESTED CATEGORIES & KEYWORDS */}
                    <div className="search-modal-section">
                      <div className="search-modal-section-title">
                        <span>Suggested</span>
                      </div>
                      <div className="search-suggestions-list">
                        {suggestedQueries.map((item, idx) => (
                          <div
                            key={idx}
                            className="suggestion-row"
                            onClick={() => handleSelectKeyword(item)}
                          >
                            <FiGrid className="suggestion-icon" />
                            <span>{item}</span>
                          </div>
                        ))}
                        <div
                          className="suggestion-row all-results-row"
                          onClick={() => handleSelectKeyword(searchQuery)}
                        >
                          <FiSearch className="suggestion-icon" />
                          <span>All results for "{searchQuery}"</span>
                        </div>
                      </div>
                    </div>

                    {/* TOP PRODUCTS CAROUSEL */}
                    <div className="search-modal-section">
                      <div className="search-modal-section-header">
                        <h3>Top products</h3>
                        {searchResults.products?.length > topProductsVisibleCount && (
                          <div className="search-slider-arrows">
                            <button
                              type="button"
                              onClick={() =>
                                setTopProductsSlideIndex((prev) =>
                                  Math.max(prev - 1, 0)
                                )
                              }
                              disabled={topProductsSlideIndex === 0}
                            >
                              <FiChevronLeft />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setTopProductsSlideIndex((prev) =>
                                  Math.min(prev + 1, maxTopProductsSlide)
                                )
                              }
                              disabled={
                                topProductsSlideIndex === maxTopProductsSlide
                              }
                            >
                              <FiChevronRight />
                            </button>
                          </div>
                        )}
                      </div>

                      {isSearching ? (
                        <div className="search-loading-state">
                          <div className="search-spinner"></div>
                          <span>Fetching products...</span>
                        </div>
                      ) : searchResults.products?.length === 0 ? (
                        <div className="search-empty-state">
                          No matching products found for "<strong>{searchQuery}</strong>"
                        </div>
                      ) : (
                        <div className="search-slider-viewport">
                          <div
                            className="search-slider-track"
                            style={{
                              transform: `translateX(-${
                                topProductsSlideIndex * 33.33
                              }%)`,
                            }}
                          >
                            {searchResults.products.map((prod) => (
                              <div
                                key={prod._id}
                                className="search-product-card"
                                onClick={() => handleSelectProduct(prod)}
                              >
                                <div className="search-product-img-wrapper">
                                  {prod.discountPrice > 0 ? (
                                    <span className="search-badge sale">
                                      Sale
                                    </span>
                                  ) : (
                                    <span className="search-badge price-drop">
                                      Price drop
                                    </span>
                                  )}
                                  {prod.images?.[0] ? (
                                    <img
                                      src={getImageUrl(prod.images[0])}
                                      alt={prod.name}
                                    />
                                  ) : (
                                    <div className="search-card-no-img">
                                      No Img
                                    </div>
                                  )}
                                </div>

                                <div className="search-product-details">
                                  <div className="search-product-title">
                                    <strong>{prod.brand || "QUECHUA"}</strong>{" "}
                                    {prod.name}
                                  </div>

                                  <div className="search-product-rating">
                                    <span className="stars">★★★★★</span>
                                    <span className="count">
                                      {prod.reviews || "570"}
                                    </span>
                                  </div>

                                  <div className="search-product-price-row">
                                    <strong className="current-price">
                                      {formatPrice(
                                        prod.discountPrice || prod.price
                                      )}
                                    </strong>
                                    {prod.discountPrice > 0 && prod.price > prod.discountPrice && (
                                      <span className="discount-off">
                                        {Math.round(
                                          ((prod.price - prod.discountPrice) /
                                            prod.price) *
                                            100
                                        )}
                                        % off
                                      </span>
                                    )}
                                  </div>

                                  {prod.price > (prod.discountPrice || 0) &&
                                    prod.discountPrice > 0 && (
                                      <div className="mrp-subtext">
                                        MRP {formatPrice(prod.price)}
                                      </div>
                                    )}

                                  <div className="search-product-actions">
                                    <button
                                      type="button"
                                      className={`search-wishlist-btn ${
                                        isWishlisted(prod._id) ? "active" : ""
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleWishlistIcon(prod._id);
                                      }}
                                    >
                                      {isWishlisted(prod._id) ? "♥" : "♡"}
                                    </button>
                                    <button
                                      type="button"
                                      className="search-add-btn"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectProduct(prod);
                                      }}
                                    >
                                      Add to cart
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="explore-all-link">
                        <span onClick={() => handleSelectKeyword(searchQuery)}>
                          Explore all products matching "{searchQuery}"
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ORDERS PAGE DELIVERY LOCATION */}
          {isOrdersPage && (
            <div className="orders-delivery-location">
              <span>Delivery Location</span>
              <strong>
                174026 <em>CHANGE</em>
              </strong>
            </div>
          )}

          {/* RIGHT ACTIONS */}
          <nav className="navbar-actions">
            {/* ACCOUNT */}
            <div
              className={`navbar-account ${accountDropdownOpen ? "account-open" : ""}`}
              ref={accountContainerRef}
            >
              <Link
                to={user ? "/account" : "/login"}
                className="navbar-action account-button"
                onClick={(e) => {
                  if (
                    user &&
                    !window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
                    !accountDropdownOpen
                  ) {
                    e.preventDefault();
                    setAccountDropdownOpen(true);
                  } else {
                    setAccountDropdownOpen(false);
                  }
                }}
              >
                <FiUser />
                <span>{user ? "Account" : "Sign In"}</span>
              </Link>

              {user && (
                <div className="account-dropdown" onClick={() => setAccountDropdownOpen(false)}>
                  <Link to="/profile" className="account-dropdown-item">
                    <FiUser />
                    <span>My Profile</span>
                  </Link>

                  <Link
                    to="/account/orders-returns?tab=order-returns"
                    className="account-dropdown-item"
                  >
                    <FiShoppingCart />
                    <span>Orders & Returns</span>
                  </Link>

                  <Link to="/account" className="account-dropdown-item">
                    <FiCreditCard />
                    <span>Wallet</span>
                  </Link>

                  <Link to="/account" className="account-dropdown-item">
                    <FiAward />
                    <span>Sporty Rewards</span>
                  </Link>

                  <Link to="/account?tab=address" className="account-dropdown-item">
                    <FiMail />
                    <span>My Addresses</span>
                  </Link>

                  <button
                    type="button"
                    className="account-dropdown-item logout-item"
                    onClick={handleLogout}
                  >
                    <FiLogOut />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            {/* MY STORE */}
            <Link to="/stores" className="navbar-action">
              {isOrdersPage ? <FiMonitor /> : <FiMapPin />}
              <span>My Store</span>
            </Link>

            {/* SUPPORT */}
            <Link to="/support" className="navbar-action">
              {isOrdersPage ? <FiMessageSquare /> : <FiHelpCircle />}
              <span>Support</span>
            </Link>

            {/* NOTIFICATIONS */}
            <div className="account-wrapper notification-wrapper" ref={notificationRef}>
              <button
                type="button"
                className={`navbar-action notification-action ${showNotifications ? "active" : ""}`}
                onClick={() => setShowNotifications((prev) => !prev)}
                aria-label="Notifications"
                aria-expanded={showNotifications}
              >
                <div className="notification-icon-wrapper">
                  <FiBell />
                  {unreadNotificationsCount > 0 && (
                    <span className="notification-count-badge">
                      {unreadNotificationsCount > 9 ? "9+" : unreadNotificationsCount}
                    </span>
                  )}
                </div>
                <span>Notification</span>
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <div className="notification-title-row">
                      <h3>Notifications</h3>
                      {unreadNotificationsCount > 0 && (
                        <span className="notification-badge-pill">
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        type="button"
                        className="notification-mark-all"
                        onClick={handleMarkAllRead}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="notification-dropdown-body">
                    {!user ? (
                      <div className="notification-guest-box">
                        <FiBell className="notif-empty-icon" />
                        <p className="notif-guest-title">Stay up to date</p>
                        <p className="notif-guest-desc">
                          Sign in to view your restock alerts, delivery updates, and exclusive offers.
                        </p>
                        <Link
                          to="/login"
                          className="notif-signin-btn"
                          onClick={() => setShowNotifications(false)}
                        >
                          Sign In
                        </Link>
                      </div>
                    ) : loadingNotifications ? (
                      <div className="notification-loading">
                        <div className="notif-shimmer-item" />
                        <div className="notif-shimmer-item" />
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notification-empty">
                        <FiBell className="notif-empty-icon" />
                        <p className="notif-empty-title">No notifications yet</p>
                        <p className="notif-empty-subtitle">
                          We'll alert you about restocks, order tracking, and exclusive sports deals.
                        </p>
                      </div>
                    ) : (
                      <div className="notification-list">
                        {notifications.map((item) => (
                          <div
                            key={item._id}
                            className={`notification-item ${!item.read ? "unread" : ""}`}
                            onClick={() => handleNotificationItemClick(item)}
                          >
                            <div className="notification-item-icon">
                              {getNotificationIcon(item.type)}
                            </div>
                            <div className="notification-item-content">
                              <div className="notif-item-header">
                                <span className="notif-item-title">{item.title}</span>
                                <span className="notif-item-time">
                                  {formatTimeAgo(item.createdAt)}
                                </span>
                              </div>
                              <p className="notif-item-message">{item.message}</p>
                            </div>
                            {!item.read && <span className="notif-unread-dot" />}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {user && (
                    <div className="notification-dropdown-footer">
                      <Link
                        to="/profile?tab=notifications-preferences"
                        className="notif-footer-link"
                        onClick={() => setShowNotifications(false)}
                      >
                        Notification preferences
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WISHLIST */}
            <Link to="/wishlist" className="navbar-action">
              <FiHeart />
              <span>Wishlist</span>
            </Link>

            {/* CART */}
            <Link
              to="/cart"
              className="navbar-action"
              onClick={(e) => {
                const token = localStorage.getItem("token");
                if (!token) {
                  e.preventDefault();
                  toast.error("Please login first", { id: "login-required" });
                  navigate("/login");
                }
              }}
            >
              <div className="cart-icon-wrapper">
                {isOrdersPage ? <FiShoppingCart /> : <FiShoppingBag />}
                {cartCount > 0 && (
                  <span className="cart-count-badge">{cartCount}</span>
                )}
              </div>
              <span>Cart</span>
            </Link>
          </nav>
        </div>

        {/* MOBILE DELIVERY LOCATION BAR */}
        {!isOrdersPage && (
          <button
            type="button"
            className="mobile-delivery-location"
            onClick={() => setLocationModalOpen(true)}
            aria-label="Change delivery location"
          >
            <FiMapPin className="mobile-loc-pin" />
            <span>
              Delivery to{" "}
              <strong>
                {detectingLocation
                  ? "Detecting your location..."
                  : deliveryLocation.shortLabel}
              </strong>
            </span>
            <FiChevronDown className="mobile-loc-arrow" />
          </button>
        )}
      </header>

      <LocationPickerModal
        isOpen={locationModalOpen}
        onClose={() => setLocationModalOpen(false)}
        currentLocation={deliveryLocation}
      />

      {/* PRODUCT SIZE MODAL FROM SEARCH */}
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
          formatPrice={formatPrice}
        />
      )}
    </>
  );
};

export default Navbar;
