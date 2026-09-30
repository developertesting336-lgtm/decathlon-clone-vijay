import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./EverydayEssentials.css";
import api from "../../../api/axios";

const EverydayEssentials = ({ subcategory, title }) => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [slider, setSlider] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get("/categories");

        const list = res.data?.categories || [];

        const targetSub = (subcategory || "everyday essentials")
          .trim()
          .toLowerCase()
          .replace(/['’]/g, "'");

        const filtered = list.filter(
          (category) =>
            category.isActive === true &&
            category.image &&
            String(category.subcategory || "")
              .trim()
              .toLowerCase()
              .replace(/['’]/g, "'") === targetSub,
        );

        setCategories(filtered);
      } catch (error) {
        console.error("Everyday Essentials Error:", error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, [subcategory]);

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

  const next = () => {
    if (!slider) return;

    slider.scrollBy({
      left: slider.clientWidth / 2,
      behavior: "smooth",
    });
  };

  const previous = () => {
    if (!slider) return;

    slider.scrollBy({
      left: -slider.clientWidth / 2,
      behavior: "smooth",
    });
  };

  if (!categories.length) {
    return null;
  }

  const displayTitle =
    title ||
    (subcategory
      ? subcategory.replace(/-/g, " - ")
      : "Everyday Essentials, Head to toe Collection.");

  return (
    <section className="everyday-essentials-section">
      <div className="everyday-essentials-container">
        <h2 className="everyday-essentials-title">
          {displayTitle}
        </h2>

        <div className="everyday-essentials-grid" ref={setSlider}>
          {categories.map((category) => (
            <div
              key={category._id}
              className="everyday-essentials-card"
              onClick={() => handleClick(category)}
            >
              <img
                src={getImageUrl(category.image)}
                alt={category.name || "Everyday Essentials"}
                className="everyday-essentials-image"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {categories.length > 4 && (
          <>
            <button
              type="button"
              className="everyday-essentials-arrow everyday-essentials-previous"
              onClick={previous}
              aria-label="Previous"
            >
              <MdChevronLeft size={26} />
            </button>

            <button
              type="button"
              className="everyday-essentials-arrow everyday-essentials-next"
              onClick={next}
              aria-label="Next"
            >
              <MdChevronRight size={26} />
            </button>
          </>
        )}
      </div>
    </section>
  );
};

export default EverydayEssentials;
