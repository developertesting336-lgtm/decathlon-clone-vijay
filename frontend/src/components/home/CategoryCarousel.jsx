import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/CategoryCarousel.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const CategoryCarousel = ({ customCategories, customItems, title }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  /*
  ========================================
  IMAGE URL
  ========================================
  */
  const getImageUrl = (image) => {
    if (!image) return "";
    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  /*
  ========================================
  FETCH HOMEPAGE SECTION
  ========================================
  */
  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const section = pageSections.find(
        (item) =>
          item.name === "PopularCategories" ||
          item.name === "CategoryCarousel" ||
          item.type === "category",
      );

      let validCategories = [];
      if (section?.categoryItems && section.categoryItems.length > 0) {
        validCategories = section.categoryItems.map((ci) => {
          const cat =
            typeof ci.category === "object"
              ? ci.category
              : { _id: ci.category, name: "Category" };
          return {
            _id: cat._id,
            name: cat.name,
            slug: cat.slug || "",
            image: ci.customImage || cat.image || "",
          };
        });
      } else if (section?.categories && section.categories.length > 0) {
        validCategories = section.categories
          .filter((c) => c && typeof c === "object" && c.name)
          .map((cat) => ({
            _id: cat._id,
            name: cat.name,
            slug: cat.slug || "",
            image: cat.image || "",
          }));
      }

      if (validCategories.length > 0) {
        setCategories(validCategories);
      } else {
        const catRes = await api.get("/categories");
        setCategories(catRes.data.categories || []);
      }
    } catch (error) {
      console.error("Category Carousel Error:", error);
      try {
        const catRes = await api.get("/categories");
        setCategories(catRes.data.categories || []);
      } catch {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /*
  ========================================
  INITIAL LOAD
  ========================================
  */
  useEffect(() => {
    const directList =
      customItems && customItems.length > 0
        ? customItems
        : customCategories && customCategories.length > 0
          ? customCategories
          : [];

    const valid = directList
      .filter((c) => c && typeof c === "object" && (c.name || c.image))
      .map((c) => ({
        _id: c._id,
        name: c.name || "Category",
        slug: c.slug || "",
        link: c.link || "",
        image: c.image || c.customImage || "",
      }));

    if (valid.length > 0) {
      setCategories(valid);
      setLoading(false);
      return;
    }
    fetchSection();
  }, [customCategories, customItems, fetchSection]);

  /*
  ========================================
  REALTIME UPDATE
  ========================================
  */
  useEffect(() => {
    // If customCategories is supplied by parent, parent handles socket updates
    if (customCategories && customCategories.length > 0) {
      return;
    }

    let timer;
    const handleHomepageUpdate = (data) => {
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

      if (events.includes(data?.type)) {
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
  }, [customCategories, fetchSection]);

  /*
  ========================================
  LOADING / EMPTY
  ========================================
  */
  if (loading || !categories.length) {
    return null;
  }

  /*
  ========================================
  UI
  ========================================
  */
  return (
    <section className="category-carousel-section">
      <div className="category-carousel-track">
        {categories.map((category) => (
          <div
            className="category-carousel-card"
            key={category._id}
            onClick={() => {
              const targetPath = category.slug
                ? `/${category.slug}`
                : `/category/${encodeURIComponent((category.name || "").toLowerCase())}`;
              navigate(targetPath, {
                state: {
                  categoryId: category._id,
                  categoryName: category.name,
                },
              });
            }}
          >
            {category.image ? (
              <img src={getImageUrl(category.image)} alt={category.name} />
            ) : (
              <div className="category-carousel-no-image">No Image</div>
            )}

            <div className="category-carousel-badge-wrapper">
              <span className="category-carousel-badge">{category.name}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryCarousel;
