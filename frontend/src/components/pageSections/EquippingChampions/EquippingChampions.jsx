import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./EquippingChampions.css";
import api from "../../../api/axios";

const EquippingChampions = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (image) => {
    if (!image) return "";

    if (
      typeof image === "string" &&
      (image.startsWith("http://") ||
        image.startsWith("https://"))
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

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);

        const response = await api.get("/categories");

        const list = Array.isArray(response.data)
          ? response.data
          : response.data?.categories || [];

        const filteredCategories = list.filter((category) => {
          if (!category || category?.isActive === false || !category?.image) {
            return false;
          }
          const sub = String(category?.subcategory || "")
            .trim()
            .toLowerCase();
          return (
            sub === "equipping champions" ||
            sub === "equipping champion" ||
            sub.includes("champion") ||
            sub.includes("equipping")
          );
        });

        setCategories(filteredCategories);
      } catch (error) {
        console.error(
          "Equipping Champions Error:",
          error
        );
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading || categories.length === 0) {
    return null;
  }

  return (
    <section className="equipping-champions-section">
      <div className="equipping-champions-container">
        <h2 className="equipping-champions-title">
          Equipping champions
        </h2>

        <div className="equipping-champions-grid">
          {categories.map((category) => {
            const slug =
              category.slug ||
              category.name
                ?.toLowerCase()
                .replace(/\s+/g, "-") ||
              category._id;

            return (
              <div
                className="equipping-champion-card"
                key={category._id}
                onClick={() =>
                  navigate(
                    `/category/${encodeURIComponent(slug)}`,
                    {
                      state: {
                        categoryId: category._id,
                        categoryName: category.name,
                      },
                    }
                  )
                }
              >
                <img
                  src={getImageUrl(category.image)}
                  alt={category.name || "Category"}
                  className="equipping-champion-image"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default EquippingChampions;
