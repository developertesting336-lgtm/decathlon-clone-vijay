import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import "./HikingTrekking.css";
import api from "../../../../api/axios";

const HikingTrekking = ({
  section,
  data,
  customCategories,
  customItems,
  title,
}) => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    if (!trackRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = trackRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  const handleScroll = (direction) => {
    if (!trackRef.current) return;
    const offset = direction === "left" ? -320 : 320;
    trackRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  const getImageUrl = (image) => {
    if (!image) return "";
    if (
      typeof image === "string" &&
      (image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("data:"))
    ) {
      return image;
    }
    if (
      typeof image === "string" &&
      (image.startsWith("/assets/") || image.startsWith("assets/"))
    ) {
      return image.startsWith("/") ? image : `/${image}`;
    }
    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
    if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
    if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
    return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
  };

  const parseItem = useCallback((c, i) => {
    const destType =
      c.destinationType ||
      (c.linkType === "page" ? "store-page" : "category-page");

    if (destType === "store-page" || c.linkType === "page") {
      const pageObj =
        typeof c.page === "object" && c.page
          ? c.page
          : {
              _id: c.page || c.destinationId,
              name: c.name || c.title || "Store Page",
            };
      const pageName = (
        c.title ||
        c.name ||
        pageObj.name ||
        "Store Page"
      ).trim();
      const resolvedSlug = (
        c.destinationSlug ||
        pageObj.slug ||
        c.slug ||
        (c.link ? c.link.replace(/^\//, "") : "")
      ).trim();

      return {
        _id: pageObj._id || c._id || `page-${i}`,
        destinationType: "store-page",
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
        : {
            _id: c.category || c.categoryId || c.destinationId,
            name: c.name || c.title || "Category",
          };
    const catName = (c.title || c.name || catObj.name || "Category").trim();
    const isNewArrivals =
      catName.toLowerCase().includes("new arrival") ||
      c.link === "/category/new-arrivals" ||
      catObj.slug === "new-arrivals";
    const catSlug = isNewArrivals
      ? "new-arrivals"
      : c.destinationSlug ||
        catObj.slug ||
        (c.link ? c.link.replace(/^\/category\//, "").replace(/^\//, "") : "");

    return {
      _id: catObj._id || c._id || `cat-${i}`,
      categoryId: catObj._id || c.category || c.categoryId,
      destinationType: "category-page",
      linkType: "category",
      name: catName,
      slug: catSlug,
      link: isNewArrivals
        ? "/category/new-arrivals"
        : c.link || (catSlug ? `/category/${catSlug}` : ""),
      image: c.customImage || c.image || catObj.image || "",
    };
  }, []);

  const fetchSectionData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/pages/slug/hiking-trekking");
      const pageSections = res.data?.page?.sections || [];
      const found = pageSections.find(
        (s) =>
          s.type === "category-carousel" ||
          s.type === "category" ||
          (s.name && s.name.toLowerCase().includes("carousel")) ||
          s.name === "hiking-trekking-store",
      );

      const catItems = found?.data?.categoryItems || found?.categoryItems;
      const cats = found?.data?.categories || found?.categories;
      const itemsList = found?.data?.items || found?.items;
      const disabledIds = new Set(
        (found?.data?.disabledItemIds || found?.disabledItemIds || []).map(
          (id) => String(id),
        ),
      );

      let list = [];
      if (catItems && Array.isArray(catItems) && catItems.length > 0) {
        list = catItems
          .filter(
            (ci) =>
              ci.isActive !== false &&
              !disabledIds.has(String(ci._id)) &&
              !disabledIds.has(String(ci.category?._id || ci.category || "")),
          )
          .map(parseItem);
      } else if (cats && Array.isArray(cats) && cats.length > 0) {
        list = cats
          .filter(
            (c) => c && c.isActive !== false && !disabledIds.has(String(c._id)),
          )
          .map((cat, idx) => parseItem({ category: cat, ...cat }, idx));
      } else if (
        itemsList &&
        Array.isArray(itemsList) &&
        itemsList.length > 0
      ) {
        list = itemsList
          .filter(
            (item, idx) =>
              item.isActive !== false &&
              !disabledIds.has(String(item._id || `item-${idx}`)),
          )
          .map((item, idx) => parseItem(item, idx));
      }

      if (list.length > 0) {
        setCategories(list);
      } else {
        try {
          const catRes = await api.get("/categories");
          const fetchedCats = (catRes.data.categories || []).slice(0, 8);
          if (fetchedCats.length > 0) {
            setCategories(
              fetchedCats.map((c, i) => parseItem({ category: c }, i)),
            );
          } else {
            setCategories([]);
          }
        } catch {
          setCategories([]);
        }
      }
    } catch (err) {
      console.error("HikingTrekking carousel error:", err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [parseItem]);

  useEffect(() => {
    const rawList = customItems?.length
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
      ).map((id) => String(id)),
    );

    if (rawList !== null && Array.isArray(rawList) && rawList.length > 0) {
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
              `cat-${i}`,
          );
          return !disabledIds.has(cId) && !disabledIds.has(String(c._id));
        })
        .map(parseItem);

      setCategories(parsed);
      setLoading(false);
      return;
    }

    fetchSectionData();
  }, [
    data,
    section,
    customCategories,
    customItems,
    fetchSectionData,
    parseItem,
  ]);

  useEffect(() => {
    if (!loading && categories.length > 0) {
      setTimeout(checkScroll, 100);
    }
  }, [loading, categories, checkScroll]);

  const handleCardClick = (cat) => {
    // 1. Store Page navigation
    if (
      cat.destinationType === "store-page" ||
      cat.linkType === "page" ||
      cat.pageSlug
    ) {
      const slug = (
        cat.destinationSlug ||
        cat.pageSlug ||
        cat.slug ||
        ""
      ).replace(/^\//, "");
      if (slug) {
        navigate(`/${slug}`);
        return;
      }
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
    const targetSlug =
      cat.slug ||
      encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
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
    title || section?.title || section?.name || data?.title || data?.name || "";

  return (
    <section className="category-carousel-hiking-trekking">
      {sectionTitle && sectionTitle !== "hiking-trekking-store" && (
        <h2 className="hiking-category-title">{sectionTitle}</h2>
      )}

      <div className="hiking-category-wrapper">
        {canScrollLeft && (
          <button
            type="button"
            className="hiking-scroll-arrow left"
            onClick={() => handleScroll("left")}
            aria-label="Previous categories"
          >
            <MdChevronLeft size={24} />
          </button>
        )}

        <div
          className="hiking-category-track"
          ref={trackRef}
          onScroll={checkScroll}
        >
          {categories.map((cat, idx) => (
            <div
              key={cat._id || idx}
              className="hiking-category-card"
              onClick={() => handleCardClick(cat)}
            >
              <div className="hiking-category-arch">
                {cat.image ? (
                  <img
                    src={getImageUrl(cat.image)}
                    alt={cat.name}
                    loading="lazy"
                    onError={(e) => {
                      e.target.style.display = "none";
                      if (e.target.nextSibling) {
                        e.target.nextSibling.style.display = "flex";
                      }
                    }}
                  />
                ) : null}
                <div
                  className="hiking-category-placeholder"
                  style={{ display: cat.image ? "none" : "flex" }}
                ></div>
              </div>
              <span className="hiking-category-name">{cat.name}</span>
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            type="button"
            className="hiking-scroll-arrow right"
            onClick={() => handleScroll("right")}
            aria-label="Next categories"
          >
            <MdChevronRight size={24} />
          </button>
        )}
      </div>
    </section>
  );
};

export default HikingTrekking;
