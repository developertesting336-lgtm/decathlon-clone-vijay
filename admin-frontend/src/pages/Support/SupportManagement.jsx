import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FiHelpCircle,
  FiCheckCircle,
  FiFolder,
  FiLifeBuoy,
} from "react-icons/fi";
import api from "../../api/axios";
import CategoryManagement from "./CategoryManagement";
import FAQManagement from "./FAQManagement";
import SupportTickets from "./SupportTickets";
import "./SupportManagement.css";

const SupportManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "categories";
  const [activeTab, setActiveTab] = useState(initialTab);

  const [stats, setStats] = useState({
    totalCategories: 0,
    activeCategories: 0,
    totalFaqs: 0,
    activeFaqs: 0,
    totalTickets: 0,
    openTickets: 0,
  });

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Fetch overview statistics
  const fetchOverviewStats = async () => {
    try {
      const [catsRes, faqsRes, ticketsRes] = await Promise.all([
        api.get("/support/categories"),
        api.get("/support/faqs?limit=1000"),
        api.get("/support/admin/tickets?limit=1000"),
      ]);

      let totalCats = 0;
      let activeCats = 0;
      let totalF = 0;
      let activeF = 0;
      let totalT = 0;
      let openT = 0;

      if (catsRes.data?.success && Array.isArray(catsRes.data?.categories)) {
        const cats = catsRes.data.categories;
        totalCats = cats.length;
        activeCats = cats.filter((c) => c.isActive !== false).length;
      }

      if (faqsRes.data?.success && Array.isArray(faqsRes.data?.faqs)) {
        const faqs = faqsRes.data.faqs;
        totalF = faqs.length;
        activeF = faqs.filter((f) => f.isActive !== false).length;
      }

      if (ticketsRes.data?.success && Array.isArray(ticketsRes.data?.tickets)) {
        const tkts = ticketsRes.data.tickets;
        totalT = tkts.length;
        openT = tkts.filter((t) => (t.status || "").toLowerCase() === "open").length;
      }

      setStats({
        totalCategories: totalCats,
        activeCategories: activeCats,
        totalFaqs: totalF,
        activeFaqs: activeF,
        totalTickets: totalT,
        openTickets: openT,
      });
    } catch (e) {
      console.error("Failed to load overview stats:", e);
    }
  };

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && ["categories", "faqs", "tickets"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchOverviewStats();
  }, [activeTab]);

  return (
    <div className="support-admin-container">
      {/* 1. Header */}
      <div className="support-admin-header">
        <div className="support-admin-title-group">
          <h1>Support & Help Center Management</h1>
          <p>
            Manage public Help Center categories, interactive FAQ accordions, and customer support tickets.
          </p>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="support-stats-grid">
        <div className="support-stat-card">
          <div className="support-stat-icon categories">
            <FiFolder />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.totalCategories}</div>
            <div className="stat-label">Categories</div>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="support-stat-icon faqs">
            <FiHelpCircle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.totalFaqs}</div>
            <div className="stat-label">FAQs</div>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="support-stat-icon active" style={{ background: "#e0f2fe", color: "#0284c7" }}>
            <FiLifeBuoy />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.totalTickets}</div>
            <div className="stat-label">Total Tickets</div>
          </div>
        </div>

        <div className="support-stat-card">
          <div className="support-stat-icon" style={{ background: "#fef3c7", color: "#d97706" }}>
            <FiCheckCircle />
          </div>
          <div className="support-stat-info">
            <div className="stat-value">{stats.openTickets}</div>
            <div className="stat-label">Open Tickets</div>
          </div>
        </div>
      </div>

      {/* 3. Navigation Tabs */}
      <div className="support-tabs-nav" role="tablist">
        <button
          type="button"
          className={`support-tab-btn ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => handleTabChange("categories")}
          role="tab"
          aria-selected={activeTab === "categories"}
        >
          <FiFolder />
          <span>Categories</span>
          <span className="support-tab-count">{stats.totalCategories}</span>
        </button>

        <button
          type="button"
          className={`support-tab-btn ${activeTab === "faqs" ? "active" : ""}`}
          onClick={() => handleTabChange("faqs")}
          role="tab"
          aria-selected={activeTab === "faqs"}
        >
          <FiHelpCircle />
          <span>FAQs</span>
          <span className="support-tab-count">{stats.totalFaqs}</span>
        </button>

        <button
          type="button"
          className={`support-tab-btn ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => handleTabChange("tickets")}
          role="tab"
          aria-selected={activeTab === "tickets"}
        >
          <FiLifeBuoy />
          <span>Tickets</span>
          <span className="support-tab-count">{stats.totalTickets}</span>
        </button>
      </div>

      {/* 4. Tab Content */}
      <div className="support-tab-content">
        {activeTab === "categories" ? (
          <CategoryManagement />
        ) : activeTab === "faqs" ? (
          <FAQManagement />
        ) : (
          <SupportTickets embedded={true} />
        )}
      </div>
    </div>
  );
};

export default SupportManagement;
