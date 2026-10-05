import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiX } from "react-icons/fi";
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
              <svg
                viewBox="0 0 188 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="support-decathlon-logo"
                width="168"
                height="25"
                aria-hidden="true"
              >
                <path
                  d="M57.5509 23.8H70.7949V19.544H62.5909V15.974H69.8569V12.012H62.5909V8.442H70.7949V4.2H57.5509V23.8ZM87.2309 15.358C85.3129 18.41 83.4509 19.684 81.0569 19.684C77.9489 19.684 76.1429 17.5 76.1429 13.706C76.1429 10.108 77.8089 8.316 80.3709 8.316C82.0649 8.316 83.4649 9.072 83.8989 11.592H88.9389C88.3929 6.79 85.3269 3.808 80.4269 3.808C74.7429 3.808 71.0049 7.82599 71.0049 13.986C71.0049 20.188 74.7429 24.192 80.8889 24.192C84.9069 24.192 87.6369 22.512 89.4429 20.244H96.3169V23.8H101.329V4.2H94.2169L87.2309 15.358ZM96.3169 16.31H91.8789L96.3169 9.1V16.31ZM46.7989 4.2H39.4349V23.8H46.7989C52.6369 23.8 56.4029 19.95 56.4029 14C56.4029 8.05 52.6369 4.2 46.7989 4.2ZM46.7289 19.544H44.4749V8.442H46.7289C49.6409 8.442 51.2789 10.5 51.2789 14C51.2789 17.486 49.6409 19.544 46.7289 19.544ZM159.177 3.808C153.255 3.808 149.279 7.826 149.279 14C149.279 20.174 153.255 24.192 159.177 24.192C165.113 24.192 169.075 20.174 169.075 14C169.075 7.82601 165.113 3.808 159.177 3.808ZM159.177 19.684C156.265 19.684 154.431 17.738 154.431 14C154.431 10.262 156.265 8.316 159.177 8.316C162.103 8.316 163.923 10.262 163.923 14C163.923 17.738 162.103 19.684 159.177 19.684ZM102.589 8.442H107.531V23.8H112.571V8.442H117.513V4.2H102.589L102.589 8.442ZM181.941 4.2V14.994L175.445 4.2H170.223V23.8H175.095V12.558L181.857 23.8H186.813V4.2L181.941 4.2ZM142.139 4.2H137.099V23.8H149.741V19.558H142.139V4.2ZM130.603 11.676H123.813V4.2H118.773V23.8H123.813V15.904H130.603V23.8H135.643V4.2H130.603V11.676Z"
                  fill="#2b388f"
                />
                <path
                  d="M25.2111 0C14.2668 0 0.653107 11.3236 0.653107 20.7085C0.653107 25.5554 4.37614 28 9.29335 28C12.904 28 17.2733 26.6794 21.488 24.1365V5.40893C20.3641 7.33366 15.0816 15.0888 10.8388 19.2193C8.67519 21.3266 6.96119 22.2398 5.48603 22.2398C3.82822 22.2398 3.04147 21.1159 3.04147 19.4441C3.04147 11.8575 15.8122 1.99498 24.2698 1.99498C27.754 1.99498 30.0018 3.54039 30.0018 6.54692C30.0018 9.30055 28.1333 12.7566 24.9441 15.9458V21.7481C30.5076 17.3507 33.8373 11.7451 33.8373 7.22127C33.8373 2.4586 30.1283 0 25.2111 0Z"
                  fill="#2b388f"
                />
              </svg>
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
