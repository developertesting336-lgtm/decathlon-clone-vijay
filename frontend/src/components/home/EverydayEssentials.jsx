import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../../styles/home/EverydayEssentials.css";

import api from "../../api/axios";
import socket from "../../socket/socket";

const EverydayEssentials = ({
  customCategories,
  customItems,
  section,
  title: propTitle,
}) => {
  const navigate = useNavigate();
  const [dataItems, setDataItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayTitle =
    propTitle ||
    section?.name ||
    "Everyday Essentials, Head to toe Collection.";

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
  FETCH ITEMS
  ========================================
  */

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const foundSection = pageSections.find(
        (item) =>
          item.name?.includes("Essentials") ||
          item.name?.includes("Head to toe") ||
          item.name?.includes("Everyday") ||
          item.name?.includes("Rainy") ||
          item.name?.includes("Monsoon") ||
          item.name === "Everyday Essentials, Head to toe Collection."
      );

      const raw =
        foundSection?.items || foundSection?.categories || [];
      const valid = raw.filter(
        (c) => c && typeof c === "object" && (c.name || c.image)
      );

      if (valid.length > 0) {
        setDataItems(valid);
      } else {
        const catRes = await api.get("/categories");
        setDataItems(catRes.data.categories || []);
      }
    } catch (error) {
      console.error("Everyday Essentials Error:", error);
      try {
        const catRes = await api.get("/categories");
        setDataItems(catRes.data.categories || []);
      } catch {
        setDataItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const directItems =
      customItems ||
      section?.items ||
      customCategories ||
      section?.categories;

    const valid = (directItems || []).filter(
      (c) => c && typeof c === "object" && (c.name || c.image)
    );

    if (valid.length > 0) {
      setDataItems(valid);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [customCategories, customItems, section, fetchSection]);

  /* REALTIME UPDATE */

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

  /* LOADING */

  if (loading) {
    return null;
  }

  /* EMPTY */

  if (!dataItems.length) {
    return null;
  }

  /* UI */

  return (
    <section className="everyday-essentials-section">
      <div className="everyday-essentials-container">
        <h2 className="everyday-essentials-title">{displayTitle}</h2>

        <div className="everyday-essentials-grid">
          {dataItems.map((item, index) => {
            const slug =
              item.slug ||
              item.name?.toLowerCase().replace(/\s+/g, "-") ||
              item._id;

            let resolvedSlug = slug;
            let resolvedName = item.name;
            if (index === 0 && (!slug || slug === "1" || slug === "t-shirt")) {
              resolvedSlug = "t-shirts";
              resolvedName = "T-Shirts";
            } else if (index === 1 && (!slug || slug === "2")) {
              resolvedSlug = "shorts";
              resolvedName = "Shorts";
            } else if (index === 2 && (!slug || slug === "3")) {
              resolvedSlug = "pants";
              resolvedName = "Pants & Trackpants";
            } else if (index === 3 && (!slug || slug === "4")) {
              resolvedSlug = "shoes";
              resolvedName = "Shoes";
            }

            const imageUrl = getImageUrl(item.image);
            const targetLink =
              item.link && item.link !== "#"
                ? item.link
                : `/category/${encodeURIComponent(resolvedSlug)}`;

            return (
              <div
                className="everyday-essentials-card"
                key={item._id || index}
                onClick={() =>
                  navigate(targetLink, {
                    state: {
                      categoryId: item._id,
                      categoryName: resolvedName,
                    },
                  })
                }
                style={{ cursor: "pointer" }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.name || "Collection item"}
                    className="everyday-essentials-image"
                    loading="lazy"
                  />
                ) : (
                  <div className="everyday-essentials-no-image">No Image</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EverydayEssentials;
