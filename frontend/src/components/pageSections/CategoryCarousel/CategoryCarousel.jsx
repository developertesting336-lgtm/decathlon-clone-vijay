import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CategoryCarousel.css";
import api from "../../../api/axios";

const categoryOrder = [

  "New Arrivals",
  "Activewear",
  "Workout Essentials",
  "Cycling",
  "Hiking & Trekking",
  "Shoes",
  "Bags & Backpacks",
  "Sports Accessories",
];

const routes = {
  Shoes: "/shoes",
  "New Arrivals": "/products",
  Activewear: "/activewear",
  "Workout Essentials": "/workout-essentials",
  Cycling: "/cycling",
  "Hiking & Trekking": "/hiking-trekking",
  "Monsoon Essentials": "/monsoon-essentials",
  "Bags & Backpacks": "/bags-backpacks",
  "Sports Accessories": "/sports-accessories",
  "Sports accessories": "/sports-accessories",
};

const CategoryCarousel = ({ categories: propCategories, title }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (propCategories?.length) {
      setCategories(propCategories.filter((item) => item.isActive));
      return;
    }

    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");

        const activeCategories = (res.data?.categories || []).filter(
          (item) => item.isActive === true,
        );

        // Keep the required order
        const orderedCategories = categoryOrder
          .map((name) =>
            activeCategories.find(
              (category) =>
                category.name?.trim().toLowerCase() === name.toLowerCase(),
            ),
          )
          .filter(Boolean);

        setCategories(orderedCategories);
      } catch (error) {
        console.error("Category Carousel Error:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, [propCategories]);

  const handleClick = (category) => {
    const path = routes[category.name];

    if (!path) return;

    navigate(path, {
      state: {
        categoryId: category._id,
        categoryName: category.name,
        subcategory: category.subcategory || "",
      },
    });
  };

  const getImageUrl = (image) => {
    if (!image) return "";

    if (image.startsWith("http")) {
      return image;
    }

    const backendUrl = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");

    return `${backendUrl}/${image.replace(/^\/+/, "")}`;
  };

  if (!categories.length) return null;

  return (
    <section className="category-carousel-section">
      {title && <h2 className="category-carousel-title">{title}</h2>}

      <div className="category-carousel-track">
        {categories.map((category) => (
          <div
            key={category._id}
            className="category-carousel-card"
            onClick={() => handleClick(category)}
          >
            {category.image ? (
              <img src={getImageUrl(category.image)} alt={category.name} />
            ) : (
              <div className="category-carousel-no-image">{category.name}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryCarousel;
