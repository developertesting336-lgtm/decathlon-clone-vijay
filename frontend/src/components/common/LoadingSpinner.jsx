import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = ({
  message = "Loading Decathlon...",
  minHeight = "50vh",
  size = "medium",
  fullPage = false,
}) => {
  return (
    <div
      className={`decathlon-loading-container ${fullPage ? "full-page" : ""}`}
      style={{ minHeight }}
      role="status"
      aria-live="polite"
    >
      <div className={`decathlon-spinner-ring ${size}`} />
      {message && <p className="decathlon-loading-text">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;
