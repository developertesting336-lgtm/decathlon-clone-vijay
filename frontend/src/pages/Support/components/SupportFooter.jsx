import React, { useState } from "react";
import { FiX, FiMail, FiPhone, FiMessageCircle } from "react-icons/fi";
import "../Support.css";

const SupportFooter = () => {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <>
      <footer className="support-page-footer">
        <div className="support-page-footer-container">
          {/* LEFT: Copyright */}
          <div className="support-footer-copy">
            &copy; 2026 Decathlon.in
          </div>

          {/* RIGHT: Contact us button & Legal links */}
          <div className="support-footer-right">
            <button
              type="button"
              className="support-contact-btn"
              onClick={() => setContactModalOpen(true)}
            >
              Contact us
            </button>
            <div className="support-legal-links">
              <a href="#terms" className="support-legal-link">Terms &amp; Conditions</a>
              <span className="support-legal-sep">|</span>
              <a href="#privacy" className="support-legal-link">Privacy Policy</a>
            </div>
          </div>
        </div>
      </footer>


      {/* CONTACT US MODAL */}
      {contactModalOpen && (
        <div className="support-modal-backdrop" onClick={() => setContactModalOpen(false)}>
          <div className="support-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="support-modal-head">
              <h3>Contact Decathlon Support</h3>
              <button
                type="button"
                className="support-modal-close"
                onClick={() => setContactModalOpen(false)}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>
            <div className="support-modal-body">
              <div className="support-contact-item">
                <FiMail className="contact-icon" />
                <div>
                  <strong>Email Support</strong>
                  <p>care.india@decathlon.com</p>
                </div>
              </div>
              <div className="support-contact-item">
                <FiPhone className="contact-icon" />
                <div>
                  <strong>Toll Free Helpline</strong>
                  <p>1800 258 7777 (6 AM - 10 PM)</p>
                </div>
              </div>
              <div className="support-contact-item">
                <FiMessageCircle className="contact-icon" />
                <div>
                  <strong>Live Chat / WhatsApp</strong>
                  <p>Instant assistance with AI &amp; human team</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SupportFooter;
