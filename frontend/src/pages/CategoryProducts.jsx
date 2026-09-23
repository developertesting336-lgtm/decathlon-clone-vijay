import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { FiHeart, FiPlus, FiMinus, FiFilter, FiX } from "react-icons/fi";
import axios from "axios";
import toast from "react-hot-toast";
import api, { useWishlist } from "../api/axios";
import socket from "../socket/socket";
import Navbar from "../components/Navbar";
import Footer from "../components/pageSections/Footer/Footer";
import "../styles/CategoryProducts.css";

const CATEGORY_NAMES = {
  "running-shoes": "Running Shoes",
  "hiking-backpacks": "Hiking Backpacks",
  "gym-shoes": "Gym Shoes",
  football: "Football",
  cycling: "Cycling",
  swimming: "Swimming",
  monsoon: "Monsoon Essentials",
  shorts: "Shorts",
  pants: "Pants",
  "t-shirts": "T-Shirts",
  "fitness-equipments": "Fitness Equipments",
  "trekking-shoes": "Trekking Shoes",
  "nutrition-care": "Nutrition & Care",
  yoga: "Yoga",
  camping: "Camping",
  cricket: "Cricket",
  badminton: "Badminton",
  skating: "Skating",
  tennis: "Tennis",
  safari: "Safari",
  "all-sports": "All Sports",
};

const GENDER_OPTIONS = ["Men", "Women", "Kids", "Unisex"];
const SIZE_OPTIONS = ["S", "M", "L", "XL", "2XL", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10"];
const SPORT_OPTIONS = ["Running", "Hiking & Trekking", "Fitness & Gym", "Football", "Swimming", "Cycling"];
const COLOR_CONFIG = [
  { name: "Black", hex: "#111111" },
  { name: "Blue", hex: "#1976d2" },
  { name: "Grey", hex: "#757575" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Red", hex: "#e53935" },
  { name: "Green", hex: "#388e3c" },
  { name: "Khaki", hex: "#c3b091" },
];
const DISCOUNT_OPTIONS = [
  { label: "10% and above", value: 10 },
  { label: "20% and above", value: 20 },
  { label: "30% and above", value: 30 },
  { label: "40% and above", value: 40 },
];
const RATING_OPTIONS = [
  { label: "4★ and above", value: 4 },
  { label: "3★ and above", value: 3 },
];

const getPrice = (product) => {
  return Number(product.discountPrice || product.price || product.salePrice || 0);
};

const getMrp = (product) => {
  return Number(
    product.price ||
      product.mrp ||
      product.originalPrice ||
      getPrice(product)
  );
};

function CategoryProducts() {
  const { category } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { isWishlisted, handleToggle } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("relevant");
  const [error, setError] = useState("");

  // Price range state
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(20000);

  // Filter selection states
  const [selectedGenders, setSelectedGenders] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedSports, setSelectedSports] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [selectedRating, setSelectedRating] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Accordion state (matches screenshot)
  const [openFilters, setOpenFilters] = useState({
    Price: true,
    Gender: true,
    Category: false,
    Size: true,
    Sport: true,
    Brand: false,
    Color: false,
    Discount: false,
    Rating: false,
    Availability: false,
  });

  useEffect(() => {
    if (mobileFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileFilterOpen]);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const searchQuery = searchParams.get("search") || "";
  const queryCategory = searchParams.get("category") || "";

  const activeCategoryId =
    location.state?.categoryId ||
    (category && category.match(/^[0-9a-fA-F]{24}$/) ? category : null) ||
    (queryCategory && queryCategory.match(/^[0-9a-fA-F]{24}$/) ? queryCategory : null);

  const [fetchedCategoryName, setFetchedCategoryName] = useState("");

  const formatTitle = (slug) => {
    if (!slug) return "";
    return slug
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  useEffect(() => {
    if (category && !location.state?.categoryName) {
      api
        .get(`/categories/${encodeURIComponent(category)}`)
        .then((res) => {
          if (res.data?.category?.name) {
            setFetchedCategoryName(res.data.category.name);
          }
        })
        .catch(() => {});
    }
  }, [category, location.state?.categoryName]);

  const categoryName =
    location.state?.categoryName ||
    fetchedCategoryName ||
    CATEGORY_NAMES[category] ||
    CATEGORY_NAMES[queryCategory] ||
    (searchQuery ? `Search: "${searchQuery}"` : null) ||
    (category ? formatTitle(category) : null) ||
    (queryCategory ? formatTitle(queryCategory) : null) ||
    "Products";

  const pageHeading = searchQuery
    ? `Search results for "${searchQuery}"`
    : categoryName;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError("");

        let endpoint = "/products?limit=48";
        if (searchQuery) {
          endpoint = `/products?search=${encodeURIComponent(searchQuery)}&limit=48`;
        } else if (activeCategoryId) {
          endpoint = `/products?category=${encodeURIComponent(activeCategoryId)}&limit=48`;
        } else if (category || queryCategory) {
          endpoint = `/products?category=${encodeURIComponent(category || queryCategory)}&limit=48`;
        }

        const response = await api.get(endpoint);

        const data = response.data;
        const productList = Array.isArray(data)
          ? data
          : data.products || data.data || [];

        setProducts(productList);
        document.title = searchQuery
          ? `Search results for "${searchQuery}" | Decathlon`
          : `${categoryName} | Decathlon`;
      } catch (err) {
        console.error(err);
        if (axios.isAxiosError(err)) {
          setError(err.response?.data?.message || "Unable to load products");
        } else {
          setError("Unable to load products");
        }
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    let debounceTimer;
    const handleRealtimeChange = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        fetchProducts();
      }, 300);
    };

    socket.on("product_created", handleRealtimeChange);
    socket.on("product_updated", handleRealtimeChange);
    socket.on("product_deleted", handleRealtimeChange);
    socket.on("products_updated", handleRealtimeChange);
    socket.on("category_updated", handleRealtimeChange);
    socket.on("homepage_updated", handleRealtimeChange);

    return () => {
      clearTimeout(debounceTimer);
      socket.off("product_created", handleRealtimeChange);
      socket.off("product_updated", handleRealtimeChange);
      socket.off("product_deleted", handleRealtimeChange);
      socket.off("products_updated", handleRealtimeChange);
      socket.off("category_updated", handleRealtimeChange);
      socket.off("homepage_updated", handleRealtimeChange);
    };
  }, [category, activeCategoryId, categoryName, searchQuery, queryCategory]);

  const toggleFilter = (filterName) => {
    setOpenFilters((prev) => ({
      ...prev,
      [filterName]: !prev[filterName],
    }));
  };

  const toggleArrayFilter = (setter, item) => {
    setter((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item]
    );
  };

  const handleClearAll = () => {
    setMinPrice(0);
    setMaxPrice(20000);
    setSelectedGenders([]);
    setSelectedCategories([]);
    setSelectedSizes([]);
    setSelectedSports([]);
    setSelectedBrands([]);
    setSelectedColors([]);
    setSelectedDiscount(null);
    setSelectedRating(null);
    setInStockOnly(false);
  };

  // Active filter count
  const activeFiltersCount = useMemo(() => {
    return (
      (minPrice > 0 || maxPrice < 20000 ? 1 : 0) +
      selectedGenders.length +
      selectedCategories.length +
      selectedSizes.length +
      selectedSports.length +
      selectedBrands.length +
      selectedColors.length +
      (selectedDiscount ? 1 : 0) +
      (selectedRating ? 1 : 0) +
      (inStockOnly ? 1 : 0)
    );
  }, [
    minPrice,
    maxPrice,
    selectedGenders,
    selectedCategories,
    selectedSizes,
    selectedSports,
    selectedBrands,
    selectedColors,
    selectedDiscount,
    selectedRating,
    inStockOnly,
  ]);

  // Derived unique Brands and Categories from current product list
  const availableBrands = useMemo(() => {
    const brandsSet = new Set(
      products.map((p) => p.brand?.trim()).filter(Boolean)
    );
    if (brandsSet.size === 0) {
      return ["DOMYOS", "QUECHUA", "KIPRUN", "KIPSTA", "INESIS", "CAPERLAN", "TRIBORD", "DECATHLON"];
    }
    return Array.from(brandsSet);
  }, [products]);

  const availableCategories = useMemo(() => {
    const catsSet = new Set();
    products.forEach((p) => {
      if (p.category?.name) catsSet.add(p.category.name);
      if (Array.isArray(p.categories)) {
        p.categories.forEach((c) => {
          if (c && typeof c === "object" && c.name) {
            catsSet.add(c.name);
          } else if (typeof c === "string" && !c.match(/^[0-9a-fA-F]{24}$/)) {
            catsSet.add(c);
          }
        });
      }
    });
    return Array.from(catsSet);
  }, [products]);

  const getImage = (product) => {
    const img =
      product.images?.[0]?.url ||
      product.images?.[0] ||
      product.image ||
      product.imageUrl;

    if (!img) return "https://via.placeholder.com/500x500?text=Product";
    if (
      typeof img === "string" &&
      (img.startsWith("http://") || img.startsWith("https://"))
    ) {
      return img;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (typeof img === "string") {
      if (img.startsWith("/uploads/")) return `${backendUrl}${img}`;
      if (img.startsWith("uploads/")) return `${backendUrl}/${img}`;
      return `${backendUrl}${img.startsWith("/") ? "" : "/"}${img}`;
    }
    return "https://via.placeholder.com/500x500?text=Product";
  };

  const handleAddToCart = async (e, product) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    try {
      const productId = product._id || product.id;
      const defaultSize =
        Array.isArray(product.size) && product.size.length > 0
          ? product.size[0]
          : undefined;
      const defaultColor =
        Array.isArray(product.color) && product.color.length > 0
          ? product.color[0]
          : undefined;

      await api.post("/cart", {
        productId,
        quantity: 1,
        size: defaultSize,
        color: defaultColor,
      });

      window.dispatchEvent(new Event("cartUpdated"));
      toast.success("Added to cart!");
    } catch (err) {
      console.error("Add to cart error:", err);
      if (axios.isAxiosError(err)) {
        toast.error(err.response?.data?.message || "Failed to add to cart");
      } else {
        toast.error("Failed to add to cart");
      }
    }
  };

  // Comprehensive Multi-Filter Execution
  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const price = getPrice(product);
      const mrp = getMrp(product);

      // 1. Price Range
      if (price < minPrice || price > maxPrice) return false;

      // 2. Availability (In Stock)
      if (inStockOnly && Number(product.stock || 0) <= 0) return false;

      const pName = (product.name || "").toLowerCase();
      const pDesc = (product.description || "").toLowerCase();
      const pBrand = (product.brand || "").toLowerCase();
      const pColors = Array.isArray(product.color)
        ? product.color.map((c) => c.toLowerCase())
        : [String(product.color || "").toLowerCase()];
      const pSizes = Array.isArray(product.size)
        ? product.size.map((s) => s.toUpperCase())
        : [String(product.size || "").toUpperCase()];

      // 3. Gender
      if (selectedGenders.length > 0) {
        const rawGender = (product.gender || "").toLowerCase().trim();

        const titleHasWomen = /\b(women|womens|woman|ladies|female)\b/i.test(pName);
        const titleHasKids = /\b(kid|kids|child|children|junior|boy|boys|girl|girls)\b/i.test(pName);
        const titleHasMen = /\b(men|mens|man|male)\b/i.test(pName) && !titleHasWomen;

        const descHasWomen = /\b(women|womens|woman|ladies|female)\b/i.test(pDesc);
        const descHasKids = /\b(kid|kids|child|children|junior)\b/i.test(pDesc);
        const descHasMen = /\b(men|mens|man|male)\b/i.test(pDesc) && !descHasWomen;

        let prodGender = "unisex";
        if (rawGender === "women" || titleHasWomen || descHasWomen) {
          prodGender = "women";
        } else if (rawGender === "kids" || titleHasKids || descHasKids) {
          prodGender = "kids";
        } else if (rawGender === "men" || titleHasMen || descHasMen) {
          prodGender = "men";
        } else if (rawGender === "unisex" || /\bunisex\b/i.test(pName)) {
          prodGender = "unisex";
        }

        const matchesGender = selectedGenders.some(
          (g) => g.toLowerCase() === prodGender
        );
        if (!matchesGender) return false;
      }

      // 4. Category
      if (selectedCategories.length > 0) {
        const matchesCat = selectedCategories.some((c) => {
          const cLower = c.toLowerCase();
          const prodCatName = (product.category?.name || "").toLowerCase();
          const prodCategories = Array.isArray(product.categories)
            ? product.categories.map((cat) =>
                (typeof cat === "object" ? cat?.name || "" : cat).toLowerCase()
              )
            : [];
          return (
            prodCatName === cLower ||
            prodCategories.includes(cLower) ||
            pName.toLowerCase().includes(cLower)
          );
        });
        if (!matchesCat) return false;
      }

      // 5. Size
      if (selectedSizes.length > 0) {
        const matchesSize = selectedSizes.some((s) => {
          const sUpper = s.toUpperCase();
          return pSizes.includes(sUpper) || pName.toUpperCase().includes(sUpper);
        });
        if (!matchesSize) return false;
      }

      // 6. Sport
      if (selectedSports.length > 0) {
        const matchesSport = selectedSports.some((sp) => {
          const spLower = sp.toLowerCase();
          if (spLower.includes("run")) return pName.includes("run") || pBrand.includes("kiprun");
          if (spLower.includes("gym") || spLower.includes("fitness"))
            return pName.includes("gym") || pName.includes("fitness") || pName.includes("cardio") || pBrand.includes("domyos");
          if (spLower.includes("hik") || spLower.includes("trek"))
            return pName.includes("hik") || pName.includes("trek") || pBrand.includes("quechua");
          if (spLower.includes("football")) return pName.includes("football") || pBrand.includes("kipsta");
          if (spLower.includes("swim")) return pName.includes("swim") || pName.includes("water") || pBrand.includes("tribord");
          if (spLower.includes("cycl")) return pName.includes("cycl") || pBrand.includes("van rysel");
          return pName.includes(spLower) || pDesc.includes(spLower);
        });
        if (!matchesSport) return false;
      }

      // 7. Brand
      if (selectedBrands.length > 0) {
        const matchesBrand = selectedBrands.some(
          (b) => pBrand.includes(b.toLowerCase()) || pName.includes(b.toLowerCase())
        );
        if (!matchesBrand) return false;
      }

      // 8. Color
      if (selectedColors.length > 0) {
        const matchesColor = selectedColors.some((col) => {
          const colLower = col.toLowerCase();
          return pColors.some((c) => c.includes(colLower)) || pName.includes(colLower);
        });
        if (!matchesColor) return false;
      }

      // 9. Discount
      if (selectedDiscount) {
        const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
        if (discount < selectedDiscount) return false;
      }

      // 10. Rating
      if (selectedRating) {
        const rating = Number(product.rating || 4.5);
        if (rating < selectedRating) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === "price-low") {
      result.sort((a, b) => getPrice(a) - getPrice(b));
    }
    if (sortBy === "price-high") {
      result.sort((a, b) => getPrice(b) - getPrice(a));
    }
    if (sortBy === "rating") {
      result.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }

    return result;
  }, [
    products,
    minPrice,
    maxPrice,
    sortBy,
    selectedGenders,
    selectedCategories,
    selectedSizes,
    selectedSports,
    selectedBrands,
    selectedColors,
    selectedDiscount,
    selectedRating,
    inStockOnly,
  ]);

  return (
    <div className="category-page">
      <Navbar />

      {/* HEADER */}
      <div className="category-header">
        <div className="delivery-text">
          Delivery to{" "}
          <span>Bangalore Central, Bangalore, 560001, Karnataka</span>
        </div>

        <div className="breadcrumb">
          <span onClick={() => navigate("/")}>Home</span>
          <b>›</b>
          {searchQuery ? (
            <>
              <span>Search</span>
              <b>›</b>
              <span>"{searchQuery}"</span>
            </>
          ) : (
            <>
              <span>Sports</span>
              <b>›</b>
              <span>{categoryName}</span>
            </>
          )}
        </div>

        <h1>{pageHeading}</h1>
      </div>

      {/* MOBILE BACKDROP OVERLAY */}
      {mobileFilterOpen && (
        <div
          className="mobile-filters-backdrop"
          onClick={() => setMobileFilterOpen(false)}
        />
      )}

      <div className="category-layout">
        {/* =====================================================
            FILTERS SIDEBAR (INDEPENDENT SMOOTH SCROLL)
        ===================================================== */}
        <aside
          className={`filters-sidebar ${mobileFilterOpen ? "mobile-open" : ""}`}
        >
          <div className="filter-top">
            <h3>
              Filters
              {activeFiltersCount > 0 && (
                <span className="filter-active-count">{activeFiltersCount}</span>
              )}
            </h3>

            <div className="filter-top-actions">
              <button
                type="button"
                onClick={handleClearAll}
                className="filter-clear-btn"
              >
                Clear all
              </button>
              <button
                type="button"
                className="mobile-filter-close"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="Close filters"
              >
                <FiX size={20} />
              </button>
            </div>
          </div>

          {/* 1. PRICE */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Price")}
            >
              <span>Price</span>
              {openFilters.Price ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Price && (
              <>
                <p>
                  From ₹{minPrice.toLocaleString()} to ₹{maxPrice.toLocaleString()}
                </p>

                <div className="price-range">
                  <input
                    type="range"
                    min="0"
                    max="20000"
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(Math.min(Number(e.target.value), maxPrice))
                    }
                  />

                  <input
                    type="range"
                    min="0"
                    max="20000"
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(Math.max(Number(e.target.value), minPrice))
                    }
                  />
                </div>

                <div className="price-inputs">
                  <div>
                    <small>Minimum</small>
                    <input
                      type="number"
                      value={minPrice}
                      onChange={(e) => setMinPrice(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <small>Maximum</small>
                    <input
                      type="number"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. GENDER */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Gender")}
            >
              <span>Gender</span>
              {openFilters.Gender ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Gender && (
              <div className="filter-options-group">
                {GENDER_OPTIONS.map((g) => (
                  <label key={g} className="filter-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedGenders.includes(g)}
                      onChange={() => toggleArrayFilter(setSelectedGenders, g)}
                    />
                    <span>{g}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 3. CATEGORY */}
          {availableCategories.length > 1 && (
            <div className="filter-section">
              <div
                className="filter-title"
                onClick={() => toggleFilter("Category")}
              >
                <span>Category</span>
                {openFilters.Category ? <FiMinus size={18} /> : <FiPlus size={18} />}
              </div>

              {openFilters.Category && (
                <div className="filter-options-group">
                  {availableCategories.map((cat) => (
                    <label key={cat} className="filter-checkbox-row">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleArrayFilter(setSelectedCategories, cat)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. SIZE */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Size")}
            >
              <span>Size</span>
              {openFilters.Size ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Size && (
              <div className="filter-size-chips-grid">
                {SIZE_OPTIONS.map((sz) => {
                  const active = selectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      className={`filter-size-chip ${active ? "active" : ""}`}
                      onClick={() => toggleArrayFilter(setSelectedSizes, sz)}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. SPORT */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Sport")}
            >
              <span>Sport</span>
              {openFilters.Sport ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Sport && (
              <div className="filter-options-group">
                {SPORT_OPTIONS.map((sp) => (
                  <label key={sp} className="filter-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedSports.includes(sp)}
                      onChange={() => toggleArrayFilter(setSelectedSports, sp)}
                    />
                    <span>{sp}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 6. BRAND */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Brand")}
            >
              <span>Brand</span>
              {openFilters.Brand ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Brand && (
              <div className="filter-options-group">
                {availableBrands.map((b) => (
                  <label key={b} className="filter-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b)}
                      onChange={() => toggleArrayFilter(setSelectedBrands, b)}
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 7. COLOR */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Color")}
            >
              <span>Color</span>
              {openFilters.Color ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Color && (
              <div className="filter-color-chips-row">
                {COLOR_CONFIG.map((col) => {
                  const active = selectedColors.includes(col.name);
                  return (
                    <button
                      key={col.name}
                      type="button"
                      className={`filter-color-chip ${active ? "active" : ""}`}
                      onClick={() => toggleArrayFilter(setSelectedColors, col.name)}
                    >
                      <span
                        className="filter-color-dot"
                        style={{ background: col.hex }}
                      />
                      <span>{col.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 8. DISCOUNT */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Discount")}
            >
              <span>Discount</span>
              {openFilters.Discount ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Discount && (
              <div className="filter-options-group">
                {DISCOUNT_OPTIONS.map((disc) => (
                  <label key={disc.value} className="filter-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedDiscount === disc.value}
                      onChange={() =>
                        setSelectedDiscount(
                          selectedDiscount === disc.value ? null : disc.value
                        )
                      }
                    />
                    <span>{disc.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 9. RATING */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Rating")}
            >
              <span>Rating</span>
              {openFilters.Rating ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Rating && (
              <div className="filter-options-group">
                {RATING_OPTIONS.map((r) => (
                  <label key={r.value} className="filter-checkbox-row">
                    <input
                      type="checkbox"
                      checked={selectedRating === r.value}
                      onChange={() =>
                        setSelectedRating(
                          selectedRating === r.value ? null : r.value
                        )
                      }
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 10. AVAILABILITY */}
          <div className="filter-section">
            <div
              className="filter-title"
              onClick={() => toggleFilter("Availability")}
            >
              <span>Availability</span>
              {openFilters.Availability ? <FiMinus size={18} /> : <FiPlus size={18} />}
            </div>

            {openFilters.Availability && (
              <div className="filter-options-group">
                <label className="filter-checkbox-row">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  <span>In Stock Only</span>
                </label>
              </div>
            )}
          </div>

          {/* MOBILE DRAWER FOOTER ACTION */}
          <div className="mobile-drawer-footer">
            <button
              type="button"
              className="mobile-drawer-apply-btn"
              onClick={() => setMobileFilterOpen(false)}
            >
              Show {filteredProducts.length} Products
            </button>
          </div>
        </aside>

        {/* =====================================================
            PRODUCTS AREA
        ===================================================== */}
        <main className="products-area">
          {/* MOBILE FILTER & SORT BAR (Shown on screens <= 860px) */}
          <div className="mobile-filter-bar">
            <button
              type="button"
              className="mobile-filter-toggle"
              onClick={() => setMobileFilterOpen(true)}
            >
              <FiFilter size={16} />
              <span>Filters</span>
              {activeFiltersCount > 0 && (
                <span className="mobile-filter-count-badge">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            <div className="mobile-sort-select-wrapper">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label="Sort products"
              >
                <option value="relevant">Most relevant</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          <div className="products-toolbar">
            {searchQuery ? (
              <div className="search-quick-tags">
                <span className="search-results-label">
                  Showing results for <strong>"{searchQuery}"</strong>
                </span>
              </div>
            ) : (
              <div className="category-tabs">
                <span>Explore all our collections</span>

                {availableCategories
                  .filter((cat) => cat.toLowerCase() !== categoryName.toLowerCase())
                  .slice(0, 4)
                  .map((cat) => {
                    const active = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        className={active ? "active" : ""}
                        onClick={() => {
                          toggleArrayFilter(setSelectedCategories, cat);
                          setOpenFilters((prev) => ({ ...prev, Category: true }));
                        }}
                      >
                        {cat}
                      </button>
                    );
                  })}

                <button
                  className={selectedGenders.includes("Men") ? "active" : ""}
                  onClick={() => {
                    toggleArrayFilter(setSelectedGenders, "Men");
                    setOpenFilters((prev) => ({ ...prev, Gender: true }));
                  }}
                >
                  Men {categoryName}
                </button>
                <button
                  className={selectedGenders.includes("Women") ? "active" : ""}
                  onClick={() => {
                    toggleArrayFilter(setSelectedGenders, "Women");
                    setOpenFilters((prev) => ({ ...prev, Gender: true }));
                  }}
                >
                  Women {categoryName}
                </button>
                <button
                  className={selectedGenders.includes("Kids") ? "active" : ""}
                  onClick={() => {
                    toggleArrayFilter(setSelectedGenders, "Kids");
                    setOpenFilters((prev) => ({ ...prev, Gender: true }));
                  }}
                >
                  Kids {categoryName}
                </button>
              </div>
            )}

            <div className="products-sort">
              <strong>{filteredProducts.length} items</strong>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="relevant">Most relevant</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Top Rated</option>
              </select>
            </div>
          </div>

          {/* LOADING */}
          {loading && <div className="loading">Loading products...</div>}

          {/* ERROR */}
          {!loading && error && <div className="error">{error}</div>}

          {/* PRODUCTS GRID */}
          {!loading && !error && (
            <div className="product-grid">
              {filteredProducts.length === 0 ? (
                searchQuery ? (
                  <div className="no-products search-empty-container">
                    <div className="search-empty-icon">🔍</div>
                    <h2>No products found for "{searchQuery}".</h2>
                    <p>
                      Check the spelling of your keywords, try using more general search terms, or remove selected filters.
                    </p>
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        className="clear-search-filters-btn"
                        onClick={handleClearAll}
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="no-products">
                    No products found matching the selected filters.
                  </div>
                )
              ) : (
                filteredProducts.map((product) => {
                  const price = getPrice(product);
                  const mrp = getMrp(product);
                  const discount =
                    mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

                  const productId = product._id || product.id;
                  const wishlisted = isWishlisted(productId);

                  return (
                    <div className="product-card" key={productId}>
                      <div
                        className="product-image"
                        onClick={() => navigate(`/product/${productId}`)}
                      >
                        {product.isNew && (
                          <span className="new-badge">New arrival</span>
                        )}

                        {discount > 0 && (
                          <span className="sale-badge">Sale</span>
                        )}

                        <img
                          src={getImage(product)}
                          alt={product.name || "Product"}
                        />
                      </div>

                      <div className="product-info">
                        <h3 onClick={() => navigate(`/product/${productId}`)}>
                          {product.name}
                        </h3>

                        <div className="rating">
                          <span>★★★★★</span>

                          <small>{product.rating || 4.5}</small>

                          <small>
                            {product.reviews
                              ? `${
                                  product.reviews / 1000 >= 1
                                    ? (product.reviews / 1000).toFixed(1) + "k"
                                    : product.reviews
                                }`
                              : "5.0k"}
                          </small>
                        </div>

                        <div className="price">₹{price.toLocaleString()}</div>

                        {mrp > price && (
                          <div className="mrp">MRP ₹{mrp.toLocaleString()}</div>
                        )}

                        <div className="product-actions">
                          <button
                            className={`wishlist-btn ${wishlisted ? "active" : ""}`}
                            onClick={() => handleToggle(productId)}
                            aria-label="Wishlist"
                          >
                            <FiHeart
                              fill={wishlisted ? "#e90036" : "none"}
                              color={wishlisted ? "#e90036" : "currentColor"}
                            />
                          </button>

                          <button
                            className="add-cart-btn"
                            onClick={(e) => handleAddToCart(e, product)}
                          >
                            Add to cart
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}

export default CategoryProducts;
