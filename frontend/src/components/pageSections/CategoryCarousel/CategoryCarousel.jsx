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

const CategoryCarousel = ({
  categories: propCategories,
  title,
  subcategory,
  variant,
  pageSlug,
}) => {
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

        const normalize = (str) =>
          String(str || "")
            .toLowerCase()
            .replace(/['’]/g, "'")
            .trim();

        if (subcategory) {
          const targetSub = normalize(subcategory);
          const matched = activeCategories.filter(
            (item) => normalize(item.subcategory) === targetSub,
          );
          setCategories(matched);
          return;
        }

        // Keep the required order for homepage
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
  }, [propCategories, subcategory]);

  const handleClick = (category) => {
    const path = routes[category.name];

    if (path) {
      navigate(path, {
        state: {
          categoryId: category._id,
          categoryName: category.name,
          subcategory: category.subcategory || "",
        },
      });
    } else {
      navigate(`/category/${encodeURIComponent(category.name || category._id)}`, {
        state: {
          categoryId: category._id,
          categoryName: category.name,
          subcategory: category.subcategory || "",
        },
      });
    }
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

  const isCircle = variant === "circle";

  return (
    <section
      className={`category-carousel-section ${
        isCircle ? "category-carousel-section--circle" : ""
      }`}
    >
      {title && <h2 className="category-carousel-title">{title}</h2>}

      <div
        className={`category-carousel-track ${
          isCircle ? "category-carousel-track--circle" : ""
        }`}
      >
        {categories.map((category) => (
          <div
            key={category._id}
            className={`category-carousel-card ${
              isCircle ? "category-carousel-card--circle" : ""
            }`}
            onClick={() => handleClick(category)}
          >
            {isCircle ? (
              <div className="category-carousel-circle-avatar">
                {category.image ? (
                  <img src={getImageUrl(category.image)} alt={category.name} />
                ) : (
                  <div className="category-carousel-no-image">
                    {category.name}
                  </div>
                )}
              </div>
            ) : category.image ? (
              <img src={getImageUrl(category.image)} alt={category.name} />
            ) : (
              <div className="category-carousel-no-image">{category.name}</div>
            )}
            {isCircle && category.name && (
              <span className="category-carousel-name">{category.name}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryCarousel;
