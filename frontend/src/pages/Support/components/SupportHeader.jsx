import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiX } from "react-icons/fi";
import DecathlonLogo from "../../../components/DecathlonLogo";
import "../Support.css";

const SupportHeader = ({ activeTab = "ecommerce", onTabChange, onOpenDrawer }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && drawerOpen) {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (drawerOpen) {
      document.body.classList.add("support-drawer-body-locked");
    } else {
      document.body.classList.remove("support-drawer-body-locked");
    }
    return () => {
      document.body.classList.remove("support-drawer-body-locked");
    };
  }, [drawerOpen]);

  return (
    <>
      <header className="support-header-wrapper" role="banner">
        <div className="support-header-container">
          {/* LEFT: Hamburger + Logo */}
          <div className="support-header-left">
            <button
              type="button"
              className="support-hamburger-btn"
              onClick={() => {
                setDrawerOpen(true);
                onOpenDrawer && onOpenDrawer();
              }}
              aria-label="Open support menu"
              aria-expanded={drawerOpen}
            >
              <span className="support-hamburger-bars">
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>

            <Link to="/" className="support-header-logo" aria-label="Decathlon Home">
              <DecathlonLogo className="support-decathlon-logo" color="#2b388f" height={25} />
            </Link>
          </div>

          {/* RIGHT: E-Commerce & Organisations (Matches Screenshot 1) */}
          <nav className="support-header-right" aria-label="Support navigation">
            <button
              type="button"
              className={`support-nav-text ${activeTab === "ecommerce" ? "active" : ""}`}
              onClick={() => onTabChange && onTabChange("ecommerce")}
            >
              E-Commerce
            </button>

            <button
              type="button"
              className={`support-nav-text ${activeTab === "organisations" ? "active" : ""}`}
              onClick={() => onTabChange && onTabChange("organisations")}
            >
              Organisations
            </button>
          </nav>
        </div>
      </header>

      {/* SLIDE-OUT DRAWER (Matches Screenshot 5 exactly) */}
      {drawerOpen && (
        <div
          className="support-drawer-overlay"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`support-drawer ${drawerOpen ? "open" : ""}`}
        aria-label="Decathlon Support Menu"
        aria-hidden={!drawerOpen}
      >
        <div className="support-drawer-head">
          <h2 className="support-drawer-title">Decathlon Support</h2>
          <button
            type="button"
            className="support-drawer-close-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <FiX />
          </button>
        </div>

        <nav className="support-drawer-nav">
          <Link
            to="/stores"
            className="support-drawer-nav-item"
            onClick={() => setDrawerOpen(false)}
          >
            My Stores
          </Link>

          <a
            href="#services"
            className="support-drawer-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
              const el = document.getElementById("installation");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Services &amp; Installation
          </a>

          <a
            href="#warranty"
            className="support-drawer-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
              const el = document.getElementById("warranty");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Warranty Policy
          </a>

          <a
            href="#returns"
            className="support-drawer-nav-item"
            onClick={(e) => {
              e.preventDefault();
              setDrawerOpen(false);
              const el = document.getElementById("returns");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Return Policy
          </a>
        </nav>
      </aside>
    </>
  );
};

export default SupportHeader;
