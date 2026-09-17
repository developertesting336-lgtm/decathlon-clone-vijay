import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/EquippingChampions.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const EquippingChampions = ({ customCategories }) => {
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
        (item) => item.name === "Equipping Champions" || item.name.includes("Champions") || item.type === "category"
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
      console.error("Equipping Champions Error:", error);
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

  if (loading) {
    return null;
  }

  if (!categories.length) {
    return null;
  }

  return (
    <section className="equipping-champions-section">
      <div className="equipping-champions-container">
        <h2 className="equipping-champions-title">Equipping champions</h2>

        <div className="equipping-champions-grid">
          {categories.map((category) => {
            const slug =
              category.slug ||
              category.name?.toLowerCase().replace(/\s+/g, "-") ||
              category._id;

            const targetPath =
              category.link && category.link !== "#"
                ? category.link
                : `/category/${encodeURIComponent(slug)}`;

            return (
              <div
                className="equipping-champion-card"
                key={category._id}
                onClick={() =>
                  navigate(targetPath, {
                    state: { categoryId: category._id, categoryName: category.name },
                  })
                }
                style={{ cursor: "pointer" }}
              >
                {category.image ? (
                  <img
                    src={getImageUrl(category.image)}
                    alt={category.name || "Equipping champion"}
                    className="equipping-champion-image"
                  />
                ) : (
                  <div className="equipping-champion-no-image">No Image</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EquippingChampions;
