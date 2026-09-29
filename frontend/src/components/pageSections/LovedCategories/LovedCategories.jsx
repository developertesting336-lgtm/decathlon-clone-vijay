import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LovedCategories.css";
import api from "../../../api/axios";

const LovedCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");

        const list = res.data?.categories || [];

        const filtered = list.filter(
          (category) =>
            category.isActive === true &&
            category.image &&
            String(category.subcategory || "")
              .trim()
              .toLowerCase() === "loved categories",
        );

        setCategories(filtered);
      } catch (error) {
        console.error("Loved Categories Error:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  const getImageUrl = (image) => {
    if (!image) return "";

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const backendUrl = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

    return `${backendUrl}/${image.replace(/^\/+/, "")}`;
  };

  const handleClick = (category) => {
    if (!category) return;
    const target = category.name || category._id;
    if (!target) return;

    navigate(`/category/${encodeURIComponent(target)}`, {
      state: {
        categoryId: category._id,
        categoryName: category.name,
        subcategory: category.subcategory || "",
      },
    });
  };

  if (!categories.length) {
    return null;
  }

  return (
    <section className="loved-categories">
      <div className="loved-categories-container">
        <h2 className="loved-categories-title">
          Keep shopping your loved categories
        </h2>

        <div className="loved-categories-grid">
          {categories.map((category) => (
            <div
              key={category._id}
              className="loved-category-card"
              onClick={() => handleClick(category)}
            >
              <img
                src={getImageUrl(category.image)}
                alt={category.name || "Category"}
                className="loved-category-image"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LovedCategories;
