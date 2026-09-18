import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CategoryCarousel.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

// Dedicated Store Page Category Carousels (each in its own subfolder)
import MonsoonEssentials from "./MonsoonEssentials/MonsoonEssentials";
import Activewear from "./Activewear/Activewear";
import WorkoutEssentials from "./WorkoutEssentials/WorkoutEssentials";
import Cycling from "./Cycling/Cycling";
import HikingTrekking from "./HikingTrekking/HikingTrekking";
import Shoes from "./Shoes/Shoes";
import BagsBackpacks from "./BagsBackpacks/BagsBackpacks";
import SportsAccessories from "./SportsAccessories/SportsAccessories";

export {
  MonsoonEssentials,
  Activewear,
  WorkoutEssentials,
  Cycling,
  HikingTrekking,
  Shoes,
  BagsBackpacks,
  SportsAccessories,
};

/* =========================================================
   HOME / DEFAULT CATEGORY CAROUSEL
========================================================= */
const HomeCategoryCarousel = ({
  section,
  data,
  customCategories,
  customItems,
  pageSlug,
}) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const parseItem = (c, i) => {
    const linkType = c.linkType === "page" ? "page" : "category";

    if (linkType === "page") {
      const pageObj =
        typeof c.page === "object" && c.page
          ? c.page
          : { _id: c.page, name: c.name || c.title || "Store Page" };
      const pageName = (c.title || c.name || pageObj.name || "Store Page").trim();
      const resolvedSlug = (
        pageObj.slug ||
        c.slug ||
        (c.link ? c.link.replace(/^\//, "") : "")
      ).trim();

      return {
        _id: pageObj._id || c._id || `page-${i}`,
        linkType: "page",
        name: pageName,
        slug: resolvedSlug,
        pageSlug: resolvedSlug,
        link: resolvedSlug ? `/${resolvedSlug}` : "",
        image: c.customImage || c.image || "",
      };
    }

    const catObj =
      typeof c.category === "object" && c.category
        ? c.category
        : { _id: c.category, name: c.name || c.title || "Category" };
    const catName = (c.title || c.name || catObj.name || "Category").trim();
    const isNewArrivals =
      catName.toLowerCase().includes("new arrival") ||
      c.link === "/category/new-arrivals" ||
      catObj.slug === "new-arrivals";
    const catSlug = isNewArrivals
      ? "new-arrivals"
      : catObj.slug ||
        (c.link ? c.link.replace(/^\/category\//, "").replace(/^\//, "") : "");

    return {
      _id: catObj._id || c._id || `cat-${i}`,
      categoryId: catObj._id || c.category,
      linkType: "category",
      name: catName,
      slug: catSlug,
      link: isNewArrivals
        ? "/category/new-arrivals"
        : c.link || (catSlug ? `/category/${catSlug}` : ""),
      image: c.customImage || c.image || catObj.image || "",
    };
  };

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const targetSlug = pageSlug || "home";
      const response = await api.get(`/pages/slug/${targetSlug}`);
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "category-carousel" ||
          item.name === "PopularCategories" ||
          item.name === "Category Carousel" ||
          (item.name && item.name.toLowerCase().includes("carousel")) ||
          item.type === "category"
      );

      let validCategories = [];
      const catItems = found?.data?.categoryItems || found?.categoryItems;
      const cats = found?.data?.categories || found?.categories;
      const itemsList = found?.data?.items || found?.items;
      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map(
          (id) => String(id)
        )
      );

      if (catItems && Array.isArray(catItems) && catItems.length > 0) {
        validCategories = catItems
          .filter((ci) => {
            if (ci.isActive === false) return false;
            const refId = String(
              ci.category?._id ||
                ci.category ||
                ci.page?._id ||
                ci.page ||
                ci._id ||
                ""
            );
            return !disabledIds.has(refId) && !disabledIds.has(String(ci._id));
          })
          .map(parseItem);
      } else if (cats && Array.isArray(cats) && cats.length > 0) {
        validCategories = cats
          .filter(
            (c) =>
              c &&
              typeof c === "object" &&
              c.name &&
              c.isActive !== false &&
              !disabledIds.has(String(c._id))
          )
          .map((cat, idx) => parseItem({ category: cat, ...cat }, idx));
      } else if (itemsList && Array.isArray(itemsList) && itemsList.length > 0) {
        validCategories = itemsList
          .filter((item, idx) => {
            if (item.isActive === false) return false;
            const itId = String(item._id || `item-${idx}`);
            return !disabledIds.has(itId) && !disabledIds.has(String(item._id));
          })
          .map((item, idx) => parseItem(item, idx));
      }

      if (validCategories.length > 0) {
        setCategories(validCategories);
      } else {
        const catRes = await api.get("/categories");
        setCategories(
          (catRes.data.categories || []).map((c, i) =>
            parseItem({ category: c }, i)
          )
        );
      }
    } catch (error) {
      console.error("Category Carousel Error:", error);
      try {
        const catRes = await api.get("/categories");
        setCategories(
          (catRes.data.categories || []).map((c, i) =>
            parseItem({ category: c }, i)
          )
        );
      } catch {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [pageSlug]);

  useEffect(() => {
    const rawList =
      customItems?.length
        ? customItems
        : customCategories?.length
        ? customCategories
        : data?.categoryItems !== undefined
        ? data.categoryItems
        : data?.items !== undefined
        ? data.items
        : data?.categories !== undefined
        ? data.categories
        : section?.data?.categoryItems !== undefined
        ? section.data.categoryItems
        : section?.data?.items !== undefined
        ? section.data.items
        : section?.data?.categories !== undefined
        ? section.data.categories
        : section?.categoryItems !== undefined
        ? section.categoryItems
        : section?.categories !== undefined
        ? section.categories
        : null;

    const disabledIds = new Set(
      (
        data?.disabledItemIds ||
        section?.data?.disabledItemIds ||
        section?.disabledItemIds ||
        []
      ).map((id) => String(id))
    );

    if (rawList !== null && Array.isArray(rawList)) {
      const parsed = rawList
        .filter((c, i) => {
          if (!c || (typeof c !== "object" && typeof c !== "string"))
            return false;
          if (c.isActive === false) return false;
          const cId = String(
            c._id ||
              c.category?._id ||
              c.category ||
              c.page?._id ||
              c.page ||
              `cat-${i}`
          );
          if (disabledIds.has(cId)) return false;
          if (c._id && disabledIds.has(String(c._id))) return false;
          return true;
        })
        .map(parseItem);

      setCategories(parsed);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [data, section, customCategories, customItems, fetchSection]);

  useEffect(() => {
    if (
      data?.categoryItems !== undefined ||
      data?.categories !== undefined ||
      section?.data?.categoryItems !== undefined ||
      section?.data?.categories !== undefined ||
      customCategories?.length
    ) {
      return;
    }

    let timer;
    const handleHomepageUpdate = (updateData) => {
      const events = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
        "category_created",
        "category_updated",
        "category_deleted",
        "category_reordered",
      ];
      if (events.includes(updateData?.type)) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          fetchSection();
        }, 200);
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);
    return () => {
      clearTimeout(timer);
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [data, section, customCategories, fetchSection]);

  if (loading || !categories.length) {
    return null;
  }

  const handleCardClick = (category) => {
    // 1. Store Page navigation
    if (category.linkType === "page" || category.pageSlug) {
      const slug = (category.pageSlug || category.slug || "").replace(
        /^\//,
        ""
      );
      navigate(`/${slug}`);
      return;
    }

    // 2. New Arrivals route safety
    const catName = (category.name || "").trim();
    if (
      catName.toLowerCase().includes("new arrival") ||
      category.slug === "new-arrivals" ||
      category.link === "/category/new-arrivals"
    ) {
      navigate("/category/new-arrivals");
      return;
    }

    // 3. If explicit link provided
    if (category.link && category.link !== "#") {
      navigate(category.link);
      return;
    }

    // 4. Product Category navigation
    const targetSlug =
      category.slug || encodeURIComponent(catName.toLowerCase());

    navigate(`/category/${targetSlug}`, {
      state: {
        categoryId: category.categoryId || category._id,
        categoryName: catName,
      },
    });
  };

  return (
    <section className="category-carousel-section">
      <div className="category-carousel-track">
        {categories.map((category, idx) => (
          <div
            className="category-carousel-card"
            key={category._id || idx}
            onClick={() => handleCardClick(category)}
          >
            {category.image ? (
              <img
                src={getImageUrl(category.image)}
                alt={category.name}
              />
            ) : (
              <div className="category-carousel-no-image">{category.name}</div>
            )}
          </div>

        ))}
      </div>
    </section>
  );
};

/* =========================================================
   MASTER CATEGORY CAROUSEL DISPATCHER
   Dispatches cleanly to the dedicated Store Page component
   when pageSlug matches, or renders HomeCategoryCarousel.
========================================================= */
const CategoryCarousel = (props) => {
  const slug = (props.pageSlug || "").trim().toLowerCase();

  switch (slug) {
    case "monsoon-essentials":
      return <MonsoonEssentials {...props} />;
    case "activewear":
      return <Activewear {...props} />;
    case "workout-essentials":
      return <WorkoutEssentials {...props} />;
    case "cycling":
      return <Cycling {...props} />;
    case "hiking-trekking":
      return <HikingTrekking {...props} />;
    case "shoes":
      return <Shoes {...props} />;
    case "bags-backpacks":
      return <BagsBackpacks {...props} />;
    case "sports-accessories":
      return <SportsAccessories {...props} />;
    default:
      return <HomeCategoryCarousel {...props} />;
  }
};

export default CategoryCarousel;
