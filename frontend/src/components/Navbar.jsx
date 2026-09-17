import React, { useEffect, useState, useRef } from "react";
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
  FiMenu,
  FiMonitor,
  FiMessageSquare,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiGrid,
  FiEdit2,
} from "react-icons/fi";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api, {
  isTokenExpired,
  handleAutoLogout,
  useWishlist,
} from "../api/axios";
import ProductSizeModal from "./ProductSizeModal";
import "../styles/Navbar.css";
import "../styles/ProductSizeModal.css";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isWishlisted, handleToggle: toggleWishlistIcon } = useWishlist();

  const [user, setUser] = useState(null);
  const [cartCount, setCartCount] = useState(0);

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

  // PRODUCT MODAL STATES FOR ADD TO CART FROM SEARCH
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  const isOrdersPage = location.pathname.startsWith("/account");

  const getImageUrl = (image) => {
    if (!image) return "";
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

    const handleAuthChange = () => {
      loadUser();
      fetchCartCount();
    };

    const handleCartChange = () => {
      fetchCartCount();
    };

    window.addEventListener("authChanged", handleAuthChange);
    window.addEventListener("cartUpdated", handleCartChange);

    return () => {
      window.removeEventListener("authChanged", handleAuthChange);
      window.removeEventListener("cartUpdated", handleCartChange);
    };
  }, []);

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
      toast.warning("Please select a size");
      return;
    }

    if (!quantity || Number(quantity) < 1) {
      toast.warning("Quantity must be at least 1");
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

  // SUGGESTIONS LIST DERIVED FROM SEARCH OR QUERY
  const suggestedQueries = searchQuery.trim()
    ? [
        searchQuery.trim(),
        `Trekking ${searchQuery.trim()}`,
        `Gym ${searchQuery.trim()}`,
        `Hiking ${searchQuery.trim()}`,
        `Duffle ${searchQuery.trim()}`,
        `Waterproof ${searchQuery.trim()} Cover`,
      ]
    : [];

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
          {/* ORDERS PAGE LEFT MENU */}
          {isOrdersPage && (
            <div className="orders-navbar-menu">
              <FiMenu />
              <span>
                ALL
                <br />
                SPORTS
              </span>
            </div>
          )}

          {/* LOGO */}
          <Link to="/" className="navbar-logo" aria-label="Decathlon Home">
            <svg
              viewBox="0 0 188 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="decathlon-official-logo"
              width="170"
              height="26"
            >
              <path
                d="M57.5509 23.8H70.7949V19.544H62.5909V15.974H69.8569V12.012H62.5909V8.442H70.7949V4.2H57.5509V23.8ZM87.2309 15.358C85.3129 18.41 83.4509 19.684 81.0569 19.684C77.9489 19.684 76.1429 17.5 76.1429 13.706C76.1429 10.108 77.8089 8.316 80.3709 8.316C82.0649 8.316 83.4649 9.072 83.8989 11.592H88.9389C88.3929 6.79 85.3269 3.808 80.4269 3.808C74.7429 3.808 71.0049 7.82599 71.0049 13.986C71.0049 20.188 74.7429 24.192 80.8889 24.192C84.9069 24.192 87.6369 22.512 89.4429 20.244H96.3169V23.8H101.329V4.2H94.2169L87.2309 15.358ZM96.3169 16.31H91.8789L96.3169 9.1V16.31ZM46.7989 4.2H39.4349V23.8H46.7989C52.6369 23.8 56.4029 19.95 56.4029 14C56.4029 8.05 52.6369 4.2 46.7989 4.2ZM46.7289 19.544H44.4749V8.442H46.7289C49.6409 8.442 51.2789 10.5 51.2789 14C51.2789 17.486 49.6409 19.544 46.7289 19.544ZM159.177 3.808C153.255 3.808 149.279 7.826 149.279 14C149.279 20.174 153.255 24.192 159.177 24.192C165.113 24.192 169.075 20.174 169.075 14C169.075 7.82601 165.113 3.808 159.177 3.808ZM159.177 19.684C156.265 19.684 154.431 17.738 154.431 14C154.431 10.262 156.265 8.316 159.177 8.316C162.103 8.316 163.923 10.262 163.923 14C163.923 17.738 162.103 19.684 159.177 19.684ZM102.589 8.442H107.531V23.8H112.571V8.442H117.513V4.2H102.589L102.589 8.442ZM181.941 4.2V14.994L175.445 4.2H170.223V23.8H175.095V12.558L181.857 23.8H186.813V4.2L181.941 4.2ZM142.139 4.2H137.099V23.8H149.741V19.558H142.139V4.2ZM130.603 11.676H123.813V4.2H118.773V23.8H123.813V15.904H130.603V23.8H135.643V4.2H130.603V11.676Z"
                fill="#3643BA"
              />
              <path
                d="M25.2111 0C14.2668 0 0.653107 11.3236 0.653107 20.7085C0.653107 25.5554 4.37614 28 9.29335 28C12.904 28 17.2733 26.6794 21.488 24.1365V5.40893C20.3641 7.33366 15.0816 15.0888 10.8388 19.2193C8.67519 21.3266 6.96119 22.2398 5.48603 22.2398C3.82822 22.2398 3.04147 21.1159 3.04147 19.4441C3.04147 11.8575 15.8122 1.99498 24.2698 1.99498C27.754 1.99498 30.0018 3.54039 30.0018 6.54692C30.0018 9.30055 28.1333 12.7566 24.9441 15.9458V21.7481C30.5076 17.3507 33.8373 11.7451 33.8373 7.22127C33.8373 2.4586 30.1283 0 25.2111 0Z"
                fill="#3643BA"
              />
            </svg>
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
            <div className="navbar-account">
              <Link
                to={user ? "/profile" : "/login"}
                className="navbar-action account-button"
              >
                <FiUser />
                <span>{user ? "Account" : "Sign In"}</span>
              </Link>

              {user && (
                <div className="account-dropdown">
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

                  <Link to="/wallet" className="account-dropdown-item">
                    <FiCreditCard />
                    <span>Wallet</span>
                  </Link>

                  <Link to="/rewards" className="account-dropdown-item">
                    <FiAward />
                    <span>Sporty Rewards</span>
                  </Link>

                  <Link to="/addresses" className="account-dropdown-item">
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

            {/* WISHLIST */}
            <Link to="/wishlist" className="navbar-action">
              <FiHeart />
              <span>Wishlist</span>
            </Link>

            {/* CART */}
            <Link to="/cart" className="navbar-action">
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
          <div className="mobile-delivery-location">
            <FiMapPin className="mobile-loc-pin" />
            <span>
              Delivery to{" "}
              <strong>Bangalore Central, Bangalore, 560001...</strong>
            </span>
            <FiChevronDown className="mobile-loc-arrow" />
          </div>
        )}
      </header>

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
