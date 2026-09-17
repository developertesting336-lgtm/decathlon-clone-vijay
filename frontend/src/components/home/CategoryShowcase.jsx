import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/CategoryShowcase.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const CategoryShowcase = ({ customCategories }) => {
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
  FETCH CATEGORIES
  ========================================
  */

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const section = pageSections.find(
        (item) => item.name === "CategoryShowcase" || (item.type === "category" && item.name.includes("Showcase"))
      );

      const validCategories = (section?.categories || []).filter(
        (c) => c && typeof c === "object" && c.name
      );

      if (validCategories.length > 0) {
        setCategories(validCategories);
      } else {
        const catRes = await api.get("/categories");
        setCategories(catRes.data.categories || []);
      }
    } catch (error) {
      console.error("Category Showcase Error:", error);
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

  useEffect(() => {
    const valid = (customCategories || []).filter(
      (c) => c && typeof c === "object" && c.name
    );
    if (valid.length > 0) {
      setCategories(valid);
      setLoading(false);
      return;
    }
    fetchSection();
  }, [customCategories, fetchSection]);

  /*
  ========================================
  REALTIME UPDATE
  ========================================
  */

  useEffect(() => {
    const handleHomepageUpdate = (data) => {
      const sectionEvents = [
        "section_created",
        "section_updated",
        "section_deleted",
        "section_reordered",
      ];

      const categoryEvents = [
        "category_created",
        "category_updated",
        "category_deleted",
        "category_reordered",
      ];

      if (sectionEvents.includes(data?.type)) {
        fetchSection();

        return;
      }

      if (categoryEvents.includes(data?.type)) {
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);

    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
  }, [fetchSection]);

  /*
  ========================================
  LOADING
  ========================================
  */

  if (loading) {
    return null;
  }

  /*
  ========================================
  EMPTY
  ========================================
  */

  if (!categories.length) {
    return null;
  }

  /*
  ========================================
  UI
  ========================================
  */

  const handleCategoryClick = (category) => {
    if (category.link && category.link !== "#") {
      navigate(category.link);
      return;
    }

    const slug = (
      category.slug ||
      category.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
      ""
    ).toLowerCase();

    const dedicatedRoutes = {
      shoes: "/shoes",
      cycling: "/cycling",
      activewear: "/activewear",
      "monsoon-essentials": "/monsoon-essentials",
      "workout-essentials": "/workout-essentials",
      "hiking-trekking": "/hiking-trekking",
      "bags-backpacks": "/bags-backpacks",
      "sports-accessories": "/sports-accessories",
    };

    if (dedicatedRoutes[slug]) {
      navigate(dedicatedRoutes[slug], {
        state: { categoryId: category._id, categoryName: category.name },
      });
      return;
    }

    navigate(`/category/${encodeURIComponent(slug || category._id)}`, {
      state: { categoryId: category._id, categoryName: category.name },
    });
  };

  return (
    <section className="category-showcase">
      <div className="category-showcase-list">
        {categories.map((category) => {
          return (
            <div
              className="category-showcase-card"
              key={category._id}
              onClick={() => handleCategoryClick(category)}
              style={{ cursor: "pointer" }}
            >
              {category.image ? (
                <img src={getImageUrl(category.image)} alt={category.name} />
              ) : (
                <div className="category-showcase-no-image">No Image</div>
              )}

              <div className="category-showcase-title">{category.name}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryShowcase;
