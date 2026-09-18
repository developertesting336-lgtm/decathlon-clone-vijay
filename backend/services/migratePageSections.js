import Page from "../models/Page.js";
import PageSection from "../models/PageSection.js";

export const normalizeSectionType = (name = "", rawType = "") => {
  const n = name.toLowerCase().trim();
  const t = rawType.toLowerCase().trim();

  if (n.includes("coupon")) return "coupon-banner";
  if (n.includes("promo banner 2") || n.includes("promobanner2")) return "promo-banner-2";
  if (n.includes("promo") || t === "banner") return "promo-banner";
  if (n.includes("storm")) return "storm-proof";
  if (n.includes("outdoor")) return "outdoor-products";
  if (n.includes("champions")) return "equipping-champions";
  if (n.includes("loved")) return "loved-categories";
  if (n.includes("sports")) return "sports-categories";
  if (n.includes("showcase")) return "category-showcase";
  if (n.includes("nav")) return "category-nav";
  if (
    n.includes("everyday") ||
    n.includes("essentials") ||
    n.includes("head to toe") ||
    n.includes("rescue kit") ||
    n.includes("don't let rain") ||
    n.includes("protection for the whole") ||
    n.includes("from rain jackets to") ||
    n.includes("style that works") ||
    n.includes("sport equipments") ||
    n.includes("fitness essentials") ||
    n.includes("find your move") ||
    n.includes("shop for family") ||
    n.includes("shop by activity") ||
    n.includes("more accessories") ||
    n.includes("real-life solves")
  ) {
    return "everyday-essentials";
  }
  if (n.includes("carousel") || n.includes("popular") || t === "category") {
    return "category-carousel";
  }
  if (t === "product" || n.includes("product") || n.includes("checklist") || n.includes("combos") || n.includes("deal")) {
    return "product-section";
  }

  return t || "other";
};

export const migratePageSections = async () => {
  try {
    const pages = await Page.find();

    for (const page of pages) {
      const existingSectionsCount = await PageSection.countDocuments({ pageId: page._id });

      if (existingSectionsCount === 0 && page.sections && page.sections.length > 0) {
        console.log(`Migrating ${page.sections.length} embedded sections for page '${page.name}' (${page.slug})...`);

        const docs = page.sections.map((sec, idx) => {
          const canonicalType = normalizeSectionType(sec.name, sec.type);

          return {
            pageId: page._id,
            name: sec.name || `Section ${idx + 1}`,
            type: canonicalType,
            order: sec.sortOrder !== undefined ? sec.sortOrder : idx,
            isActive: sec.isActive !== undefined ? sec.isActive : true,
            data: {
              title: sec.name || "",
              subtitle: "",
              image: "",
              products: sec.products || [],
              categories: sec.categories || [],
              categoryItems: sec.categoryItems || [],
              banners: sec.banners || [],
              items: sec.items || [],
            },
            style: {
              variant: "default",
              customClass: "",
            },
          };
        });

        await PageSection.insertMany(docs);
        console.log(`Successfully migrated ${docs.length} sections for '${page.slug}'.`);
      }
    }
  } catch (err) {
    console.error("Migrate Page Sections Error:", err);
  }
};
