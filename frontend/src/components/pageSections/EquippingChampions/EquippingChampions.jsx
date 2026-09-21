import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EquippingChampions.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const EquippingChampions = ({ section, data, style, customCategories, title: propTitle }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const sectionData = useMemo(() => data || section?.data || {}, [data, section?.data]);
  const displayTitle =
    propTitle ||
    sectionData.title ||
    section?.name ||
    "Equipping champions";

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
          item.type === "equipping-champions" ||
          item.name === "Equipping Champions" ||
          (item.name && item.name.toLowerCase().includes("champions"))
      );

      const rawCats = found?.data?.categories || found?.categories || [];
      const validCategories = rawCats.filter(
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
    const rawList =
      sectionData.categories?.length
        ? sectionData.categories
        : customCategories?.length
        ? customCategories
        : section?.categories;

    if (rawList && Array.isArray(rawList) && rawList.length > 0) {
      const valid = rawList.filter((c) => c && typeof c === "object" && c.name);
      if (valid.length > 0) {
        setCategories(valid);
        setLoading(false);
        return;
      }
    }

    fetchSection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionData, customCategories, section, fetchSection]);

  useEffect(() => {
    if (sectionData.categories?.length || customCategories?.length) {
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
  }, [sectionData, customCategories, fetchSection]);

  if (loading || !categories.length) {
    return null;
  }

  const variantClass = style?.variant ? `variant-${style.variant}` : "";

  return (
    <section className={`equipping-champions-section ${variantClass}`}>
      <div className="equipping-champions-container">
        {displayTitle && (
          <h2 className="equipping-champions-title">{displayTitle}</h2>
        )}

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
