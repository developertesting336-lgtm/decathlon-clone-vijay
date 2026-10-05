import React from "react";
import { Link } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";
import "../SupportCategory.css";

const SupportFAQ = ({ faqs = [], openId = null, onToggle }) => {
  if (!faqs || faqs.length === 0) {
    return (
      <div className="support-faq-empty">
        <p>No FAQs available in this category.</p>
      </div>
    );
  }

  return (
    <div className="support-faq-accordion" role="region" aria-label="Frequently Asked Questions">
      {faqs.map((faq) => {
        const faqIdentifier = faq._id || faq.id;
        const isOpen = openId === faqIdentifier;
        const answerId = `faq-answer-${faqIdentifier}`;
        const questionId = `faq-question-${faqIdentifier}`;

        return (
          <div
            key={faqIdentifier}
            className={`support-faq-item ${isOpen ? "open" : ""}`}
          >
            <button
              id={questionId}
              type="button"
              className="support-faq-question-btn"
              onClick={() => onToggle && onToggle(faqIdentifier)}
              aria-expanded={isOpen}
              aria-controls={answerId}
            >
              <span className="support-faq-question-text">{faq.question}</span>
              <span className="support-faq-chevron-wrap" aria-hidden="true">
                <FiChevronDown className={`support-faq-chevron ${isOpen ? "rotate" : ""}`} />
              </span>
            </button>

            <div
              id={answerId}
              className={`support-faq-answer-container ${isOpen ? "open" : ""}`}
              role="region"
              aria-labelledby={questionId}
              aria-hidden={!isOpen}
            >
              <div className="support-faq-answer-body">
                {typeof faq.answer === "string" ? (
                  faq.answer
                    .split(/\n\s*\n|\n/)
                    .filter((p) => p.trim())
                    .map((paragraph, pIdx) => (
                      <p key={pIdx} style={{ margin: "0 0 10px 0", lineHeight: 1.6, color: "#374151" }}>
                        {paragraph}
                      </p>
                    ))
                ) : (
                  <p>{faq.answer}</p>
                )}

                {faq.category && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #e2e8f0" }}>
                    <Link
                      to={`/support/category/${faq.category._id || faq.category}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#2b388f",
                        textDecoration: "none",
                        background: "#eff6ff",
                        padding: "4px 10px",
                        borderRadius: 6,
                      }}
                      title={`Browse more FAQs in ${faq.category.name || "this category"}`}
                    >
                      <span>📂 Category: {faq.category.name || "General"}</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SupportFAQ;
