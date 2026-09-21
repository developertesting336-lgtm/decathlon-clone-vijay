import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EverydayEssentials.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const EverydayEssentials = ({
  section,
  data,
  style,
  customCategories,
  customItems,
  title: propTitle,
}) => {
  const navigate = useNavigate();
  const [dataItems, setDataItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const sectionData = useMemo(() => data || section?.data || {}, [data, section?.data]);
  const displayTitle =
    propTitle ||
    sectionData.title ||
    section?.name ||
    "Everyday Essentials, Head to toe Collection.";

  const getImageUrl = (image) => {
    if (!image) return "";
    if (typeof image === "string" && (image.startsWith("http://") || image.startsWith("https://"))) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "everyday-essentials" ||
          item.name?.includes("Essentials") ||
          item.name?.includes("Head to toe") ||
          item.name?.includes("Everyday") ||
          item.name === "Everyday Essentials, Head to toe Collection."
      );

      const raw =
        found?.data?.items ||
        found?.data?.categories ||
        found?.items ||
        found?.categories ||
        [];
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
      sectionData.items?.length
        ? sectionData.items
        : sectionData.categories?.length
        ? sectionData.categories
        : customItems?.length
        ? customItems
        : section?.items?.length
        ? section.items
        : customCategories?.length
        ? customCategories
        : section?.categories;

    const valid = (directItems || []).filter(
      (c) => c && typeof c === "object" && (c.name || c.image)
    );

    if (valid.length > 0) {
      setDataItems(valid);
      setLoading(false);
      return;
    }

    fetchSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionData, customCategories, customItems, section, fetchSection]);

  useEffect(() => {
    if (sectionData.items?.length || customItems?.length || customCategories?.length) {
      return;
    }

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
        fetchSection();
      }
    };

    socket.on("homepage_updated", handleHomepageUpdate);
    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionData, customCategories, customItems, fetchSection]);

  if (loading || !dataItems.length) {
    return null;
  }

  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section className={`everyday-essentials-section ${variantClass}`}>
      <div className="everyday-essentials-container">
        {displayTitle && (
          <h2 className="everyday-essentials-title">{displayTitle}</h2>
        )}

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
