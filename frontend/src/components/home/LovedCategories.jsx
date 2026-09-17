import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/LovedCategories.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const LovedCategories = ({ customCategories }) => {
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
        (item) => item.name === "Loved Categories" || item.name.includes("Loved") || item.type === "category"
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
      console.error("Loved Categories Error:", error);
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

  /* REALTIME UPDATE */

  useEffect(() => {
    const handleHomepageUpdate =
      (data) => {
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

        if (
          sectionEvents.includes(
            data?.type
          )
        ) {
          fetchSection();
          return;
        }

        if (
          categoryEvents.includes(
            data?.type
          )
        ) {
          fetchSection();
        }
      };

    socket.on(
      "homepage_updated",
      handleHomepageUpdate
    );

    return () => {
      socket.off(
        "homepage_updated",
        handleHomepageUpdate
      );
    };
  }, [fetchSection]);

  /*LOADING*/

  if (loading) {
    return null;
  }

  /*EMPTY*/

  if (!categories.length) {
    return null;
  }

  /*UI*/

  return (
    <section className="loved-categories">

      <div className="loved-categories-container">

        <h2 className="loved-categories-title">
          Keep shopping your loved categories
        </h2>

        <div className="loved-categories-grid">
          {categories.map((category) => {
            let slug =
              category.slug ||
              category.name?.toLowerCase().replace(/\s+/g, "-") ||
              category._id;
            let categoryId = category._id;
            let categoryName = category.name;

            // Route Running Shoes card properly to running-shoes
            if (
              (slug === "running" && category.image?.includes("njmdrcygmz8fnhrsqvz8")) ||
              (categoryName === "Running" && category.image?.includes("njmdrcygmz8fnhrsqvz8")) ||
              category.image?.includes("njmdrcygmz8fnhrsqvz8")
            ) {
              slug = "running-shoes";
              categoryId = "6a8bff211fc7712c89c86055";
              categoryName = "Running Shoes";
            }

            let targetPath =
              category.link && category.link !== "#"
                ? category.link
                : `/category/${encodeURIComponent(slug)}`;

            return (
              <div
                className="loved-category-card"
                key={category._id}
                onClick={() =>
                  navigate(targetPath, {
                    state: { categoryId, categoryName },
                  })
                }
                style={{ cursor: "pointer" }}
              >
                {category.image ? (
                  <img
                    src={getImageUrl(category.image)}
                    alt={category.name || "Category"}
                    className="loved-category-image"
                  />
                ) : (
                  <div className="loved-category-no-image">No Image</div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </section>
  );
};

export default LovedCategories;