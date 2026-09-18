import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Cycling.css";
import api from "../../../../api/axios";

const Cycling = ({
  section,
  data,
  customCategories,
  customItems,
  title,
}) => {
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

  const parseItem = (c, i) => {
    const linkType = c.linkType === "page" ? "page" : "category";

    if (linkType === "page") {
      const pageObj =
        typeof c.page === "object" && c.page
          ? c.page
          : { _id: c.page, name: c.name || c.title || "Store Page" };
      const pageName = (c.title || c.name || pageObj.name || "Store Page").trim();
      const resolvedSlug = (
        pageObj.slug ||
        c.slug ||
        (c.link ? c.link.replace(/^\//, "") : "")
      ).trim();

      return {
        _id: pageObj._id || c._id || `page-${i}`,
        linkType: "page",
        name: pageName,
        slug: resolvedSlug,
        pageSlug: resolvedSlug,
        link: resolvedSlug ? `/${resolvedSlug}` : "",
        image: c.customImage || c.image || "",
      };
    }

    const catObj =
      typeof c.category === "object" && c.category
        ? c.category
        : { _id: c.category, name: c.name || c.title || "Category" };
    const catName = (c.title || c.name || catObj.name || "Category").trim();
    const isNewArrivals =
      catName.toLowerCase().includes("new arrival") ||
      c.link === "/category/new-arrivals" ||
      catObj.slug === "new-arrivals";
    const catSlug = isNewArrivals
      ? "new-arrivals"
      : catObj.slug ||
        (c.link ? c.link.replace(/^\/category\//, "").replace(/^\//, "") : "");

    return {
      _id: catObj._id || c._id || `cat-${i}`,
      categoryId: catObj._id || c.category,
      linkType: "category",
      name: catName,
      slug: catSlug,
      link: isNewArrivals
        ? "/category/new-arrivals"
        : c.link || (catSlug ? `/category/${catSlug}` : ""),
      image: c.customImage || c.image || catObj.image || "",
    };
  };

  const fetchSectionData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/pages/slug/cycling");
      const pageSections = res.data?.page?.sections || [];
      const found = pageSections.find(
        (s) =>
          s.type === "category-carousel" ||
          s.type === "category" ||
          (s.name && s.name.toLowerCase().includes("carousel")) ||
          s.name === "Cycles"
      );

      const catItems = found?.data?.categoryItems || found?.categoryItems;
      const cats = found?.data?.categories || found?.categories;
      const itemsList = found?.data?.items || found?.items;
      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map(
          (id) => String(id)
        )
      );

      let list = [];
      if (catItems && Array.isArray(catItems) && catItems.length > 0) {
        list = catItems
          .filter(
            (ci) =>
              ci.isActive !== false &&
              !disabledIds.has(String(ci._id)) &&
              !disabledIds.has(String(ci.category?._id || ci.category || ""))
          )
          .map(parseItem);
      } else if (cats && Array.isArray(cats) && cats.length > 0) {
        list = cats
          .filter(
            (c) =>
              c &&
              c.isActive !== false &&
              !disabledIds.has(String(c._id))
          )
          .map((cat, idx) => parseItem({ category: cat, ...cat }, idx));
      } else if (itemsList && Array.isArray(itemsList) && itemsList.length > 0) {
        list = itemsList
          .filter(
            (item, idx) =>
              item.isActive !== false &&
              !disabledIds.has(String(item._id || `item-${idx}`))
          )
          .map((item, idx) => parseItem(item, idx));
      }

      if (list.length > 0) {
        setCategories(list);
      } else {
        const catRes = await api.get("/categories");
        setCategories(
          (catRes.data.categories || []).slice(0, 8).map((c, i) =>
            parseItem({ category: c }, i)
          )
        );
      }
    } catch (err) {
      console.error("Cycling carousel error:", err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const rawList =
      customItems?.length
        ? customItems
        : customCategories?.length
        ? customCategories
        : data?.categoryItems !== undefined
        ? data.categoryItems
        : data?.items !== undefined
        ? data.items
        : data?.categories !== undefined
        ? data.categories
        : section?.data?.categoryItems !== undefined
        ? section.data.categoryItems
        : section?.data?.items !== undefined
        ? section.data.items
        : section?.data?.categories !== undefined
        ? section.data.categories
        : section?.categoryItems !== undefined
        ? section.categoryItems
        : section?.categories !== undefined
        ? section.categories
        : null;

    const disabledIds = new Set(
      (
        data?.disabledItemIds ||
        section?.data?.disabledItemIds ||
        section?.disabledItemIds ||
        []
      ).map((id) => String(id))
    );

    if (rawList !== null && Array.isArray(rawList)) {
      const parsed = rawList
        .filter((c, i) => {
          if (!c || (typeof c !== "object" && typeof c !== "string"))
            return false;
          if (c.isActive === false) return false;
          const cId = String(
            c._id ||
              c.category?._id ||
              c.category ||
              c.page?._id ||
              c.page ||
              `cat-${i}`
          );
          return !disabledIds.has(cId) && !disabledIds.has(String(c._id));
        })
        .map(parseItem);

      setCategories(parsed);
      setLoading(false);
      return;
    }

    fetchSectionData();
  }, [data, section, customCategories, customItems, fetchSectionData]);

  const handleCardClick = (cat) => {
    // 1. Store Page navigation
    if (cat.linkType === "page" || cat.pageSlug) {
      const slug = (cat.pageSlug || cat.slug || "").replace(/^\//, "");
      navigate(`/${slug}`);
      return;
    }

    // 2. New Arrivals route safety
    const name = (cat.name || "").trim();
    if (
      name.toLowerCase().includes("new arrival") ||
      cat.slug === "new-arrivals" ||
      cat.link === "/category/new-arrivals"
    ) {
      navigate("/category/new-arrivals");
      return;
    }

    // 3. Explicit link
    if (cat.link && cat.link !== "#") {
      navigate(cat.link);
      return;
    }

    // 4. Product Category route
    const targetSlug = cat.slug || encodeURIComponent(name.toLowerCase());
    navigate(`/category/${targetSlug}`, {
      state: {
        categoryId: cat.categoryId || cat._id,
        categoryName: name,
      },
    });
  };

  if (loading || !categories.length) {
    return null;
  }

  const sectionTitle =
    title ||
    section?.title ||
    section?.name ||
    data?.title ||
    data?.name ||
    "";

  return (
    <section className="category-carousel-cycling">
      {sectionTitle && sectionTitle !== "Cycles" && (
        <h2 className="cycling-category-title">{sectionTitle}</h2>
      )}
      <div className="cycling-category-track">
        {categories.map((cat, idx) => (
          <div
            key={cat._id || idx}
            className="cycling-category-card"
            onClick={() => handleCardClick(cat)}
          >
            <div className="cycling-category-circle">
              {cat.image ? (
                <img
                  src={getImageUrl(cat.image)}
                  alt={cat.name}
                  loading="lazy"
                />
              ) : (
                <div className="cycling-category-placeholder">
                  {cat.name}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Cycling;
