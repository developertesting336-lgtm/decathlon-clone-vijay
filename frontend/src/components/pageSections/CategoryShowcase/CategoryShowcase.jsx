import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CategoryShowcase.css";
import api from "../../../api/axios";

const CategoryShowcase = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");

        const list = res.data?.categories || [];

        const activeCategories = list.filter(
          (category) =>
            category.isActive === true &&
            category.subcategory?.toLowerCase() === "category showcase",
        );

        setCategories(activeCategories);
      } catch (error) {
        console.error("Category Showcase Error:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  const getImageUrl = (image) => {
    if (!image) return "";

    if (image.startsWith("http")) {
      return image;
    }

    const backendUrl = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

    return `${backendUrl}/${image.replace(/^\/+/, "")}`;
  };

  const handleClick = (category) => {
    if (!category) return;

    navigate(`/category/${category.slug}`, {
      state: {
        categoryId: category._id,
        categoryName: category.name,
        subcategory: category.subcategory || "",
      },
    });
  };

  if (!categories.length) return null;

  return (
    <section className="category-showcase">
      <div className="category-showcase-list">
        {categories.map((category) => (
          <div
            key={category._id}
            className="category-showcase-card"
            onClick={() => handleClick(category)}
          >
            {category.image ? (
              <img
                src={getImageUrl(category.image)}
                alt={category.name}
                loading="lazy"
              />
            ) : (
              <div className="category-showcase-no-image">{category.name}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryShowcase;
