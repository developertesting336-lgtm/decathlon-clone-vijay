import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiSearch,
  FiX,
  FiArrowLeft,
  FiMessageCircle,
  FiAlertCircle,
  FiRefreshCw,
  FiShoppingBag,
  FiHelpCircle,
} from "react-icons/fi";
import SupportHeader from "./components/SupportHeader";
import SupportFAQ from "./components/SupportFAQ";
import SupportFooter from "./components/SupportFooter";
import api from "../../api/axios";
import "./SupportCategory.css";

const SupportCategory = () => {
  const { categoryId, id } = useParams();
  const targetCategoryId = categoryId || id;
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [category, setCategory] = useState(null);
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [faqSearch, setFaqSearch] = useState("");
  const [openFaqId, setOpenFaqId] = useState(null);

  // Fetch category and FAQs exclusively from backend API using Axios
  const fetchCategoryData = useCallback(async () => {
    if (!targetCategoryId) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch category and category FAQs via Axios
      const [catRes, faqRes] = await Promise.allSettled([
        api.get(`/support/categories/${targetCategoryId}`),
        api.get(`/support/faqs/category/${targetCategoryId}`),
      ]);

      if (
        catRes.status === "fulfilled" &&
        catRes.value.data?.success &&
        catRes.value.data?.category
      ) {
        setCategory(catRes.value.data.category);

        if (
          faqRes.status === "fulfilled" &&
          faqRes.value.data?.success &&
          Array.isArray(faqRes.value.data?.faqs)
        ) {
          setFaqs(faqRes.value.data.faqs);
        } else if (Array.isArray(catRes.value.data?.faqs)) {
          setFaqs(catRes.value.data.faqs);
        } else {
          setFaqs([]);
        }
      } else {
        const status =
          catRes.status === "rejected" ? catRes.reason?.response?.status : null;
        if (status === 404 || status === 400) {
          setError("Support category not found.");
        } else {
          setError("Unable to load support information. Please try again.");
        }
      }
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 400) {
        setError("Support category not found.");
      } else {
        setError("Unable to load support information. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [targetCategoryId]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setFaqSearch("");
    setOpenFaqId(null);
    fetchCategoryData();
  }, [fetchCategoryData]);

  // Update document title
  useEffect(() => {
    const title = category?.name || category?.title;
    if (title) {
      document.title = `${title} - Support | Decathlon`;
    } else if (!loading && error) {
      document.title = "Category Not Found - Support | Decathlon";
    }
  }, [category, loading, error]);

  // Filter FAQs based on in-page search query (searches question and answer)
  const filteredFaqs = useMemo(() => {
    if (!faqs || faqs.length === 0) return [];
    const query = faqSearch.trim().toLowerCase();
    if (!query) return faqs;
    return faqs.filter((faq) =>
      `${faq.question} ${faq.answer}`.toLowerCase().includes(query)
    );
  }, [faqs, faqSearch]);

  // Toggle FAQ accordion: only one open at a time
  const handleFaqToggle = (id) => {
    setOpenFaqId((prevId) => (prevId === id ? null : id));
  };

  // Live Chat handler: Trigger existing AiChatbot launcher
  // TODO (Step 6+): Connect directly with backend live chat ticketing API when ready
  const handleLiveChat = () => {
    const chatbotBtn = document.querySelector(
      ".ai-chat-fab, .ai-launcher-btn, .ai-floating-trigger"
    );
    if (chatbotBtn) {
      chatbotBtn.click();
    } else {
      window.dispatchEvent(new CustomEvent("open-support-chat"));
    }
  };

  const handleMyOrdersClick = () => {
    if (token) {
      navigate("/account/orders-returns");
    } else {
      toast.error("Please login to view your orders.");
      navigate("/login");
    }
  };

  const handleCreateSupportRequest = () => {
    if (token) {
      navigate(targetCategoryId ? `/support/tickets/new?category=${targetCategoryId}` : "/support/tickets/new");
    } else {
      toast("Please login to create a support request", { icon: "ℹ️" });
      navigate("/login");
    }
  };

  const categoryTitle = category?.name || category?.title || "Support Category";

  return (
    <div className="support-category-page">
      {/* 1. Support Header */}
      <SupportHeader />

      <main className="support-category-main" id="support-category-content">
        <div className="support-category-container">
          {/* Loading State */}
          {loading ? (
            <div
              className="support-loading-container"
              style={{ textAlign: "center", padding: "80px 20px", color: "#64748b" }}
            >
              <div
                className="support-loading-spinner"
                style={{
                  margin: "0 auto 16px",
                  width: 40,
                  height: 40,
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#2b388f",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <p style={{ fontSize: 16, fontWeight: 500 }}>
                Loading FAQs...
              </p>
            </div>
          ) : error || !category ? (
            /* Error / Category Not Found State */
            <div className="support-not-found-card" role="alert">
              <FiAlertCircle className="support-not-found-icon" />
              <h1 className="support-not-found-title">
                {error === "Support category not found."
                  ? "Support category not found."
                  : "Unable to load support information."}
              </h1>
              <p className="support-not-found-text">
                {error || "Unable to load support information. Please try again."}
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  className="support-not-found-btn"
                  onClick={fetchCategoryData}
                  style={{ background: "#475569", cursor: "pointer" }}
                >
                  <FiRefreshCw style={{ marginRight: 6 }} /> Retry
                </button>
                <Link to="/support" className="support-not-found-btn">
                  <FiArrowLeft className="btn-icon" /> Back to Support
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* 2. Breadcrumb */}
              <nav className="support-breadcrumb" aria-label="Breadcrumb">
                <Link to="/" className="support-breadcrumb-link">
                  Home
                </Link>
                <span className="support-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
                <Link to="/support" className="support-breadcrumb-link">
                  Support
                </Link>
                <span className="support-breadcrumb-sep" aria-hidden="true">
                  /
                </span>
                <span className="support-breadcrumb-current" aria-current="page">
                  {categoryTitle}
                </span>
              </nav>

              {/* 3. Category Header */}
              <header className="support-category-header">
                <h1 className="support-category-title">{categoryTitle}</h1>
                <p className="support-category-desc">{category.description}</p>
              </header>

              {/* 4. In-Page FAQ Search */}
              <section
                className="support-faq-search-wrap"
                aria-label={`Search FAQs in ${categoryTitle}`}
              >
                <div className="support-faq-search-box">
                  <input
                    type="text"
                    className="support-faq-search-input"
                    placeholder={`Search in ${categoryTitle}...`}
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    aria-label={`Search in ${categoryTitle}`}
                  />
                  {faqSearch ? (
                    <button
                      type="button"
                      className="support-faq-clear-btn"
                      onClick={() => setFaqSearch("")}
                      aria-label="Clear FAQ search"
                    >
                      <FiX />
                    </button>
                  ) : null}
                  <FiSearch className="support-faq-search-icon" aria-hidden="true" />
                </div>
              </section>

              {/* 5. Frequently Asked Questions Accordion */}
              <section
                className="support-faq-section"
                aria-labelledby="faq-section-heading"
              >
                <h2 id="faq-section-heading" className="support-faq-heading">
                  Frequently Asked Questions
                </h2>

                {filteredFaqs.length > 0 ? (
                  <SupportFAQ
                    faqs={filteredFaqs}
                    openId={openFaqId}
                    onToggle={handleFaqToggle}
                  />
                ) : faqSearch ? (
                  /* Phase 17 Empty search state */
                  <div className="support-faq-no-match">
                    <p>No matching FAQs found.</p>
                    <button
                      type="button"
                      className="support-faq-reset-btn"
                      onClick={() => setFaqSearch("")}
                      aria-label="Clear search"
                    >
                      Clear search
                    </button>
                  </div>
                ) : (
                  /* Phase 17 Category has no FAQs state */
                  <div className="support-faq-empty">
                    <p>No FAQs are available for this category yet.</p>
                  </div>
                )}
              </section>

              {/* 6. Still Need Help Section (Step 12.4) */}
              <section
                className="support-still-help-card"
                aria-labelledby="still-help-heading"
              >
                <div className="support-still-help-info">
                  <h3 id="still-help-heading">Still need help?</h3>
                  <p>Can't find the answer you're looking for?</p>
                </div>
                <div
                  className="support-still-help-actions"
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    type="button"
                    className="support-chat-btn"
                    style={{
                      background: "#ffffff",
                      color: "#1e293b",
                      border: "1px solid #cbd5e1",
                    }}
                    onClick={handleMyOrdersClick}
                    aria-label="View My Orders"
                  >
                    <FiShoppingBag aria-hidden="true" />
                    <span>My Orders</span>
                  </button>
                  <button
                    type="button"
                    className="support-chat-btn"
                    style={{
                      background: "#0082c3",
                      color: "#ffffff",
                      border: "1px solid #0082c3",
                    }}
                    onClick={handleCreateSupportRequest}
                    aria-label="Create Support Request"
                  >
                    <FiHelpCircle aria-hidden="true" />
                    <span>Create Support Request</span>
                  </button>
                  <button
                    type="button"
                    className="support-chat-btn"
                    onClick={handleLiveChat}
                    aria-label="Start Live Chat with Support"
                  >
                    <FiMessageCircle aria-hidden="true" />
                    <span>Start Live Chat</span>
                  </button>
                </div>
              </section>

              {/* 7. Back to Support Link */}
              <div className="support-back-row">
                <Link to="/support" className="support-back-link">
                  <FiArrowLeft aria-hidden="true" />
                  <span>Back to all help topics</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      {/* 8. Support Footer */}
      <SupportFooter />
    </div>
  );
};

export default SupportCategory;
