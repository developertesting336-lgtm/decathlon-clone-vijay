import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import SectionRenderer from "../components/pageSections/SectionRenderer";
import "../styles/SectionPreview.css";
import "../styles/home/Home.css";

const SectionPreview = () => {
  const [searchParams] = useSearchParams();
  const routeParams = useParams();
  const navigate = useNavigate();

  const queryPageId = searchParams.get("pageId");
  const querySectionId = searchParams.get("sectionId");
  const queryPageSlug = searchParams.get("pageSlug");
  const isStandalone = searchParams.get("standalone") === "true";

  const pageId = routeParams.pageId || queryPageId;
  const sectionId = routeParams.sectionId || querySectionId;

  const [section, setSection] = useState(null);
  const [pageSlug, setPageSlug] = useState(queryPageSlug || "home");
  const [pageName, setPageName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  // Check if loaded inside an iframe
  useEffect(() => {
    try {
      setIsEmbedded(!isStandalone && window.self !== window.top);
    } catch {
      setIsEmbedded(!isStandalone);
    }
  }, [isStandalone]);

  // Fetch section data from backend preview endpoint as fallback
  const fetchSectionFromApi = useCallback(async () => {
    if (!pageId || !sectionId) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/pages/preview/${pageId}/${sectionId}`);
      if (res.data?.success && res.data?.section) {
        setSection(res.data.section);
        if (res.data.page?.slug) setPageSlug(res.data.page.slug);
        if (res.data.page?.name) setPageName(res.data.page.name);
      } else {
        setError("Section could not be loaded for preview");
      }
    } catch (err) {
      console.warn("API preview fetch attempt:", err?.message);
      // If preview endpoint fails, attempt to get page by id or slug
      try {
        const pageRes = await api.get(`/pages/${pageId}`);
        const p = pageRes.data?.page;
        if (p && p.sections) {
          const found = p.sections.find(
            (s) => String(s._id) === String(sectionId)
          );
          if (found) {
            setSection(found);
            if (p.slug) setPageSlug(p.slug);
            if (p.name) setPageName(p.name);
            setLoading(false);
            return;
          }
        }
      } catch (innerErr) {
        // Fallback error
      }
      setError(err?.response?.data?.message || "Failed to load section preview");
    } finally {
      setLoading(false);
    }
  }, [pageId, sectionId]);

  // Handle postMessage communication from parent admin window
  useEffect(() => {
    const handleWindowMessage = (event) => {
      if (event.data?.type === "SECTION_PREVIEW_DATA" && event.data.section) {
        setSection(event.data.section);
        if (event.data.pageSlug) setPageSlug(event.data.pageSlug);
        if (event.data.pageName) setPageName(event.data.pageName);
        setLoading(false);
        setError(null);

        // Acknowledge receipt to parent
        try {
          if (window.parent && window.parent !== window) {
            window.parent.postMessage({ type: "PREVIEW_LOADED" }, "*");
          }
        } catch (e) {}
      }
    };

    window.addEventListener("message", handleWindowMessage);

    // Notify parent window that preview is mounted and ready to accept data
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "PREVIEW_READY" }, "*");
      }
    } catch (e) {}

    return () => window.removeEventListener("message", handleWindowMessage);
  }, []);

  // If no postMessage received within 350ms and we have URL params, fetch from API
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!section && pageId && sectionId) {
        fetchSectionFromApi();
      } else if (!section && !pageId && !sectionId) {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [section, pageId, sectionId, fetchSectionFromApi]);

  // Read-only click interceptor: prevents navigation or form submissions
  const handleReadOnlyClickCapture = (e) => {
    const interactive = e.target.closest(
      "a, button, input[type='submit'], input[type='button']"
    );
    if (interactive && !interactive.closest(".section-preview-header-bar")) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      className={`section-preview-root ${
        isEmbedded ? "is-embedded" : "is-standalone"
      }`}
    >
      {/* Standalone Header (only visible when not in an iframe) */}
      {!isEmbedded && (
        <header className="section-preview-header-bar">
          <div className="section-preview-meta">
            <span className="preview-indicator-badge">
              <span className="preview-dot"></span>
              Storefront Preview &bull; Read-Only
            </span>
            {section?.name && (
              <span className="preview-section-title">{section.name}</span>
            )}
            {section?.type && (
              <span className="preview-type-pill">
                {section.type.replace(/-/g, " ")}
              </span>
            )}
            {pageName && (
              <span className="preview-type-pill">
                Page: {pageName}
              </span>
            )}
            {section && section.isActive === false && (
              <span className="preview-inactive-tag">
                Currently Disabled in Store
              </span>
            )}
          </div>
          <button
            type="button"
            className="preview-close-window-btn"
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                navigate(-1);
              }
            }}
            title="Close preview window"
          >
            Close Preview
          </button>
        </header>
      )}

      {/* Loading Skeleton */}
      {loading && !section && (
        <div className="preview-skeleton-container">
          <div className="preview-skeleton-bar"></div>
          <div className="preview-skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="preview-skeleton-box"></div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {!loading && error && !section && (
        <div className="preview-error-state">
          <h3>Preview Unavailable</h3>
          <p>{error}</p>
          <button type="button" onClick={() => fetchSectionFromApi()}>
            Retry Loading
          </button>
        </div>
      )}

      {/* Empty / waiting state */}
      {!loading && !error && !section && (
        <div className="preview-error-state">
          <h3>Waiting for section data...</h3>
          <p>
            Please select a section from the Page Builder to view its live storefront preview.
          </p>
        </div>
      )}

      {/* Live Storefront Section Preview */}
      {section && (
        <div
          className="section-preview-canvas read-only-locked"
          onClickCapture={handleReadOnlyClickCapture}
        >
          <div
            className={`section-preview-store-wrap ${
              pageSlug === "home"
                ? "home-page"
                : `dynamic-page dynamic-page-${pageSlug} ${pageSlug}-page`
            }`}
          >
            <div
              className={
                pageSlug === "home"
                  ? "home-container"
                  : `dynamic-page-container dynamic-page-container-${pageSlug} ${pageSlug}-container`
              }
              style={{ paddingTop: "20px", paddingBottom: "30px" }}
            >
              <SectionRenderer
                section={section}
                sectionIndex={0}
                pageSlug={pageSlug || "home"}
                isPreview={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SectionPreview;
