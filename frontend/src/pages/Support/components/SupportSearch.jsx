import React, { useState } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import "../Support.css";

const SupportSearch = ({ onSearch, value = "", onChange }) => {
  const [searchTerm, setSearchTerm] = useState(value);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    if (onChange) {
      onChange(val);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    if (onChange) {
      onChange("");
    }
    if (onSearch) {
      onSearch("");
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    // FAQ search functionality will be connected later
    if (onSearch) {
      onSearch(searchTerm);
    }
  };

  return (
    <section className="support-search-hero" aria-labelledby="support-search-heading">
      <div className="support-search-container">
        <h1 id="support-search-heading" className="support-search-title">
          How can we help you?
        </h1>

        <form className="support-search-form" onSubmit={handleSearch} role="search">
          <label htmlFor="support-search-input" className="sr-only">
            Search for a question or topic
          </label>

          <div className="support-search-box">
            <input
              id="support-search-input"
              type="text"
              className="support-search-input"
              placeholder="Search for a question or topic"
              value={searchTerm}
              onChange={handleInputChange}
              autoComplete="off"
            />

            {searchTerm ? (
              <button
                type="button"
                className="support-search-clear-btn"
                onClick={handleClear}
                aria-label="Clear search input"
              >
                <FiX />
              </button>
            ) : null}

            <button
              type="submit"
              className="support-search-submit-btn"
              aria-label="Search"
            >
              <FiSearch className="support-search-icon" />
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default SupportSearch;
