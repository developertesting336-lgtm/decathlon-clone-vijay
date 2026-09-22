import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./SportsCategories.css";
import api from "../../../api/axios";
import socket from "../../../socket/socket";

const SportsCategories = ({ section, data, customCategories }) => {
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

  const extractItemsFromSection = useCallback((sec) => {
    if (!sec) return [];
    if (sec.isActive === false) return [];

    const disabledIds = new Set(
      [
        ...(sec.data?.disabledItemIds || []),
        ...(sec.disabledItemIds || []),
      ].map((id) => String(id))
    );

    // 1. Check categoryItems (contains custom uploaded images, category refs, links, order)
    const rawCatItems = sec.data?.categoryItems || sec.categoryItems;
    if (Array.isArray(rawCatItems) && rawCatItems.length > 0) {
      const activeItems = rawCatItems
        .filter((ci) => {
          if (!ci) return false;
          if (ci.isActive === false) return false;
          const ciId = String(ci._id || "");
          const catId = String(
            (typeof ci.category === "object" ? ci.category?._id : ci.category) || ""
          );
          const pageId = String(
            (typeof ci.page === "object" ? ci.page?._id : ci.page) || ""
          );
          if (ciId && disabledIds.has(ciId)) return false;
          if (catId && disabledIds.has(catId)) return false;
          if (pageId && disabledIds.has(pageId)) return false;
          return true;
        })
        .map((ci, idx) => {
          const isPage = ci.linkType === "page" || Boolean(ci.page);
          const catObj = typeof ci.category === "object" && ci.category ? ci.category : {};
          const pageObj = typeof ci.page === "object" && ci.page ? ci.page : {};

          const name =
            ci.name ||
            ci.title ||
            (isPage ? pageObj.name : catObj.name) ||
            `Category ${idx + 1}`;

          const image =
            ci.customImage ||
            ci.image ||
            (isPage ? pageObj.image : catObj.image) ||
            "";

          const slug =
            (isPage ? pageObj.slug : catObj.slug) ||
            ci.slug ||
            name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

          const link =
            ci.link ||
            (isPage
              ? `/${pageObj.slug || ""}`
              : catObj.slug
              ? `/category/${catObj.slug}`
              : `/category/${encodeURIComponent(slug)}`);

          const _id = ci._id || catObj._id || pageObj._id || `cat-item-${idx}`;

          return {
            _id,
            categoryId: String(catObj._id || (typeof ci.category === "string" ? ci.category : "") || ""),
            name,
            image,
            link,
            slug,
            destinationType: ci.destinationType || (isPage ? "store-page" : "category-page"),
            destinationId: ci.destinationId || (isPage ? pageObj._id : catObj._id) || "",
            destinationSlug: ci.destinationSlug || (isPage ? pageObj.slug : catObj.slug) || "",
            linkType: ci.linkType,
            pageSlug: isPage ? pageObj.slug || slug : "",
            order:
              ci.sortOrder !== undefined
                ? ci.sortOrder
                : ci.displayOrder !== undefined
                ? ci.displayOrder
                : idx,
          };
        });

      if (activeItems.length > 0) {
        return activeItems.sort((a, b) => a.order - b.order);
      }
    }

    // 2. Check items (custom items)
    const rawItems = sec.data?.items || sec.items;
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const activeItems = rawItems
        .filter((it) => {
          if (!it) return false;
          if (it.isActive === false) return false;
          const itId = String(it._id || "");
          if (itId && disabledIds.has(itId)) return false;
          return true;
        })
        .map((it, idx) => ({
          _id: it._id || `item-${idx}`,
          name: it.name || `Category ${idx + 1}`,
          image: it.image || "",
          link: it.link || "",
          slug:
            (it.link || "").replace(/^\//, "") ||
            it.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          order:
            it.sortOrder !== undefined
              ? it.sortOrder
              : it.displayOrder !== undefined
              ? it.displayOrder
              : idx,
        }));

      if (activeItems.length > 0) {
        return activeItems.sort((a, b) => a.order - b.order);
      }
    }

    // 3. Fallback to populated categories
    const rawCats = sec.data?.categories || sec.categories;
    if (Array.isArray(rawCats) && rawCats.length > 0) {
      const activeItems = rawCats
        .filter((c) => {
          if (!c || typeof c !== "object" || !c.name) return false;
          if (c.isActive === false) return false;
          const cId = String(c._id || "");
          if (cId && disabledIds.has(cId)) return false;
          return true;
        })
        .map((c, idx) => ({
          _id: c._id || `cat-${idx}`,
          categoryId: String(c._id || ""),
          name: c.name,
          image: c.image || "",
          link: c.slug
            ? `/category/${c.slug}`
            : `/category/${encodeURIComponent(
                c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
              )}`,
          slug: c.slug,
          order: c.sortOrder !== undefined ? c.sortOrder : idx,
        }));

      if (activeItems.length > 0) {
        return activeItems.sort((a, b) => a.order - b.order);
      }
    }

    return [];
  }, []);

  const fetchSection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/pages/slug/home");
      const pageSections = response.data?.page?.sections || [];

      const found = pageSections.find(
        (item) =>
          item.type === "sports-categories" ||
          item.name === "SportsCategories" ||
          (item.name &&
            item.name.toLowerCase().includes("sports") &&
            item.type === "category")
      );

      if (!found || found.isActive === false) {
        setCategories([]);
        return;
      }

      const extracted = extractItemsFromSection(found);
      if (extracted.length > 0) {
        setCategories(extracted);
      } else {
        const catRes = await api.get("/categories");
        setCategories(
          (catRes.data.categories || []).filter((c) => c.isActive !== false)
        );
      }
    } catch (error) {
      console.error("Sports Categories Error:", error);
      try {
        const catRes = await api.get("/categories");
        setCategories(
          (catRes.data.categories || []).filter((c) => c.isActive !== false)
        );
      } catch {
        setCategories([]);
      }
    } finally {
      setLoading(false);
    }
  }, [extractItemsFromSection]);

  useEffect(() => {
    if (section) {
      if (section.isActive === false) {
        setCategories([]);
        setLoading(false);
        return;
      }
      const combinedSec = {
        ...section,
        data: { ...(section.data || {}), ...(data || {}) },
      };
      const items = extractItemsFromSection(combinedSec);
      if (items.length > 0) {
        setCategories(items);
        setLoading(false);
        return;
      }
    } else if (customCategories && Array.isArray(customCategories) && customCategories.length > 0) {
      setCategories(customCategories);
      setLoading(false);
      return;
    }

    fetchSection();
  }, [section, data, customCategories, extractItemsFromSection, fetchSection]);

  useEffect(() => {
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
    socket.on("section_updated", handleHomepageUpdate);
    return () => {
      socket.off("homepage_updated", handleHomepageUpdate);
      socket.off("section_updated", handleHomepageUpdate);
    };
  }, [fetchSection]);

  // If section is inactive or has no items, do not render
  if (section && section.isActive === false) {
    return null;
  }

  if (loading || !categories.length) {
    return null;
  }

  const handleCategoryClick = (e, category) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!category) return;

    const categoryName = category.name || category.title || "Sports";

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

    // 1. None destination
    if (category.destinationType === "none") {
      return;
    }

    // 2. Category Page destination (MUST NOT fall back to store page)
    if (category.destinationType === "category-page") {
      const catSlug = (
        category.destinationSlug ||
        slug ||
        "products"
      )
        .replace(/^\/category\//, "")
        .replace(/^\//, "");

      navigate(`/category/${encodeURIComponent(catSlug)}`, {
        state: {
          categoryId: category.destinationId || categoryId || category._id,
          categoryName,
        },
      });
      return;
    }

    // 3. Product Page destination
    if (category.destinationType === "product-page") {
      const prodId = category.destinationId || category.productId;
      if (prodId) {
        navigate(`/product/${prodId}`);
        return;
      }
    }

    // 4. Store Page destination
    if (category.destinationType === "store-page") {
      const storeSlug = (
        category.destinationSlug ||
        category.pageSlug ||
        slug ||
        ""
      ).replace(/^\//, "");
      if (storeSlug) {
        navigate(`/${storeSlug}`, {
          state: {
            categoryId: categoryId || category._id,
            categoryName,
          },
        });
        return;
      }
    }

    // If explicit category/product route link exists, preserve it
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
            categoryName,
          },
        });
        return;
      }

      if (category.linkType === "page") {
        navigate(link, {
          state: {
            categoryId: categoryId || category._id,
            categoryName,
          },
        });
        return;
      }

      // If dynamic page link
      if (link.startsWith("/pages/") || link.startsWith("/p/")) {
        navigate(link);
        return;
      }

      // If link is a bare path like "/yoga" or "yoga", extract slug
      const cleanSlug = link.replace(/^\/+/, "");
      if (cleanSlug && !cleanSlug.includes("/")) {
        slug = cleanSlug.toLowerCase();
      }
    }

    if (category.linkType === "page" && category.pageSlug) {
      navigate(`/pages/${encodeURIComponent(category.pageSlug)}`);
      return;
    }

    if (slug === "all-sports" || slug === "all") {
      navigate("/category/all-sports", {
        state: { categoryId: categoryId || category._id, categoryName: "All Sports" },
      });
      return;
    }

    // Always navigate to category-based product page
    const targetSlug = slug || categoryId || "products";
    navigate(`/category/${encodeURIComponent(targetSlug)}`, {
      state: {
        categoryId: categoryId || category._id,
        categoryName,
      },
    });
  };

  return (
    <section className="sports-categories">
      <div className="sports-categories-list">
        {categories.map((category) => (
          <div
            className="sports-category-card"
            key={category._id}
            onClick={(e) => handleCategoryClick(e, category)}
            style={{ cursor: "pointer" }}
            title={category.name}
          >
            {category.image ? (
              <img
                src={getImageUrl(category.image)}
                alt={category.name}
                loading="lazy"
              />
            ) : (
              <div className="sports-category-no-image">{category.name}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default SportsCategories;
