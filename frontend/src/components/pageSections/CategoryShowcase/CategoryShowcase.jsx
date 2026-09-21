import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CategoryShowcase.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const CategoryShowcase = ({ section, data, customCategories }) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const getImageUrl = (image) => {
    if (!image) return "";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") || image.startsWith("https://"))
    ) {
      return image;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const normalizeCategories = (
    rawCategories,
    rawCategoryItems,
    disabledIds,
  ) => {
    const categories = Array.isArray(rawCategories) ? rawCategories : [];
    const categoryById = new Map(
      categories
        .filter((category) => category && category._id)
        .map((category) => [String(category._id), category]),
    );
    const categoryItems = Array.isArray(rawCategoryItems)
      ? rawCategoryItems
      : [];

    if (categoryItems.length > 0) {
      return categoryItems
        .map((item, index) => {
          const categoryId = String(item.category?._id || item.category || "");
          const pageId = String(item.page?._id || item.page || "");
          const category =
            (item.category && typeof item.category === "object"
              ? item.category
              : categoryById.get(categoryId)) || {};
          const page =
            item.page && typeof item.page === "object" ? item.page : {};
          const isPage = item.linkType === "page" || Boolean(pageId);
          return {
            ...(isPage ? page : category),
            _id:
              (isPage ? page._id : category._id) ||
              item._id ||
              categoryId ||
              pageId ||
              `category-${index}`,
            itemId: item._id ? String(item._id) : "",
            categoryId,
            pageId,
            linkType: item.linkType || "category",
            name: item.name || item.title || category.name || "Category",
            slug: (isPage ? page.slug : category.slug) || "",
            link: item.link || "",
            image:
              item.customImage ||
              item.image ||
              (isPage ? page.image : category.image) ||
              "",
            isActive: item.isActive !== false && category.isActive !== false,
            displayOrder:
              item.displayOrder !== undefined
                ? Number(item.displayOrder)
                : item.sortOrder !== undefined
                  ? Number(item.sortOrder)
                  : index,
          };
        })
        .filter(
          (category) =>
            category.isActive &&
            !disabledIds.has(String(category._id)) &&
            !disabledIds.has(category.itemId) &&
            !disabledIds.has(category.categoryId) &&
            !disabledIds.has(category.pageId),
        )
        .sort((left, right) => left.displayOrder - right.displayOrder);
    }

    return categories.filter(
      (category) =>
        category &&
        category.name &&
        category.isActive !== false &&
        !disabledIds.has(String(category._id)),
    );
  };

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "category-showcase" ||
          item.name === "CategoryShowcase" ||
          (item.name && item.name.toLowerCase().includes("showcase")),
      );

      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map(
          (id) => String(id),
        ),
      );

      const valid = normalizeCategories(
        found?.data?.categories || found?.categories,
        found?.data?.categoryItems || found?.categoryItems,
        disabledIds,
      );

      if (valid.length > 0) {
        setCategories(valid);
      } else {
        const catRes = await api.get("/categories");
        setCategories(catRes.data.categories || []);
      }
    } catch (error) {
      console.error("Category Showcase Error:", error);
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
    const rawList = data?.categories?.length
      ? data.categories
      : section?.data?.categories?.length
        ? section.data.categories
        : section?.categories?.length
          ? section.categories
          : customCategories;

    const disabledIds = new Set(
      (
        data?.disabledItemIds ||
        section?.data?.disabledItemIds ||
        section?.disabledItemIds ||
        []
      ).map((id) => String(id)),
    );

    if (rawList && Array.isArray(rawList) && rawList.length > 0) {
      const valid = normalizeCategories(
        rawList,
        data?.categoryItems ||
          section?.data?.categoryItems ||
          section?.categoryItems,
        disabledIds,
      );
      if (valid.length > 0) {
        setCategories(valid);
        setLoading(false);
        return;
      }
    }

    fetchSection();
  }, [data, section, customCategories, fetchSection]);

  useEffect(() => {
    if (
      data?.categories?.length ||
      section?.data?.categories?.length ||
      customCategories?.length
    ) {
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
  }, [data, section, customCategories, fetchSection]);

  if (loading || !categories.length) {
    return null;
  }

  const handleCategoryClick = (e, category) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!category) return;

    const categoryName = category.name || category.title || "Category";

    const categoryId =
      category.categoryId ||
      (category._id && /^[0-9a-fA-F]{24}$/.test(String(category._id))
        ? String(category._id)
        : null);

    let slug = (
      category.slug ||
      categoryName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") ||
      ""
    ).toLowerCase();

    // If an explicit category/product route link exists, preserve it
    if (category.link && category.link !== "#") {
      const link = category.link.trim();
      if (
        link.startsWith("/category/") ||
        link.startsWith("/c/") ||
        link.startsWith("/sports/") ||
        link.startsWith("/products")
      ) {
        navigate(link, {
          state: {
            categoryId: categoryId || category._id,
            categoryName: categoryName,
          },
        });
        return;
      }

      // Check for recognized store dynamic pages
      const dedicatedStoreRoutes = [
        "/monsoon-essentials",
        "/activewear",
        "/workout-essentials",
        "/cycling",
        "/hiking-trekking",
        "/shoes",
        "/bags-backpacks",
        "/sports-accessories",
      ];
      if (dedicatedStoreRoutes.includes(link)) {
        navigate(link, {
          state: {
            categoryId: categoryId || category._id,
            categoryName: categoryName,
          },
        });
        return;
      }

      // If link is a bare path like "/running-shoes" or "running-shoes", extract slug
      const cleanSlug = link.replace(/^\/+/, "");
      if (cleanSlug && !cleanSlug.includes("/")) {
        slug = cleanSlug.toLowerCase();
      }
    }

    // Always navigate to category-based product page
    const targetSlug = slug || categoryId || "products";
    navigate(`/category/${encodeURIComponent(targetSlug)}`, {
      state: {
        categoryId: categoryId || category._id,
        categoryName: categoryName,
      },
    });
  };

  return (
    <section className="category-showcase">
      <div className="category-showcase-list">
        {categories.map((category) => (
          <div
            className="category-showcase-card"
            key={category._id}
            onClick={(e) => handleCategoryClick(e, category)}
            style={{ cursor: "pointer" }}
            title={category.name || "Category"}
          >
            {category.image ? (
              <img
                src={getImageUrl(category.image)}
                alt={category.name || "Category"}
                loading="lazy"
              />
            ) : (
              <div className="category-showcase-no-image">
                {category.name || "Category"}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default CategoryShowcase;
