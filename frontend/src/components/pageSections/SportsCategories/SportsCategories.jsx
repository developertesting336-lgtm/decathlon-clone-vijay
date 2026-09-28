import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SportsCategories.css";
import api from "../../../api/axios";

const SportsCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");

        const list = res.data?.categories || [];

        const filteredCategories = list.filter(
          (category) =>
            category.isActive === true &&
            category.image &&
            String(category.subcategory || "")
              .trim()
              .toLowerCase() === "sports categories",
        );

        setCategories(filteredCategories);
      } catch (error) {
        console.error("Sports Categories Error:", error);
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
    if (!category.slug) return;

    navigate(`/category/${category.slug}`, {
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
    <section className="sports-categories">
      <div className="sports-categories-list">
        {categories.map((category) => (
          <div
            key={category._id}
            className="sports-category-card"
            onClick={() => handleClick(category)}
          >
            <div className="sports-category-image-box">
              <img
                src={getImageUrl(category.image)}
                alt={category.name}
                loading="lazy"
              />
            </div>

            {/* <p className="sports-category-name">{category.name}</p> */}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SportsCategories;
