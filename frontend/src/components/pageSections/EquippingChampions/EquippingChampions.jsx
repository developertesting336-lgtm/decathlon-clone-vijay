import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EquippingChampions.css";
import api from "../../../api/axios";

const EquippingChampions = ({ customCategories, title: propTitle }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const displayTitle = propTitle || "Equipping champions";

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

  useEffect(() => {
    if (customCategories && Array.isArray(customCategories) && customCategories.length > 0) {
      const valid = customCategories.filter((c) => c && typeof c === "object" && c.name);
      if (valid.length > 0) {
        setCategories(valid);
        setLoading(false);
        return;
      }
    }

    const fetchCategories = async () => {
      try {
        setLoading(true);
        const res = await api.get("/categories");
        const list = res.data?.categories || [];

        let filtered = list.filter(
          (category) =>
            category.isActive === true &&
            category.image &&
            String(category.subcategory || "")
              .trim()
              .toLowerCase() === "equipping champions"
        );

        if (filtered.length === 0) {
          filtered = list.filter((c) => c.isActive === true && c.image);
        }

        setCategories(filtered);
      } catch (error) {
        console.error("Equipping Champions Error:", error);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [customCategories]);

  if (loading || !categories.length) {
    return null;
  }

  return (
    <section className="equipping-champions-section">
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
