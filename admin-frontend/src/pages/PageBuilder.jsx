import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  MdArrowBack,
  MdAdd,
  MdEdit,
  MdDelete,
  MdCheckCircle,
  MdCancel,
  MdCategory,
  MdInventory2,
  MdImage,
  MdDragIndicator,
  MdLink,
  MdUploadFile,
  MdKeyboardArrowUp,
  MdKeyboardArrowDown,
  MdVisibility,
  MdClose,
  MdLayers,
} from "react-icons/md";

import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/PageBuilder.css";

const MAIN_SECTION_TYPES = [
  {
    type: "banner",
    title: "Banner Section",
    badge: "Hero & Promos",
    icon: <MdImage />,
    desc: "Hero banners, promo strips & discount deals",
    color: "#2563eb",
    bgSoft: "#eff6ff",
    presets: [
      { name: "Hero Banner Showcase", subtitle: "Style Approved, Explore Best Of Decathlon" },
      { name: "Seasonal Promotion", subtitle: "Limited Period Deals & Offers" },
      { name: "Exclusive Deals", subtitle: "Save Big on Top Rated Gear" },
      { name: "Flash Clearance", subtitle: "Up to 50% Off On Selected Products" },
    ],
    templates: [
      { id: "hero-banner", name: "Hero Banner", desc: "Full-width primary slider banner", icon: "🌟" },
      { id: "promo-banner", name: "Promo Banner", desc: "Single promotional highlight banner", icon: "📢" },
      { id: "promo-banner-2", name: "Promo Banner 2", desc: "Dual-split modern promo strips", icon: "🔥" },
      { id: "coupon-banner", name: "Coupon Banner", desc: "Discount codes, vouchers & offers", icon: "🎟️" },
      { id: "banner", name: "Standard Banner", desc: "Versatile responsive custom banner", icon: "🖼️" },
    ],
  },
  {
    type: "category",
    title: "Category Section",
    badge: "Navigation & Grids",
    icon: <MdCategory />,
    desc: "Carousels & showcase cards with custom destinations",
    color: "#059669",
    bgSoft: "#ecfdf5",
    presets: [
      { name: "Popular Categories", subtitle: "Explore our most loved sports & categories" },
      { name: "Explore All Sports", subtitle: "Choose your favorite sports category" },
      { name: "Featured Collections", subtitle: "Curated gear for every sportsperson" },
      { name: "Trending Gear", subtitle: "Top trending categories this season" },
    ],
    templates: [
      { id: "category-carousel", name: "Category Carousel", desc: "Horizontal swipeable circular category cards", icon: "🎠" },
      { id: "category-showcase", name: "Category Showcase", desc: "Featured category cards with direct destination links", icon: "✨" },
      { id: "sports-categories", name: "Sports Categories", desc: "Multi-sport visual navigation grid", icon: "⚽" },
      { id: "category-nav", name: "Category Navigation", desc: "Compact top category navigation pill bar", icon: "🧭" },
      { id: "loved-categories", name: "Loved Categories", desc: "Trending and customer-favorite categories", icon: "❤️" },
      { id: "equipping-champions", name: "Equipping Champions", desc: "Performance & athletics category showcase", icon: "🏆" },
    ],
  },
  {
    type: "product",
    title: "Product Section",
    badge: "Catalog & Grids",
    icon: <MdInventory2 />,
    desc: "Curated product grids, bestsellers & gear showcases",
    color: "#d97706",
    bgSoft: "#fffbeb",
    presets: [
      { name: "Best Sellers", subtitle: "Top rated by athletes and adventurers" },
      { name: "New Arrivals", subtitle: "Fresh styles and upgraded sports tech" },
      { name: "Trending Products", subtitle: "Customer favorites this week" },
      { name: "Workout Essentials", subtitle: "Essential equipment for every training session" },
    ],
    templates: [
      { id: "product-section", name: "Product Grid", desc: "Responsive high-density e-commerce product grid", icon: "🛍️" },
      { id: "storm-proof", name: "Storm Proof Collection", desc: "Curated all-weather gear & apparel showcase", icon: "🌧️" },
      { id: "outdoor-products", name: "Outdoor Products", desc: "Adventure, hiking & trekking equipment grid", icon: "🏕️" },
    ],
  },
  {
    type: "other",
    title: "Custom Section",
    badge: "Flexible Multi-Card",
    icon: <MdLayers />,
    desc: "Freeform collections with custom cards, images & links",
    color: "#7c3aed",
    bgSoft: "#f5f3ff",
    presets: [
      { name: "Everyday Essentials", subtitle: "Essential daily picks for active living" },
      { name: "Featured Highlights", subtitle: "Hand-picked highlights from our catalog" },
      { name: "Why Choose Us", subtitle: "Our commitment to sports innovation & value" },
      { name: "Special Services", subtitle: "Repair, warranty, and member benefits" },
    ],
    templates: [
      { id: "other", name: "Custom Cards Section", desc: "Custom card layout with images & links", icon: "🧩" },
      { id: "everyday-essentials", name: "Everyday Essentials", desc: "Daily essentials collection cards", icon: "🎒" },
    ],
  },
];

const PageBuilder = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`cached_admin_page_${id}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(`cached_admin_page_${id}`);
    } catch {
      return true;
    }
  });

  const [draggedIndex, setDraggedIndex] = useState(null);

  /* ========================================
     RESOURCE DATA
  ======================================== */

  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableBanners, setAvailableBanners] = useState([]);
  const [availablePages, setAvailablePages] = useState([]);

  /* ========================================
     SECTION MODAL
  ======================================== */

  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingSection, setEditingSection] = useState(null);

  const [sectionName, setSectionName] = useState("");
  const [mainSectionType, setMainSectionType] = useState("banner");
  const [sectionType, setSectionType] = useState("hero-banner");

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedBanners, setSelectedBanners] = useState([]);
  const [sectionSubtitle, setSectionSubtitle] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [bannerSearch, setBannerSearch] = useState("");

  const [draggedCatCardIndex, setDraggedCatCardIndex] = useState(null);
  const [inlineEditingCatIndex, setInlineEditingCatIndex] = useState(null);

  /* ========================================
     VIEW SECTION PREVIEW MODAL
  ======================================== */
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSection, setViewingSection] = useState(null);

  // Category Carousel Management View state
  const [carouselCategories, setCarouselCategories] = useState([]);
  const [draggedCatIndex, setDraggedCatIndex] = useState(null);

  // Category Item Quick Edit sub-modal state
  const [showCategoryEditModal, setShowCategoryEditModal] = useState(false);
  const [editingCatItem, setEditingCatItem] = useState(null);
  const [editingCatIndex, setEditingCatIndex] = useState(null);
  const [catEditTitle, setCatEditTitle] = useState("");
  const [catEditCustomImage, setCatEditCustomImage] = useState("");
  const [savingCategoryEdit, setSavingCategoryEdit] = useState(false);

  // Universal helper — extracts a normalised item list from ANY section type
  const extractSectionItems = (sec) => {
    if (!sec) return [];

    const disabledSet = new Set(
      (sec.disabledItemIds || sec.data?.disabledItemIds || []).map(String),
    );

    // 1. categoryItems (Category Carousel and all category-type sections)
    const rawCategoryItems =
      sec.categoryItems && sec.categoryItems.length > 0
        ? sec.categoryItems
        : sec.data?.categoryItems && sec.data.categoryItems.length > 0
          ? sec.data.categoryItems
          : [];

    if (rawCategoryItems.length > 0) {
      return rawCategoryItems.map((ci, idx) => {
        const catObj = typeof ci.category === "object" ? ci.category : null;
        const pageObj = typeof ci.page === "object" ? ci.page : null;
        const name = (
          ci.name ||
          ci.title ||
          catObj?.name ||
          pageObj?.name ||
          `Category ${idx + 1}`
        ).trim();
        const image = ci.customImage || ci.image || catObj?.image || "";
        const id = String(ci._id || catObj?._id || pageObj?._id || `ci-${idx}`);
        const isActive =
          ci.isActive !== false &&
          !disabledSet.has(id) &&
          !disabledSet.has(String(ci._id));
        return {
          _id: id,
          itemId: ci._id,
          name,
          image,
          isActive,
          linkType: ci.linkType || (pageObj ? "page" : "category"),
          sortOrder: ci.sortOrder !== undefined ? ci.sortOrder : idx,
          category: ci.category,
          page: ci.page,
          sourceField: "categoryItems",
          raw: ci,
        };
      });
    }

    // 2. products (Product-type sections)
    const rawProducts =
      sec.products && sec.products.length > 0
        ? sec.products
        : sec.data?.products && sec.data.products.length > 0
          ? sec.data.products
          : [];

    if (rawProducts.length > 0) {
      return rawProducts
        .map((p, idx) => {
          if (!p || (typeof p !== "object" && typeof p !== "string"))
            return null;
          const obj = typeof p === "object" ? p : null;
          const id = String(obj?._id || p || `prod-${idx}`);
          const isActive = obj?.isActive !== false && !disabledSet.has(id);
          return {
            _id: id,
            itemId: id,
            name: obj?.name || obj?.title || `Product ${idx + 1}`,
            image: obj?.image || obj?.thumbnail || "",
            isActive,
            linkType: "product",
            sortOrder: obj?.sortOrder !== undefined ? obj.sortOrder : idx,
            sourceField: "products",
            raw: p,
          };
        })
        .filter(Boolean);
    }

    // 3. banners (Banner-type sections)
    const rawBanners =
      sec.banners && sec.banners.length > 0
        ? sec.banners
        : sec.data?.banners && sec.data.banners.length > 0
          ? sec.data.banners
          : [];

    if (rawBanners.length > 0) {
      return rawBanners
        .map((b, idx) => {
          if (!b || (typeof b !== "object" && typeof b !== "string"))
            return null;
          const obj = typeof b === "object" ? b : null;
          const id = String(obj?._id || b || `ban-${idx}`);
          const isActive = obj?.isActive !== false && !disabledSet.has(id);
          return {
            _id: id,
            itemId: id,
            name: obj?.title || obj?.name || obj?.alt || `Banner ${idx + 1}`,
            image: obj?.image || obj?.imageUrl || obj?.url || "",
            isActive,
            linkType: "banner",
            sortOrder: obj?.sortOrder !== undefined ? obj.sortOrder : idx,
            sourceField: "banners",
            raw: b,
          };
        })
        .filter(Boolean);
    }

    // 4. generic items array (Other / everyday-essentials sections)
    const rawItems =
      sec.items && sec.items.length > 0
        ? sec.items
        : sec.data?.items && sec.data.items.length > 0
          ? sec.data.items
          : [];

    if (rawItems.length > 0) {
      return rawItems.map((item, idx) => {
        const id = String(item._id || `item-${idx}`);
        const isActive = item.isActive !== false && !disabledSet.has(id);
        return {
          _id: id,
          itemId: item._id,
          name: item.name || item.title || `Item ${idx + 1}`,
          image: item.image || "",
          isActive,
          linkType: item.linkType || "item",
          sortOrder: item.sortOrder !== undefined ? item.sortOrder : idx,
          sourceField: "items",
          raw: item,
        };
      });
    }

    // 5. plain categories array fallback
    const rawCategories =
      sec.categories && sec.categories.length > 0
        ? sec.categories
        : sec.data?.categories && sec.data.categories.length > 0
          ? sec.data.categories
          : [];

    if (rawCategories.length > 0) {
      return rawCategories.map((c, idx) => {
        const catObj = typeof c === "object" ? c : null;
        const id = String(catObj?._id || c || `cat-${idx}`);
        const isActive = catObj?.isActive !== false && !disabledSet.has(id);
        return {
          _id: id,
          itemId: id,
          name: catObj?.name || `Category ${idx + 1}`,
          image: catObj?.image || "",
          isActive,
          linkType: "category",
          sortOrder: idx,
          sourceField: "categories",
          raw: c,
        };
      });
    }

    return [];
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showCategoryEditModal) {
          setShowCategoryEditModal(false);
        } else if (showViewModal) {
          handleCloseViewModal();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showViewModal, showCategoryEditModal]);

  const handleOpenViewModal = (sec) => {
    setViewingSection(sec);
    setCarouselCategories(extractSectionItems(sec));
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingSection(null);
    setCarouselCategories([]);
    setShowCategoryEditModal(false);
    setEditingCatItem(null);
    setEditingCatIndex(null);
  };

  // Generic helper — builds updated raw array and API payload for any section type
  const buildUpdatedSectionPayload = (
    sec,
    updatedRawItems,
    sourceField,
    extraFields = {},
  ) => {
    const fieldMap = {
      categoryItems: {
        normalize: (arr) =>
          arr.map((ci) => ({
            ...ci,
            category:
              typeof ci.category === "object" ? ci.category?._id : ci.category,
            page: typeof ci.page === "object" ? ci.page?._id : ci.page,
          })),
      },
      products: {
        normalize: (arr) =>
          arr
            .map((p) => (typeof p === "object" ? p?._id || p : p))
            .filter(Boolean),
      },
      banners: {
        normalize: (arr) =>
          arr
            .map((b) => (typeof b === "object" ? b?._id || b : b))
            .filter(Boolean),
      },
      items: { normalize: (arr) => arr },
      categories: {
        normalize: (arr) =>
          arr
            .map((c) => (typeof c === "object" ? c?._id || c : c))
            .filter(Boolean),
      },
    };

    const { normalize } = fieldMap[sourceField] || { normalize: (arr) => arr };
    const normalizedItems = normalize(updatedRawItems);

    return {
      ...sec,
      [sourceField]: normalizedItems,
      ...extraFields,
      data: {
        ...(sec.data || {}),
        [sourceField]: normalizedItems,
        ...extraFields,
      },
    };
  };

  // Generic: get the raw source array from a section by sourceField
  const getRawSourceArray = (sec, sourceField) => {
    const top = sec[sourceField];
    const nested = sec.data?.[sourceField];
    if (Array.isArray(top) && top.length > 0) return [...top];
    if (Array.isArray(nested) && nested.length > 0) return [...nested];
    return [];
  };

  // Toggle active/inactive for any section item
  const handleToggleCategoryActive = async (index) => {
    if (!viewingSection) return;
    const currentCat = carouselCategories[index];
    if (!currentCat) return;

    const sourceField = currentCat.sourceField || "categoryItems";
    const newIsActive = !currentCat.isActive;

    // 1. Optimistic UI
    const updatedCategories = carouselCategories.map((c, i) =>
      i === index ? { ...c, isActive: newIsActive } : c,
    );
    setCarouselCategories(updatedCategories);

    // 2. Mutate the raw array at the right index
    const rawArr = getRawSourceArray(viewingSection, sourceField);
    const updatedRaw = rawArr.map((item, i) => {
      if (i !== index) return item;
      return typeof item === "object"
        ? { ...item, isActive: newIsActive }
        : item;
    });

    // 3. Also update disabledItemIds for categoryItems sections
    const extraFields = {};
    if (sourceField === "categoryItems") {
      const updatedDisabledIds = updatedCategories
        .filter((c) => !c.isActive)
        .map((c) => String(c.itemId || c._id));
      extraFields.disabledItemIds = updatedDisabledIds;
    }

    const payload = buildUpdatedSectionPayload(
      viewingSection,
      updatedRaw,
      sourceField,
      extraFields,
    );

    try {
      const token = localStorage.getItem("adminToken");
      await api.put(`/pages/${id}/sections/${viewingSection._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(
        `"${currentCat.name}" is now ${newIsActive ? "ACTIVE" : "INACTIVE"}`,
      );
      setViewingSection(payload);
      setPage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s._id === viewingSection._id ? payload : s,
          ),
        };
      });
      fetchPageDetails(false);
    } catch (err) {
      console.error("Failed to toggle active:", err);
      toast.error(err?.response?.data?.message || "Failed to update status");
      setCarouselCategories(carouselCategories);
    }
  };

  // Drag and drop reordering for any section type
  const handleCategoryDragStart = (e, index) => {
    setDraggedCatIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCategoryDrop = async (e, targetIndex) => {
    e.preventDefault();
    if (draggedCatIndex === null || draggedCatIndex === targetIndex) return;

    const categoriesCopy = [...carouselCategories];
    const [moved] = categoriesCopy.splice(draggedCatIndex, 1);
    categoriesCopy.splice(targetIndex, 0, moved);
    setDraggedCatIndex(null);
    setCarouselCategories(categoriesCopy);

    const sourceField =
      carouselCategories[draggedCatIndex]?.sourceField || "categoryItems";
    const rawArr = getRawSourceArray(viewingSection, sourceField);

    if (rawArr.length > 0) {
      const [movedItem] = rawArr.splice(draggedCatIndex, 1);
      rawArr.splice(targetIndex, 0, movedItem);
      const reordered = rawArr.map((item, idx) =>
        typeof item === "object"
          ? { ...item, sortOrder: idx, displayOrder: idx }
          : item,
      );

      // For categoryItems also denormalize refs
      const finalItems =
        sourceField === "categoryItems"
          ? reordered.map((ci) => ({
              ...ci,
              category:
                typeof ci.category === "object"
                  ? ci.category?._id
                  : ci.category,
              page: typeof ci.page === "object" ? ci.page?._id : ci.page,
            }))
          : reordered;

      const payload = buildUpdatedSectionPayload(
        viewingSection,
        finalItems,
        sourceField,
      );

      try {
        const token = localStorage.getItem("adminToken");
        await api.put(`/pages/${id}/sections/${viewingSection._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        toast.success("Order updated");
        setViewingSection(payload);
        setPage((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sections: (prev.sections || []).map((s) =>
              s._id === viewingSection._id ? payload : s,
            ),
          };
        });
        fetchPageDetails(false);
      } catch (err) {
        console.error("Failed to reorder:", err);
        toast.error("Failed to save order");
        setCarouselCategories(carouselCategories);
      }
    }
  };

  // Delete item from THIS section only (never from global DB)
  const handleDeleteCategory = async (index) => {
    const cat = carouselCategories[index];
    if (!cat) return;

    if (
      !window.confirm(
        `Remove "${cat.name}" from this section?\n\n(The item will only be removed from this section, not deleted globally.)`,
      )
    ) {
      return;
    }

    const sourceField = cat.sourceField || "categoryItems";
    const updatedCategories = carouselCategories.filter((_, i) => i !== index);
    setCarouselCategories(updatedCategories);

    const rawArr = getRawSourceArray(viewingSection, sourceField)
      .filter((_, i) => i !== index)
      .map((item, idx) =>
        typeof item === "object"
          ? { ...item, sortOrder: idx, displayOrder: idx }
          : item,
      );

    const finalItems =
      sourceField === "categoryItems"
        ? rawArr.map((ci) => ({
            ...ci,
            category:
              typeof ci.category === "object" ? ci.category?._id : ci.category,
            page: typeof ci.page === "object" ? ci.page?._id : ci.page,
          }))
        : rawArr;

    const payload = buildUpdatedSectionPayload(
      viewingSection,
      finalItems,
      sourceField,
    );

    try {
      const token = localStorage.getItem("adminToken");
      await api.put(`/pages/${id}/sections/${viewingSection._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Removed "${cat.name}" from this section`);
      setViewingSection(payload);
      setPage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s._id === viewingSection._id ? payload : s,
          ),
        };
      });
      fetchPageDetails(false);
    } catch (err) {
      console.error("Failed to delete from section:", err);
      toast.error("Failed to remove item from section");
      setCarouselCategories(carouselCategories);
    }
  };

  // Edit category in section
  const handleOpenCategoryItemEdit = (cat, index) => {
    setEditingCatIndex(index);
    setEditingCatItem(cat);
    setCatEditTitle(cat.name || "");
    setCatEditCustomImage(cat.image || "");
    setShowCategoryEditModal(true);
  };

  const handleCatEditImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setCatEditCustomImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Save item edits (name + image) for any section type
  const handleSaveCategoryItemEdit = async () => {
    if (editingCatIndex === null || !editingCatItem) return;

    try {
      setSavingCategoryEdit(true);

      const trimmedName = catEditTitle.trim() || editingCatItem.name;
      const sourceField = editingCatItem.sourceField || "categoryItems";

      // Update display list
      const updatedCategories = carouselCategories.map((c, i) =>
        i === editingCatIndex
          ? { ...c, name: trimmedName, image: catEditCustomImage }
          : c,
      );
      setCarouselCategories(updatedCategories);

      // Mutate raw source array
      const rawArr = getRawSourceArray(viewingSection, sourceField).map(
        (item, i) => {
          if (i !== editingCatIndex) {
            return sourceField === "categoryItems"
              ? {
                  ...item,
                  category:
                    typeof item.category === "object"
                      ? item.category?._id
                      : item.category,
                  page:
                    typeof item.page === "object" ? item.page?._id : item.page,
                }
              : item;
          }
          if (typeof item !== "object") return item;
          const updated = {
            ...item,
            name: trimmedName,
            title: trimmedName,
            image: catEditCustomImage,
            customImage: catEditCustomImage,
          };
          if (sourceField === "categoryItems") {
            updated.category =
              typeof item.category === "object"
                ? item.category?._id
                : item.category;
            updated.page =
              typeof item.page === "object" ? item.page?._id : item.page;
          }
          return updated;
        },
      );

      const payload = buildUpdatedSectionPayload(
        viewingSection,
        rawArr,
        sourceField,
      );

      const token = localStorage.getItem("adminToken");
      await api.put(`/pages/${id}/sections/${viewingSection._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`Category "${trimmedName}" updated`);
      setShowCategoryEditModal(false);
      setEditingCatItem(null);
      setEditingCatIndex(null);
      toast.success(`"${trimmedName}" updated`);

      setViewingSection(payload);
      setPage((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((s) =>
            s._id === viewingSection._id ? payload : s,
          ),
        };
      });

      fetchPageDetails(false);
    } catch (err) {
      console.error("Failed to save item edit:", err);
      toast.error("Failed to update item");
    } finally {
      setSavingCategoryEdit(false);
    }
  };

  const getSectionBaseType = (type, sec = null) => {
    const t = (type || "").toLowerCase().trim();

    // Banner types
    if (
      t === "banner" ||
      t === "coupon-banner" ||
      t === "promo-banner" ||
      t === "promo-banner-2" ||
      t === "hero-banner"
    ) {
      return "banner";
    }

    // Product types
    if (
      t === "product" ||
      t === "product-section" ||
      t === "storm-proof" ||
      t === "outdoor-products"
    ) {
      return "product";
    }

    // Category types
    if (
      t === "category" ||
      t === "category-carousel" ||
      t === "category-showcase" ||
      t === "sports-categories" ||
      t === "loved-categories" ||
      t === "equipping-champions" ||
      t === "category-nav"
    ) {
      return "category";
    }

    // Everyday essentials can be category or custom items
    if (t === "everyday-essentials") {
      if (
        sec &&
        ((sec.items && sec.items.length > 0) ||
          (sec.data?.items && sec.data.items.length > 0))
      ) {
        return "other";
      }
      return "category";
    }

    return "other";
  };

  /* ========================================
     CATEGORY SECTION ITEMS (WITH CUSTOM IMAGE)
  ======================================== */
  const [categoryItems, setCategoryItems] = useState([]);
  const [showQuickCreateCategory, setShowQuickCreateCategory] = useState(false);
  const [quickCatName, setQuickCatName] = useState("");
  const [quickCatImage, setQuickCatImage] = useState(null);
  const [creatingCategory, setCreatingCategory] = useState(false);

  /* ========================================
     OTHER SECTION ITEMS
  ======================================== */

  const [items, setItems] = useState([]);

  const [savingSection, setSavingSection] = useState(false);

  /* ========================================
     IMAGE URL
  ======================================== */

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

    if (image.startsWith("/uploads/")) {
      return `${backendUrl}${image}`;
    }

    if (image.startsWith("uploads/")) {
      return `${backendUrl}/${image}`;
    }

    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  /* ========================================
     FETCH PAGE
  ======================================== */

  const fetchPageDetails = async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }

      const token = localStorage.getItem("adminToken");

      const response = await api.get(`/pages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const pageData = response.data.page;
      setPage(pageData);
      try {
        sessionStorage.setItem(
          `cached_admin_page_${id}`,
          JSON.stringify(pageData),
        );
      } catch (e) {}
    } catch (error) {
      console.error("Fetch Page Details Error:", error);
      toast.error("Failed to load page builder details");
    } finally {
      setLoading(false);
    }
  };

  /* ========================================
     FETCH RESOURCES
  ======================================== */

  const fetchResources = async () => {
    try {
      const token = localStorage.getItem("adminToken");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const [catRes, prodRes, banRes, pagesRes] = await Promise.all([
        api.get("/categories", { headers }),
        api.get("/products?limit=100", { headers }),
        api.get("/banners", { headers }),
        api.get("/pages", { headers }),
      ]);

      setAvailableCategories(catRes.data.categories || []);
      setAvailableProducts(prodRes.data.products || []);
      setAvailableBanners(banRes.data.banners || []);
      setAvailablePages(pagesRes.data?.pages || []);
    } catch (error) {
      console.error("Fetch Resources Error:", error);
    }
  };

  /* ========================================
     INITIAL LOAD
  ======================================== */

  useEffect(() => {
    fetchPageDetails();
    fetchResources();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ========================================
     OPEN ADD MODAL
  ======================================== */

  const handleOpenAddModal = () => {
    setEditingSection(null);

    setSectionName("");
    setSectionSubtitle("");
    setMainSectionType("banner");
    setSectionType("hero-banner");

    setCategoryItems([]);
    setSelectedProducts([]);
    setSelectedBanners([]);
    setBannerImage("");
    setBannerLink("");
    setProductSearch("");
    setBannerSearch("");

    setItems([]);
    setShowQuickCreateCategory(false);
    setQuickCatName("");
    setQuickCatImage(null);
    setInlineEditingCatIndex(null);

    setShowSectionModal(true);
  };

  /* ========================================
     OPEN EDIT MODAL
  ======================================== */

  const handleOpenEditModal = (sec) => {
    setEditingSection(sec);

    setSectionName(sec.name || "");
    setSectionSubtitle(sec.data?.subtitle || sec.subtitle || "");
    
    const base = getSectionBaseType(sec.type, sec);
    setMainSectionType(base);
    setSectionType(sec.type || "banner");
    setProductSearch("");
    setBannerSearch("");

    const rawCategoryItems =
      sec.categoryItems && sec.categoryItems.length > 0
        ? sec.categoryItems
        : sec.data?.categoryItems && sec.data.categoryItems.length > 0
          ? sec.data.categoryItems
          : [];

    const rawCategories =
      sec.categories && sec.categories.length > 0
        ? sec.categories
        : sec.data?.categories && sec.data.categories.length > 0
          ? sec.data.categories
          : [];

    if (rawCategoryItems.length > 0) {
      setCategoryItems(
        rawCategoryItems
          .map((ci) => {
            const catId =
              typeof ci.category === "object"
                ? ci.category?._id
                : ci.category || ci.categoryId;
            const pageId =
              typeof ci.page === "object" ? ci.page?._id : ci.page || ci.pageId;
            const destType =
              ci.destinationType ||
              (ci.linkType === "page" ? "store-page" : "category-page");
            const destId =
              ci.destinationId ||
              (destType === "store-page" ? pageId : catId);
            
            const matchedGlobalCat = availableCategories.find(
              (c) => c._id === catId,
            );
            const destSlug =
              ci.destinationSlug ||
              (destType === "category-page"
                ? matchedGlobalCat?.slug || (matchedGlobalCat?.name ? matchedGlobalCat.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-") : "")
                : "");

            return {
              categoryId: catId || pageId || ci._id,
              customImage: ci.customImage || ci.image || "",
              name: ci.name || ci.title || matchedGlobalCat?.name || "",
              isActive: ci.isActive !== false,
              destinationType: destType,
              destinationId: destId || "",
              destinationSlug: destSlug || "",
            };
          })
          .filter((ci) => Boolean(ci.categoryId)),
      );
    } else if (rawCategories.length > 0) {
      setCategoryItems(
        rawCategories
          .map((c) => {
            const catId = typeof c === "object" ? c?._id : c;
            const matchedGlobalCat = availableCategories.find(
              (cg) => cg._id === catId,
            );
            return {
              categoryId: catId,
              name: typeof c === "object" ? c.name : matchedGlobalCat?.name || "",
              customImage: "",
              isActive: true,
              destinationType: "category-page",
              destinationId: catId || "",
              destinationSlug: matchedGlobalCat?.slug || "",
            };
          })
          .filter((ci) => Boolean(ci.categoryId)),
      );
    } else {
      setCategoryItems([]);
    }

    const rawProducts =
      sec.products && sec.products.length > 0
        ? sec.products
        : sec.data?.products && sec.data.products.length > 0
          ? sec.data.products
          : [];
    const prodIds = rawProducts
      .map((p) => (typeof p === "string" ? p : p?._id))
      .filter(Boolean);

    const rawBanners =
      sec.banners && sec.banners.length > 0
        ? sec.banners
        : sec.data?.banners && sec.data.banners.length > 0
          ? sec.data.banners
          : [];
    const banIds = rawBanners
      .map((b) => (typeof b === "string" ? b : b?._id))
      .filter(Boolean);

    setSelectedProducts(prodIds);
    setSelectedBanners(banIds);
    setBannerImage(sec.data?.image || sec.image || "");
    setBannerLink(
      sec.data?.link || sec.link || sec.data?.route || sec.route || "",
    );

    const rawItems =
      Array.isArray(sec.items) && sec.items.length > 0
        ? sec.items
        : Array.isArray(sec.data?.items) && sec.data.items.length > 0
          ? sec.data.items
          : [];
    setItems(rawItems);

    setShowQuickCreateCategory(false);
    setQuickCatName("");
    setQuickCatImage(null);
    setInlineEditingCatIndex(null);

    setShowSectionModal(true);
  };

  /* ========================================
     MAIN SECTION TYPE CHANGER
  ======================================== */

  const handleMainSectionTypeChange = (newMainType) => {
    setMainSectionType(newMainType);
    if (newMainType === "banner") {
      if (
        ![
          "hero-banner",
          "promo-banner",
          "promo-banner-2",
          "coupon-banner",
          "banner",
        ].includes(sectionType)
      ) {
        setSectionType("hero-banner");
      }
    } else if (newMainType === "category") {
      if (
        ![
          "category-carousel",
          "category-showcase",
          "sports-categories",
          "loved-categories",
          "equipping-champions",
          "category-nav",
          "category",
        ].includes(sectionType)
      ) {
        setSectionType("category-carousel");
      }
    } else if (newMainType === "product") {
      if (
        ![
          "product-section",
          "storm-proof",
          "outdoor-products",
          "product",
        ].includes(sectionType)
      ) {
        setSectionType("product-section");
      }
    } else if (newMainType === "other") {
      if (!["other", "everyday-essentials"].includes(sectionType)) {
        setSectionType("other");
      }
    }
  };

  /* ========================================
     CATEGORY SECTION ITEM HANDLERS
  ======================================== */

  const handleAddCategoryToSection = (catId) => {
    if (!catId) return;
    if (categoryItems.some((ci) => ci.categoryId === catId)) {
      toast.error("Category is already added to this section.");
      return;
    }
    const globalCat = availableCategories.find((c) => c._id === catId);
    const catSlug =
      globalCat?.slug ||
      (globalCat?.name
        ? globalCat.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
        : "");

    setCategoryItems((prev) => [
      ...prev,
      {
        categoryId: catId,
        name: globalCat?.name || "",
        customImage: "",
        isActive: true,
        destinationType: "category-page",
        destinationId: catId,
        destinationSlug: catSlug,
      },
    ]);
  };

  const handleUpdateCategoryItemField = (index, field, value) => {
    setCategoryItems((prev) => {
      const copy = [...prev];
      const item = { ...copy[index] };

      if (field === "destinationType") {
        item.destinationType = value;
        if (value === "store-page") {
          const globalCat = availableCategories.find(
            (c) => c._id === item.categoryId,
          );
          const matchingPage = availablePages.find(
            (p) =>
              p.slug?.toLowerCase() === globalCat?.slug?.toLowerCase() ||
              p.name?.toLowerCase() === globalCat?.name?.toLowerCase(),
          );
          item.destinationId = matchingPage?._id || availablePages[0]?._id || "";
          item.destinationSlug = matchingPage?.slug || availablePages[0]?.slug || "";
        } else if (value === "product-page") {
          const defaultProd = availableProducts[0];
          item.destinationId = defaultProd?._id || "";
          item.destinationSlug = "";
        } else if (value === "category-page") {
          const globalCat =
            availableCategories.find((c) => c._id === item.categoryId) ||
            availableCategories[0];
          item.destinationId = globalCat?._id || item.categoryId || "";
          item.destinationSlug =
            globalCat?.slug ||
            (globalCat?.name
              ? globalCat.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
              : "");
        } else if (value === "none") {
          item.destinationId = "";
          item.destinationSlug = "";
        }
      } else if (field === "destinationSelect") {
        item.destinationId = value;
        if (item.destinationType === "store-page") {
          const p = availablePages.find((pg) => pg._id === value);
          item.destinationSlug = p?.slug || "";
        } else if (item.destinationType === "category-page") {
          const c = availableCategories.find((cg) => cg._id === value);
          item.destinationSlug =
            c?.slug ||
            (c?.name
              ? c.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-")
              : "");
        }
      } else {
        item[field] = value;
      }

      copy[index] = item;
      return copy;
    });
  };

  const handleCategoryCardDragStart = (e, index) => {
    setDraggedCatCardIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleCategoryCardDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleCategoryCardDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedCatCardIndex === null || draggedCatCardIndex === targetIndex)
      return;
    setCategoryItems((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(draggedCatCardIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDraggedCatCardIndex(null);
  };

  const handleRemoveCategoryFromSection = (catId) => {
    setCategoryItems((prev) => prev.filter((ci) => ci.categoryId !== catId));
  };

  const handleMoveCategoryItem = (index, direction) => {
    setCategoryItems((prev) => {
      const copy = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= copy.length) return prev;
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const handleCustomCategoryImageUpload = async (catId, file) => {
    if (!file) return;
    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|ico|heic|heif|jfif)$/i.test(
        file.name,
      );
    if (!isImage) {
      toast.error("Please select an image file");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("image", file);
      const token = localStorage.getItem("adminToken");
      const res = await api.post("/pages/upload", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      const uploadedUrl = res.data.url;
      setCategoryItems((prev) =>
        prev.map((ci) =>
          ci.categoryId === catId ? { ...ci, customImage: uploadedUrl } : ci,
        ),
      );
      toast.success("Section-specific custom image uploaded");
    } catch (err) {
      console.error("Custom Image Upload Error:", err);
      toast.error(err?.response?.data?.message || "Failed to upload image");
    }
  };

  const handleRemoveCustomCategoryImage = (catId) => {
    setCategoryItems((prev) =>
      prev.map((ci) =>
        ci.categoryId === catId ? { ...ci, customImage: "" } : ci,
      ),
    );
  };

  const handleQuickCreateCategory = async (e) => {
    e.preventDefault();
    if (!quickCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    const trimmed = quickCatName.trim();
    const exists = availableCategories.some(
      (c) => c.name?.toLowerCase().trim() === trimmed.toLowerCase(),
    );
    if (exists) {
      toast.error("Category already exists. Use existing category.");
      return;
    }

    try {
      setCreatingCategory(true);
      const token = localStorage.getItem("adminToken");
      const formData = new FormData();
      formData.append("name", trimmed);
      if (quickCatImage) {
        formData.append("image", quickCatImage);
      }

      const res = await api.post("/categories", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      const newCategory = res.data.category;
      toast.success("Global category created successfully");
      setAvailableCategories((prev) => [...prev, newCategory]);
      handleAddCategoryToSection(newCategory._id);
      setQuickCatName("");
      setQuickCatImage(null);
      setShowQuickCreateCategory(false);
    } catch (err) {
      console.error("Quick Create Category Error:", err);
      toast.error(err?.response?.data?.message || "Failed to create category");
    } finally {
      setCreatingCategory(false);
    }
  };

  /* ========================================
     ADD OTHER ITEM
  ======================================== */

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        name: "",
        image: "",
        link: "",
      },
    ]);
  };

  /* ========================================
     REMOVE OTHER ITEM
  ======================================== */

  const handleRemoveItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  /* ========================================
     UPDATE OTHER ITEM
  ======================================== */

  const handleItemChange = (index, field, value) => {
    setItems((prev) => {
      const updated = [...prev];

      updated[index] = {
        ...updated[index],
        [field]: value,
      };

      return updated;
    });
  };

  /* ========================================
     IMAGE UPLOAD
  ======================================== */

  const handleItemImageChange = (index, file) => {
    if (!file) return;

    const isImage =
      file.type.startsWith("image/") ||
      /\.(jpg|jpeg|png|webp|svg|gif|avif|bmp|tiff|ico|heic|heif|jfif)$/i.test(
        file.name,
      );
    if (!isImage) {
      toast.error("Please select an image file");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();

    reader.onloadend = () => {
      handleItemChange(index, "image", reader.result);
    };

    reader.readAsDataURL(file);
  };

  /* ========================================
     SAVE SECTION
  ======================================== */

  const handleSaveSection = async (e) => {
    e.preventDefault();

    if (!sectionName.trim()) {
      toast.error("Please enter section name");
      return;
    }

    const currentBaseType = getSectionBaseType(sectionType, editingSection);

    /*
      Validate Category Section
    */
    if (currentBaseType === "category") {
      if (categoryItems.length === 0) {
        toast.error("Please add at least one category to this section");
        return;
      }
      const ids = categoryItems.map((ci) => ci.categoryId);
      if (new Set(ids).size !== ids.length) {
        toast.error(
          "Duplicate categories inside the same section are strictly prohibited.",
        );
        return;
      }
    }

    /*
      Validate Other Section
    */
    if (currentBaseType === "other") {
      if (items.length === 0) {
        toast.error("Please add at least one item");
        return;
      }

      const invalidItem = items.find(
        (item) => !item.name?.trim() || !item.image,
      );

      if (invalidItem) {
        toast.error("Every item needs a name and image");
        return;
      }
    }

    try {
      setSavingSection(true);

      const token = localStorage.getItem("adminToken");

      const headers = {
        Authorization: `Bearer ${token}`,
      };

        const mappedCategoryItems =
          currentBaseType === "category"
            ? categoryItems.map((ci, idx) => {
                const globalCat = availableCategories.find(
                  (c) => c._id === ci.categoryId,
                );
                const destType = ci.destinationType || "category-page";
                let destId = ci.destinationId || "";
                let destSlug = (ci.destinationSlug || "").trim();

                if (destType === "category-page") {
                  if (!destId) destId = ci.categoryId;
                  if (!destSlug) {
                    destSlug =
                      globalCat?.slug ||
                      (globalCat?.name
                        ? globalCat.name
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, "-")
                        : "");
                  }
                } else if (destType === "store-page") {
                  if (!destSlug && destId) {
                    const pg = availablePages.find((p) => p._id === destId);
                    if (pg) destSlug = pg.slug;
                  }
                }

                let link = "";
                if (destType === "store-page") {
                  link = destSlug ? `/${destSlug.replace(/^\//, "")}` : "";
                } else if (destType === "product-page") {
                  link = destId ? `/product/${destId}` : "";
                } else if (destType === "category-page") {
                  link = destSlug
                    ? `/category/${destSlug.replace(/^\/category\//, "").replace(/^\//, "")}`
                    : "";
                } else if (destType === "none") {
                  link = "";
                }

                return {
                  category: ci.categoryId,
                  name: ci.name || globalCat?.name || "",
                  title: ci.name || globalCat?.name || "",
                  customImage: ci.customImage || "",
                  image: ci.customImage || "",
                  isActive: ci.isActive !== false,
                  destinationType: destType,
                  destinationId: destId,
                  destinationSlug: destSlug,
                  linkType: destType === "store-page" ? "page" : "category",
                  link,
                  page: destType === "store-page" ? destId : undefined,
                  displayOrder: idx,
                  sortOrder: idx,
                };
              })
            : [];

        const payload = {
        name: sectionName.trim(),
        type: sectionType,
        subtitle: sectionSubtitle.trim(),
        image: currentBaseType === "banner" ? bannerImage : "",
        link: currentBaseType === "banner" ? bannerLink : "",

        categoryItems: mappedCategoryItems,

        categories:
          currentBaseType === "category"
            ? categoryItems.map((ci) => ci.categoryId)
            : [],

        products: currentBaseType === "product" ? selectedProducts : [],

        banners: currentBaseType === "banner" ? selectedBanners : [],

        items:
          currentBaseType === "other"
            ? items.map((item) => ({
                name: item.name.trim(),
                image: item.image,
                link: item.link?.trim() || "",
              }))
            : [],

        data: {
          title: sectionName.trim(),
          subtitle: sectionSubtitle.trim(),
          image: currentBaseType === "banner" ? bannerImage : "",
          link: currentBaseType === "banner" ? bannerLink : "",
          products: currentBaseType === "product" ? selectedProducts : [],
          banners: currentBaseType === "banner" ? selectedBanners : [],
          categories:
            currentBaseType === "category"
              ? categoryItems.map((ci) => ci.categoryId)
              : [],
          categoryItems: mappedCategoryItems,
          items:
            currentBaseType === "other"
              ? items.map((item) => ({
                  name: item.name.trim(),
                  image: item.image,
                  link: item.link?.trim() || "",
                }))
              : [],
        },
      };

      if (editingSection) {
        await api.put(`/pages/${id}/sections/${editingSection._id}`, payload, {
          headers,
        });

        toast.success("Section updated successfully");
      } else {
        await api.post(`/pages/${id}/sections`, payload, {
          headers,
        });

        toast.success("Section added successfully");
      }

      setShowSectionModal(false);

      fetchPageDetails(false);
    } catch (error) {
      console.error("Save Section Error:", error);

      toast.error(error?.response?.data?.message || "Failed to save section");
    } finally {
      setSavingSection(false);
    }
  };

  /* ========================================
     TOGGLE SECTION
  ======================================== */

  const handleToggleSectionActive = async (sec) => {
    // 1. Optimistic update
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: (prev.sections || []).map((s) =>
          s._id === sec._id ? { ...s, isActive: !s.isActive } : s,
        ),
      };
    });

    try {
      const token = localStorage.getItem("adminToken");

      await api.put(
        `/pages/${id}/sections/${sec._id}`,
        {
          isActive: !sec.isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success(`Section ${sec.isActive ? "disabled" : "enabled"}`);

      fetchPageDetails(false);
    } catch (error) {
      console.error("Toggle Section Error:", error);
      toast.error("Failed to update section");
      fetchPageDetails(false);
    }
  };

  /* ========================================
     DELETE SECTION
  ======================================== */

  const handleDeleteSection = async (sec) => {
    if (
      !window.confirm(`Are you sure you want to delete section '${sec.name}'?`)
    ) {
      return;
    }

    // 1. Optimistic delete
    setPage((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        sections: (prev.sections || []).filter((s) => s._id !== sec._id),
      };
    });

    try {
      const token = localStorage.getItem("adminToken");

      await api.delete(`/pages/${id}/sections/${sec._id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Section deleted successfully");

      fetchPageDetails(false);
    } catch (error) {
      console.error("Delete Section Error:", error);

      toast.error("Failed to delete section");
      fetchPageDetails(false);
    }
  };

  /* ========================================
     REORDER
  ======================================== */

  const handleSaveReorder = async (updatedSections) => {
    try {
      const token = localStorage.getItem("adminToken");

      const sectionIds = updatedSections.map((s) => s._id);

      setPage((prev) => ({
        ...prev,
        sections: updatedSections,
      }));

      await api.put(
        `/pages/${id}/sections/reorder`,
        {
          sectionIds,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      toast.success("Section layout order updated");
      fetchPageDetails(false);
    } catch (error) {
      console.error("Reorder Error:", error);

      toast.error("Failed to update section order");

      fetchPageDetails(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);

    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();

    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      return;
    }

    const sectionsCopy = [...page.sections];

    const [moved] = sectionsCopy.splice(draggedIndex, 1);

    sectionsCopy.splice(targetIndex, 0, moved);

    setDraggedIndex(null);

    handleSaveReorder(sectionsCopy);
  };

  /* ========================================
     PRODUCT SELECTION
  ======================================== */

  const toggleProductSelection = (prodId) => {
    setSelectedProducts((prev) =>
      prev.includes(prodId)
        ? prev.filter((i) => i !== prodId)
        : [...prev, prodId],
    );
  };

  /* ========================================
     BANNER SELECTION
  ======================================== */

  const toggleBannerSelection = (banId) => {
    setSelectedBanners((prev) =>
      prev.includes(banId) ? prev.filter((i) => i !== banId) : [...prev, banId],
    );
  };

  const currentBaseType = mainSectionType;

  /* ========================================
     LOADING
  ======================================== */

  if (loading && !page) {
    return (
      <div className="page-builder-loading-skeleton">
        <div className="builder-header-skeleton"></div>
        <div className="builder-sections-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="builder-row-skeleton"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!page) {
    return <div className="page-builder-error">Page not found</div>;
  }

  /* ========================================
     UI
  ======================================== */

  return (
    <div className="page-builder">
      {/* HEADER */}

      <div className="builder-header">
        <button
          type="button"
          className="back-btn"
          onClick={() => navigate("/pages")}
        >
          <MdArrowBack />

          <span>Back to Pages</span>
        </button>

        <div className="builder-title">
          <h2>
            {page.name}

            <span className="builder-slug">/{page.slug}</span>
          </h2>

          <p>Configure sections, content, and order for this page</p>
        </div>

        <button
          type="button"
          className="add-section-btn"
          onClick={handleOpenAddModal}
        >
          <MdAdd />

          <span>+ Add Section</span>
        </button>
      </div>

      {/* SECTIONS */}

      <div className="builder-sections-container">
        {page.sections?.length === 0 ? (
          <div className="sections-empty-state">
            <div className="empty-icon">🧩</div>

            <h3>No sections added yet</h3>

            <p>Click "+ Add Section" to build this page layout</p>

            <button
              type="button"
              className="add-section-btn"
              onClick={handleOpenAddModal}
            >
              <MdAdd />

              <span>Add First Section</span>
            </button>
          </div>
        ) : (
          <div className="sections-list">
            {page.sections.map((sec, idx) => (
              <div
                key={sec._id}
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                className={`section-row-card ${
                  sec.isActive ? "" : "disabled"
                } ${draggedIndex === idx ? "dragging" : ""}`}
              >
                {/* DRAG */}

                <div className="section-drag-handle" title="Drag to reorder">
                  <MdDragIndicator />

                  <span className="section-index">{idx + 1}</span>
                </div>

                {/* INFO */}

                <div className="section-row-info">
                  <div className="section-row-header">
                    <h4>{sec.name}</h4>

                    {(() => {
                      const base = getSectionBaseType(sec.type, sec);
                      return (
                        <span className={`type-tag ${sec.type} ${base}`}>
                          {base === "category" && <MdCategory />}
                          {base === "product" && <MdInventory2 />}
                          {base === "banner" && <MdImage />}
                          {base === "other" && <MdLink />}
                          <span>
                            {(sec.type || "section")
                              .replace(/-/g, " ")
                              .toUpperCase()}
                          </span>
                        </span>
                      );
                    })()}
                  </div>

                  <div className="section-items-summary">
                    {(() => {
                      const base = getSectionBaseType(sec.type, sec);
                      if (base === "category") {
                        const count =
                          sec.categoryItems?.length ||
                          sec.categories?.length ||
                          sec.data?.categoryItems?.length ||
                          sec.data?.categories?.length ||
                          0;
                        return <span>{count} Categories selected</span>;
                      }
                      if (base === "product") {
                        const count =
                          sec.products?.length ||
                          sec.data?.products?.length ||
                          0;
                        return <span>{count} Products selected</span>;
                      }
                      if (base === "banner") {
                        const count =
                          sec.banners?.length ||
                          sec.data?.banners?.length ||
                          (sec.data?.image || sec.image ? 1 : 0);
                        return <span>{count} Banners selected</span>;
                      }
                      if (base === "other") {
                        const count =
                          sec.items?.length || sec.data?.items?.length || 0;
                        return <span>{count} Custom items added</span>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                {/* ACTIONS */}

                <div className="section-row-actions">
                  <button
                    type="button"
                    className={`status-pill ${
                      sec.isActive ? "active" : "inactive"
                    }`}
                    onClick={() => handleToggleSectionActive(sec)}
                  >
                    {sec.isActive ? <MdCheckCircle /> : <MdCancel />}

                    <span>{sec.isActive ? "Active" : "Disabled"}</span>
                  </button>

                  <button
                    type="button"
                    className="view-sec-btn"
                    onClick={() => handleOpenViewModal(sec)}
                    title="View Section"
                  >
                    <MdVisibility />
                  </button>

                  <button
                    type="button"
                    className="edit-sec-btn"
                    onClick={() => handleOpenEditModal(sec)}
                    title="Edit Section"
                  >
                    <MdEdit />
                  </button>

                  <button
                    type="button"
                    className="delete-sec-btn"
                    onClick={() => handleDeleteSection(sec)}
                    title="Delete Section"
                  >
                    <MdDelete />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================
          SECTION MODAL
      ======================================== */}

      {showSectionModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSectionModal(false)}
        >
          <div
            className="modal-container section-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSection ? "Edit Section" : "Add Section"}
              </h3>
              <button
                type="button"
                className="close-modal-btn"
                onClick={() => setShowSectionModal(false)}
                title="Close"
              >
                ✕
              </button>
            </div>

            {/* FORM */}
            <form onSubmit={handleSaveSection} className="modal-form">
              {/* SECTION TYPE (CLEAN SEGMENTED TABS) */}
              <div className="form-group">
                <label className="form-label">Section Type *</label>
                <div className="simple-type-tabs">
                  {MAIN_SECTION_TYPES.map((st) => {
                    const isSelected = mainSectionType === st.type;
                    return (
                      <button
                        key={st.type}
                        type="button"
                        className={`simple-type-tab ${isSelected ? "active" : ""}`}
                        onClick={() => handleMainSectionTypeChange(st.type)}
                      >
                        <span className="simple-type-tab-icon">{st.icon}</span>
                        <span>{st.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION NAME */}
              <div className="form-group">
                <label className="form-label">Section Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Popular Categories, Hero Banner"
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  required
                  className="form-input"
                />
              </div>

              {/* SECTION SUBTITLE */}
              <div className="form-group">
                <label className="form-label">Section Subtitle (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Style Approved, Explore best of..."
                  value={sectionSubtitle}
                  onChange={(e) => setSectionSubtitle(e.target.value)}
                  className="form-input"
                />
              </div>

              {/* ========================================
                  CATEGORY PICKER
              ======================================== */}

              {currentBaseType === "category" && (
                <div className="resource-picker-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                      flexWrap: "wrap",
                      gap: "10px",
                    }}
                  >
                    <label
                      style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}
                    >
                      Categories in this Section ({categoryItems.length} added)
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setShowQuickCreateCategory(!showQuickCreateCategory)
                      }
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "6px 12px",
                        background: "#eff6ff",
                        border: "1px solid #93c5fd",
                        color: "#1d4ed8",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      <MdAdd />
                      <span>
                        {showQuickCreateCategory
                          ? "Close Quick Category Form"
                          : "+ Quick Create Global Category"}
                      </span>
                    </button>
                  </div>

                  {/* QUICK CREATE GLOBAL CATEGORY FORM */}
                  {showQuickCreateCategory && (
                    <div
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "8px",
                        padding: "16px",
                        marginBottom: "16px",
                      }}
                    >
                      <h5
                        style={{
                          margin: "0 0 10px",
                          fontSize: "14px",
                          fontWeight: "700",
                          color: "#1e293b",
                        }}
                      >
                        Create New Global Category
                      </h5>
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          flexWrap: "wrap",
                          alignItems: "flex-end",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: "180px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "4px",
                              display: "block",
                            }}
                          >
                            Category Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Running Gear, Rain Jackets"
                            value={quickCatName}
                            onChange={(e) => setQuickCatName(e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1px solid #cbd5e1",
                              fontSize: "13px",
                            }}
                          />
                        </div>

                        <div style={{ minWidth: "160px" }}>
                          <label
                            style={{
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#475569",
                              marginBottom: "4px",
                              display: "block",
                            }}
                          >
                            Default Image (Optional)
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              setQuickCatImage(e.target.files?.[0] || null)
                            }
                            style={{ fontSize: "12px" }}
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleQuickCreateCategory}
                          disabled={creatingCategory}
                          style={{
                            padding: "8px 16px",
                            background: "#2563eb",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: "600",
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          {creatingCategory
                            ? "Creating..."
                            : "Create & Add to Section"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CATEGORY SELECTOR DROPDOWN */}
                  <div
                    style={{
                      marginBottom: "14px",
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddCategoryToSection(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "8px",
                        border: "1px solid #cbd5e1",
                        fontSize: "14px",
                        background: "#ffffff",
                      }}
                    >
                      <option value="" disabled>
                        -- Select an existing global category to add --
                      </option>
                      {availableCategories.map((cat) => (
                        <option
                          key={cat._id}
                          value={cat._id}
                          disabled={categoryItems.some(
                            (ci) => ci.categoryId === cat._id,
                          )}
                        >
                          {cat.name}{" "}
                          {categoryItems.some((ci) => ci.categoryId === cat._id)
                            ? "(Already in Section)"
                            : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ADDED CATEGORIES LIST WITH CUSTOM IMAGE OVERRIDES */}
                  {categoryItems.length === 0 ? (
                    <div
                      style={{
                        padding: "24px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "8px",
                        color: "#64748b",
                        fontSize: "13px",
                        marginBottom: "16px",
                      }}
                    >
                      No categories added to this section yet. Choose from the
                      dropdown above or click on any available category below.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "10px",
                        marginBottom: "20px",
                        maxHeight: "340px",
                        overflowY: "auto",
                        paddingRight: "4px",
                      }}
                    >
                      {categoryItems.map((ci, index) => {
                        const globalCat = availableCategories.find(
                          (c) => c._id === ci.categoryId,
                        );
                        const defaultImg = globalCat?.image
                          ? getImageUrl(globalCat.image)
                          : "";
                        const activeImg = ci.customImage
                          ? getImageUrl(ci.customImage)
                          : defaultImg;
                        const isEditingThis = inlineEditingCatIndex === index;

                        return (
                          <div
                            key={ci.categoryId || index}
                            className={`section-cat-card ${
                              draggedCatCardIndex === index ? "dragging" : ""
                            }`}
                            draggable
                            onDragStart={(e) =>
                              handleCategoryCardDragStart(e, index)
                            }
                            onDragOver={(e) => handleCategoryCardDragOver(e)}
                            onDrop={(e) => handleCategoryCardDrop(e, index)}
                          >
                            <div className="section-cat-card-main">
                              {/* DRAG HANDLE */}
                              <div
                                className="section-cat-drag-handle"
                                title="Drag to reorder category"
                              >
                                <MdDragIndicator />
                              </div>

                              {/* PREVIEW THUMBNAIL */}
                              <div className="section-cat-thumb">
                                {activeImg ? (
                                  <img
                                    src={activeImg}
                                    alt={ci.name || globalCat?.name}
                                  />
                                ) : (
                                  <MdCategory
                                    style={{
                                      fontSize: "22px",
                                      color: "#94a3b8",
                                    }}
                                  />
                                )}
                              </div>

                              {/* INFO & DESTINATION CONTROLS */}
                              <div className="section-cat-content">
                                {/* NAME & ACTIVE TOGGLE ROW */}
                                <div className="section-cat-top-row">
                                  <div className="section-cat-name">
                                    <span>
                                      {ci.name || globalCat?.name || "Category"}
                                    </span>
                                    {ci.customImage && (
                                      <span
                                        className="section-cat-custom-badge"
                                        title="Custom section image override active"
                                      >
                                        ★ Custom Img
                                      </span>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className={`section-cat-status-badge ${
                                      ci.isActive !== false
                                        ? "active"
                                        : "inactive"
                                    }`}
                                    onClick={() =>
                                      handleUpdateCategoryItemField(
                                        index,
                                        "isActive",
                                        ci.isActive === false,
                                      )
                                    }
                                    title="Click to toggle Active / Inactive"
                                  >
                                    {ci.isActive !== false
                                      ? "● Active"
                                      : "○ Inactive"}
                                  </button>
                                </div>

                                {/* DESTINATION SELECTOR ROW */}
                                <div className="section-cat-dest-grid">
                                  <div className="section-cat-dest-field">
                                    <label className="section-cat-dest-label">
                                      Destination Type
                                    </label>
                                    <select
                                      value={ci.destinationType || "store-page"}
                                      onChange={(e) =>
                                        handleUpdateCategoryItemField(
                                          index,
                                          "destinationType",
                                          e.target.value,
                                        )
                                      }
                                      className="section-cat-select"
                                    >
                                      <option value="store-page">
                                        Store Page
                                      </option>
                                      <option value="product-page">
                                        Product Page
                                      </option>
                                      <option value="category-page">
                                        Category Page
                                      </option>
                                      <option value="none">None</option>
                                    </select>
                                  </div>

                                  {ci.destinationType === "store-page" && (
                                    <div className="section-cat-dest-field">
                                      <label className="section-cat-dest-label">
                                        Store Page
                                      </label>
                                      <select
                                        value={ci.destinationId || ""}
                                        onChange={(e) =>
                                          handleUpdateCategoryItemField(
                                            index,
                                            "destinationSelect",
                                            e.target.value,
                                          )
                                        }
                                        className="section-cat-select"
                                      >
                                        <option value="" disabled>
                                          -- Select Store Page --
                                        </option>
                                        {availablePages.map((pg) => (
                                          <option key={pg._id} value={pg._id}>
                                            {pg.name} (/{pg.slug})
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {ci.destinationType === "product-page" && (
                                    <div className="section-cat-dest-field">
                                      <label className="section-cat-dest-label">
                                        Product
                                      </label>
                                      <select
                                        value={ci.destinationId || ""}
                                        onChange={(e) =>
                                          handleUpdateCategoryItemField(
                                            index,
                                            "destinationSelect",
                                            e.target.value,
                                          )
                                        }
                                        className="section-cat-select"
                                      >
                                        <option value="" disabled>
                                          -- Select Product --
                                        </option>
                                        {availableProducts.map((p) => (
                                          <option key={p._id} value={p._id}>
                                            {p.name}{" "}
                                            {p.price ? `(₹${p.price})` : ""}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {ci.destinationType === "category-page" && (
                                    <div className="section-cat-dest-field">
                                      <label className="section-cat-dest-label">
                                        Category
                                      </label>
                                      <select
                                        value={ci.destinationId || ci.categoryId || ""}
                                        onChange={(e) =>
                                          handleUpdateCategoryItemField(
                                            index,
                                            "destinationSelect",
                                            e.target.value,
                                          )
                                        }
                                        className="section-cat-select"
                                      >
                                        <option value="" disabled>
                                          -- Select Category --
                                        </option>
                                        {availableCategories.map((c) => (
                                          <option key={c._id} value={c._id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* ACTION BUTTONS */}
                              <div className="section-cat-actions">
                                <button
                                  type="button"
                                  className="section-cat-btn"
                                  onClick={() =>
                                    setInlineEditingCatIndex(
                                      isEditingThis ? null : index,
                                    )
                                  }
                                  title="Edit display name or custom image"
                                >
                                  <MdEdit />
                                  <span>Edit</span>
                                </button>

                                <button
                                  type="button"
                                  className="section-cat-btn delete"
                                  onClick={() =>
                                    handleRemoveCategoryFromSection(
                                      ci.categoryId,
                                    )
                                  }
                                  title="Remove from section"
                                >
                                  <MdDelete />
                                  <span>Delete</span>
                                </button>

                                <div className="section-cat-reorder-group">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() =>
                                      handleMoveCategoryItem(index, "up")
                                    }
                                    className="section-cat-reorder-btn"
                                    title="Move Up"
                                  >
                                    <MdKeyboardArrowUp />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      index === categoryItems.length - 1
                                    }
                                    onClick={() =>
                                      handleMoveCategoryItem(index, "down")
                                    }
                                    className="section-cat-reorder-btn"
                                    title="Move Down"
                                  >
                                    <MdKeyboardArrowDown />
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* INLINE EDIT PANEL */}
                            {isEditingThis && (
                              <div className="section-cat-inline-edit">
                                <div className="section-cat-inline-row">
                                  <div className="section-cat-inline-field">
                                    <label>Display Name</label>
                                    <input
                                      type="text"
                                      placeholder={
                                        globalCat?.name || "Category Name"
                                      }
                                      value={ci.name || ""}
                                      onChange={(e) =>
                                        handleUpdateCategoryItemField(
                                          index,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                    />
                                  </div>
                                  <div className="section-cat-inline-field">
                                    <label>Custom Image Override</label>
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "8px",
                                        alignItems: "center",
                                      }}
                                    >
                                      <label className="section-cat-upload-label">
                                        <MdUploadFile />
                                        <span>
                                          {ci.customImage
                                            ? "Change Image"
                                            : "Upload Image"}
                                        </span>
                                        <input
                                          type="file"
                                          accept="image/*"
                                          style={{ display: "none" }}
                                          onChange={(e) => {
                                            if (e.target.files?.[0]) {
                                              handleCustomCategoryImageUpload(
                                                ci.categoryId,
                                                e.target.files[0],
                                              );
                                            }
                                          }}
                                        />
                                      </label>
                                      {ci.customImage && (
                                        <button
                                          type="button"
                                          className="section-cat-revert-btn"
                                          onClick={() =>
                                            handleRemoveCustomCategoryImage(
                                              ci.categoryId,
                                            )
                                          }
                                        >
                                          Revert
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    textAlign: "right",
                                    marginTop: "8px",
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="section-cat-done-btn"
                                    onClick={() =>
                                      setInlineEditingCatIndex(null)
                                    }
                                  >
                                    Done
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* QUICK ADD GRID */}
                  <div>
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: "#475569",
                        marginBottom: "8px",
                        display: "block",
                      }}
                    >
                      Or click an available category below to add:
                    </label>
                    <div className="resource-picker-grid">
                      {availableCategories.map((cat) => {
                        const isAdded = categoryItems.some(
                          (ci) => ci.categoryId === cat._id,
                        );
                        return (
                          <div
                            key={cat._id}
                            className={`picker-card ${
                              isAdded ? "selected" : ""
                            }`}
                            onClick={() => {
                              if (isAdded) {
                                toast.error(
                                  "Category is already added to this section.",
                                );
                              } else {
                                handleAddCategoryToSection(cat._id);
                              }
                            }}
                            style={{
                              cursor: isAdded ? "not-allowed" : "pointer",
                              opacity: isAdded ? 0.75 : 1,
                            }}
                          >
                            <div className="picker-img">
                              {cat.image ? (
                                <img
                                  src={getImageUrl(cat.image)}
                                  alt={cat.name}
                                />
                              ) : (
                                <MdCategory />
                              )}
                            </div>
                            <span>
                              {cat.name} {isAdded ? "✓" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ========================================
                  PRODUCT PICKER
              ======================================== */}

              {currentBaseType === "product" && (
                <div className="resource-picker-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <label
                      style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}
                    >
                      Select Products ({selectedProducts.length} selected)
                    </label>
                    {availableProducts.length > 4 && (
                      <input
                        type="text"
                        placeholder="Search products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          width: "180px",
                        }}
                      />
                    )}
                  </div>

                  <div className="resource-picker-grid">
                    {availableProducts
                      .filter(
                        (prod) =>
                          !productSearch ||
                          prod.name
                            ?.toLowerCase()
                            .includes(productSearch.toLowerCase()),
                      )
                      .map((prod) => (
                        <div
                          key={prod._id}
                          className={`picker-card ${
                            selectedProducts.includes(prod._id)
                              ? "selected"
                              : ""
                          }`}
                          onClick={() => toggleProductSelection(prod._id)}
                        >
                          <div className="picker-img">
                            {prod.images?.[0] ? (
                              <img
                                src={getImageUrl(prod.images[0])}
                                alt={prod.name}
                              />
                            ) : (
                              <MdInventory2 />
                            )}
                          </div>

                          <span>{prod.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* ========================================
                  BANNER PICKER
              ======================================== */}

              {currentBaseType === "banner" && (
                <div className="resource-picker-group">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    <label
                      style={{ margin: 0, fontWeight: "700", fontSize: "14px" }}
                    >
                      Select Banners ({selectedBanners.length} selected)
                    </label>
                    {availableBanners.length > 3 && (
                      <input
                        type="text"
                        placeholder="Search banners..."
                        value={bannerSearch}
                        onChange={(e) => setBannerSearch(e.target.value)}
                        style={{
                          padding: "4px 10px",
                          fontSize: "12px",
                          border: "1px solid #cbd5e1",
                          borderRadius: "6px",
                          width: "180px",
                        }}
                      />
                    )}
                  </div>

                  {availableBanners.length === 0 ? (
                    <div
                      style={{
                        padding: "16px",
                        textAlign: "center",
                        background: "#f8fafc",
                        border: "1px dashed #cbd5e1",
                        borderRadius: "8px",
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      No saved banners available yet. You can upload a direct
                      banner image below.
                    </div>
                  ) : (
                    <div className="resource-picker-grid">
                      {availableBanners
                        .filter(
                          (ban) =>
                            !bannerSearch ||
                            ban.title
                              ?.toLowerCase()
                              .includes(bannerSearch.toLowerCase()),
                        )
                        .map((ban) => (
                          <div
                            key={ban._id}
                            className={`picker-card ${
                              selectedBanners.includes(ban._id)
                                ? "selected"
                                : ""
                            }`}
                            onClick={() => toggleBannerSelection(ban._id)}
                          >
                            <div className="picker-img">
                              {ban.image ? (
                                <img
                                  src={getImageUrl(ban.image)}
                                  alt={ban.title || "Banner"}
                                />
                              ) : (
                                <MdImage />
                              )}
                            </div>
                            <span>
                              {ban.title || "Banner"}{" "}
                              {selectedBanners.includes(ban._id) ? "✓" : ""}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* DIRECT BANNER IMAGE & LINK FALLBACK */}
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "14px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <label
                      style={{
                        fontSize: "13px",
                        fontWeight: "700",
                        color: "#334155",
                        display: "block",
                        marginBottom: "8px",
                      }}
                    >
                      Direct Banner Image & Target Link (Optional / Fallback):
                    </label>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Image URL or Upload:
                        </label>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <input
                            type="text"
                            placeholder="e.g. /uploads/... or https://..."
                            value={bannerImage}
                            onChange={(e) => setBannerImage(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "8px 10px",
                              fontSize: "13px",
                              border: "1px solid #cbd5e1",
                              borderRadius: "6px",
                            }}
                          />
                          <label
                            style={{
                              cursor: "pointer",
                              padding: "8px 12px",
                              background: "#e2e8f0",
                              borderRadius: "6px",
                              fontSize: "12px",
                              fontWeight: "600",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Upload
                            <input
                              type="file"
                              accept="image/*"
                              hidden
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                  const formData = new FormData();
                                  formData.append("image", file);
                                  const token =
                                    localStorage.getItem("adminToken");
                                  const res = await api.post(
                                    "/pages/upload",
                                    formData,
                                    {
                                      headers: {
                                        Authorization: `Bearer ${token}`,
                                        "Content-Type": "multipart/form-data",
                                      },
                                    },
                                  );
                                  setBannerImage(res.data.url);
                                  toast.success("Banner image uploaded");
                                } catch (err) {
                                  toast.error("Failed to upload banner image");
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: "12px",
                            color: "#64748b",
                            display: "block",
                            marginBottom: "4px",
                          }}
                        >
                          Target Link / Route:
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. /category/running or /products"
                          value={bannerLink}
                          onChange={(e) => setBannerLink(e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 10px",
                            fontSize: "13px",
                            border: "1px solid #cbd5e1",
                            borderRadius: "6px",
                          }}
                        />
                      </div>
                    </div>
                    {bannerImage && (
                      <div
                        style={{
                          marginTop: "10px",
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <img
                          src={getImageUrl(bannerImage)}
                          alt="Banner Preview"
                          style={{
                            maxHeight: "70px",
                            borderRadius: "6px",
                            objectFit: "contain",
                            border: "1px solid #cbd5e1",
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setBannerImage("")}
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            color: "#ef4444",
                            border: "1px solid #fca5a5",
                            background: "#fef2f2",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Remove Direct Image
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ========================================
                  OTHER SECTION
              ======================================== */}

              {currentBaseType === "other" && (
                <div className="other-section-builder">
                  <p className="other-section-description">
                    Upload custom images, enter titles, and optionally add a
                    link for each item.
                  </p>

                  {/* EMPTY */}

                  {items.length === 0 && (
                    <div className="other-empty-state">
                      <MdImage />

                      <p>No items added yet.</p>

                      <span>Use the button below to add your first item.</span>
                    </div>
                  )}

                  {/* ITEMS */}

                  {items.map((item, index) => (
                    <div className="other-item-builder" key={index}>
                      {/* ITEM HEADER */}

                      <div className="other-item-header">
                        <strong>+ Item {index + 1}</strong>

                        <button
                          type="button"
                          className="remove-other-item"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <MdDelete />
                          Remove
                        </button>
                      </div>

                      {/* NAME */}

                      <div className="other-item-fields">
                        <div className="other-field">
                          <label>Item Name *</label>

                          <input
                            type="text"
                            placeholder="e.g. Monsoon Essentials"
                            value={item.name || ""}
                            onChange={(e) =>
                              handleItemChange(index, "name", e.target.value)
                            }
                          />
                        </div>

                        {/* LINK */}

                        <div className="other-field">
                          <label>Link / Category Route (Optional)</label>

                          <input
                            type="text"
                            placeholder="/monsoon-essentials"
                            value={item.link || ""}
                            onChange={(e) =>
                              handleItemChange(index, "link", e.target.value)
                            }
                          />
                        </div>
                      </div>

                      {/* IMAGE */}

                      <div className="other-image-row">
                        <label className="other-upload-box">
                          <MdImage />

                          <span>
                            {item.image ? "Change Image" : "Upload Image"}
                          </span>

                          <input
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={(e) =>
                              handleItemImageChange(index, e.target.files?.[0])
                            }
                          />
                        </label>

                        {/* PREVIEW */}

                        {item.image && (
                          <div className="other-image-preview">
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name || "Preview"}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* ADD ITEM */}

                  <button
                    type="button"
                    className="add-other-item-btn"
                    onClick={handleAddItem}
                  >
                    <MdAdd />

                    <span>Add New Item</span>
                  </button>
                </div>
              )}

              {/* ACTIONS */}

              <div className="modal-actions section-modal-sticky-footer">
                <button
                  type="button"
                  className="cancel-btn section-modal-cancel-btn"
                  onClick={() => setShowSectionModal(false)}
                  disabled={savingSection}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-btn section-modal-submit-btn"
                  disabled={savingSection}
                >
                  {savingSection
                    ? "Saving..."
                    : editingSection
                      ? "Save Changes"
                      : "Add Section"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW SECTION PREVIEW MODAL */}
      {showViewModal &&
        viewingSection &&
        (() => {
          return (
            <div className="modal-overlay" onClick={handleCloseViewModal}>
              <div
                className="modal-container view-section-modal-container"
                onClick={(e) => e.stopPropagation()}
              >
                {/* MODAL HEADER */}
                <div className="view-modal-header">
                  <div className="view-modal-header-left">
                    <div className="view-modal-title-row">
                      <MdVisibility className="view-modal-icon" />
                      <h3>{viewingSection.name || "Category Carousel"}</h3>
                      <span className={`type-tag ${viewingSection.type || ""}`}>
                        {(viewingSection.type || "CATEGORY CAROUSEL")
                          .replace(/-/g, " ")
                          .toUpperCase()}
                      </span>
                      <span
                        className={`view-modal-status-pill ${
                          viewingSection.isActive !== false
                            ? "active"
                            : "inactive"
                        }`}
                      >
                        {viewingSection.isActive !== false
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </span>
                      <span className="preview-edit-mode-badge">EDIT MODE</span>
                    </div>
                    <p className="view-modal-subtitle">
                      {`Manage items in this section (${page?.name} /${page?.slug})`}
                    </p>
                  </div>

                  <div className="view-modal-header-controls">
                    {/* ONLY CLOSE BUTTON */}
                    <button
                      type="button"
                      className="modal-close-btn"
                      onClick={handleCloseViewModal}
                      title="Close Preview (Esc)"
                    >
                      <MdClose />
                    </button>
                  </div>
                </div>

                {/* MODAL BODY — management list for ALL section types */}
                <div className="view-modal-body">
                  <div className="category-mgmt-container">
                    {carouselCategories.length === 0 ? (
                      <div className="category-mgmt-empty">
                        <MdInventory2 />
                        <h4>No items in this section</h4>
                        <p>
                          Use the Edit Section button to add items to this
                          section.
                        </p>
                      </div>
                    ) : (
                      carouselCategories.map((cat, index) => (
                        <div
                          key={cat._id || cat.itemId || index}
                          className={`category-mgmt-row ${
                            draggedCatIndex === index ? "is-dragging" : ""
                          } ${cat.isActive ? "is-active" : "is-inactive"}`}
                          draggable
                          onDragStart={(e) => handleCategoryDragStart(e, index)}
                          onDragOver={handleCategoryDragOver}
                          onDrop={(e) => handleCategoryDrop(e, index)}
                        >
                          {/* 1. Drag handle */}
                          <div
                            className="cat-drag-handle"
                            title="Drag to reorder"
                          >
                            <MdDragIndicator />
                          </div>

                          {/* 2. Thumbnail */}
                          <div className="cat-thumbnail-wrap">
                            {cat.image ? (
                              <img
                                src={getImageUrl(cat.image)}
                                alt={cat.name}
                                className="cat-thumbnail-img"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                  if (e.target.nextSibling) {
                                    e.target.nextSibling.style.display = "flex";
                                  }
                                }}
                              />
                            ) : null}
                            <div
                              className="cat-thumbnail-fallback"
                              style={{ display: cat.image ? "none" : "flex" }}
                            >
                              {cat.linkType === "product" ? (
                                <MdInventory2 />
                              ) : cat.linkType === "banner" ? (
                                <MdImage />
                              ) : (
                                <MdCategory />
                              )}
                            </div>
                          </div>

                          {/* 3. Name + type pill */}
                          <div className="cat-details">
                            <span className="cat-name">{cat.name}</span>
                            {cat.linkType && (
                              <span className="cat-link-type-pill">
                                {cat.linkType}
                              </span>
                            )}
                          </div>

                          {/* 4+5+6. Actions */}
                          <div className="cat-row-actions">
                            <button
                              type="button"
                              className={`cat-active-toggle-btn ${
                                cat.isActive ? "status-on" : "status-off"
                              }`}
                              onClick={() => handleToggleCategoryActive(index)}
                              title={
                                cat.isActive
                                  ? "Active on storefront — click to disable"
                                  : "Disabled — click to enable on storefront"
                              }
                            >
                              <span className="toggle-indicator-dot"></span>
                              <span className="toggle-text">
                                {cat.isActive ? "ON" : "OFF"}
                              </span>
                            </button>

                            <button
                              type="button"
                              className="cat-action-btn edit-cat-btn"
                              onClick={() =>
                                handleOpenCategoryItemEdit(cat, index)
                              }
                              title="Edit item details"
                            >
                              <MdEdit />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              className="cat-action-btn delete-cat-btn"
                              onClick={() => handleDeleteCategory(index)}
                              title="Remove item from this section"
                            >
                              <MdDelete />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="view-modal-footer">
                  <div className="view-modal-footer-info">
                    <span>
                      Changes here will reflect on the storefront immediately.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="view-modal-close-action-btn"
                    onClick={handleCloseViewModal}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

      {/* QUICK CATEGORY ITEM EDIT SUB-MODAL */}
      {showCategoryEditModal && editingCatItem && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000000 }}
          onClick={() => setShowCategoryEditModal(false)}
        >
          <div
            className="category-edit-submodal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="category-edit-submodal-header">
              <h4>Edit Category in Section</h4>
              <button
                type="button"
                className="submodal-close-btn"
                onClick={() => setShowCategoryEditModal(false)}
              >
                <MdClose />
              </button>
            </div>

            <div className="category-edit-submodal-body">
              <div className="cat-submodal-field">
                <label>Category Display Name</label>
                <input
                  type="text"
                  value={catEditTitle}
                  onChange={(e) => setCatEditTitle(e.target.value)}
                  placeholder="e.g. New Arrivals"
                />
              </div>

              <div className="cat-submodal-field">
                <label>Custom Image (Optional override)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleCatEditImageUpload}
                  style={{ fontSize: "13px" }}
                />
                {catEditCustomImage && (
                  <div className="cat-edit-preview-thumb">
                    <img src={getImageUrl(catEditCustomImage)} alt="Preview" />
                    <button
                      type="button"
                      onClick={() => setCatEditCustomImage("")}
                      className="remove-thumb-btn"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="category-edit-submodal-footer">
              <button
                type="button"
                className="submodal-full-editor-btn"
                onClick={() => {
                  setShowCategoryEditModal(false);
                  handleCloseViewModal();
                  handleOpenEditModal(viewingSection);
                }}
                title="Open main section modal"
              >
                Open Full Section Editor
              </button>

              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  className="submodal-cancel-btn"
                  onClick={() => setShowCategoryEditModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="submodal-save-btn"
                  disabled={savingCategoryEdit}
                  onClick={handleSaveCategoryItemEdit}
                >
                  {savingCategoryEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageBuilder;
