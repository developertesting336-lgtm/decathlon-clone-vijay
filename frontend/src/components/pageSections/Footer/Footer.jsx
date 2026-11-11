import React from "react";
import { Link } from "react-router-dom";
import {
  FiRotateCcw,
  FiPackage,
  FiTruck,
  FiSmile,
  FiRefreshCw,
  FiFacebook,
  FiInstagram,
} from "react-icons/fi";
import { FaXTwitter, FaYoutube } from "react-icons/fa6";
import DecathlonLogo from "../../DecathlonLogo";
import "./Footer.css";

const Footer = () => {
  return (
    <footer className="footer">
      {/* TOP BENEFITS */}
      <div className="footer-benefits">
        <div className="footer-benefit">
          <FiRotateCcw />
          <span>Easy Returns*</span>
        </div>

        <div className="footer-benefit">
          <FiPackage />
          <span>Collect in-store</span>
        </div>

        <div className="footer-benefit">
          <FiTruck />
          <span>Express Delivery *</span>
        </div>

        <div className="footer-benefit">
          <FiSmile />
          <span>1 Mn+ happy customers</span>
        </div>

        <div className="footer-benefit">
          <FiRefreshCw />
          <span>We buy back</span>
        </div>
      </div>

      {/* FOOTER CONTENT */}
      <div className="footer-content">
        <div className="footer-left">
          <Link to="/stores" className="footer-main-link">
            Download the app
          </Link>

          <Link to="/register" className="footer-main-link">
            Become a member
          </Link>

          <div className="footer-socials">
            <a
              href="https://www.facebook.com/DecathlonIndia/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="footer-social"
            >
              <FiFacebook />
            </a>

            <a
              href="https://x.com/Decathlon_India"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X"
              className="footer-social"
            >
              <FaXTwitter />
            </a>

            <a
              href="https://www.youtube.com/user/DecathlonIndia"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="footer-social"
            >
              <FaYoutube />
            </a>

            <a
              href="https://www.instagram.com/decathlonsportsindia/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="footer-social"
            >
              <FiInstagram />
            </a>
          </div>
        </div>

        {/* SERVICES */}
        <div className="footer-column">
          <h3>SERVICES</h3>
          <Link to="/all-sports">All Sports Gear</Link>
          <Link to="/workout-essentials">Workout Essentials</Link>
          <Link to="/cycling">Cycling Store</Link>
          <Link to="/hiking-trekking">Hiking &amp; Trekking</Link>
          <Link to="/shoes">Sports Footwear</Link>
          <Link to="/bags-backpacks">Bags &amp; Backpacks</Link>
          <Link to="/sports-accessories">Sports Accessories</Link>
          <Link to="/stores">In-Store Pickup</Link>
          <Link to="/support">Installation &amp; Assembly</Link>
        </div>

        {/* HELP */}
        <div className="footer-column">
          <h3>HELP</h3>
          <Link to="/stores">Find a store</Link>
          <Link to="/account/orders-returns">Orders &amp; Returns</Link>
          <Link to="/support">Help Center &amp; FAQs</Link>
          <Link to="/support/tickets">Support Tickets</Link>
          <Link to="/wishlist">Saved Wishlist</Link>
        </div>

        {/* ABOUT */}
        <div className="footer-column">
          <h3>ABOUT</h3>
          <Link to="/stores">About Decathlon</Link>
          <Link to="/all-sports">Made In India</Link>
          <Link to="/terms">Terms &amp; Conditions</Link>
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/support/tickets/new">Contact Us</Link>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="footer-bottom">
        <div className="footer-bottom-main">
          <div className="footer-logo">
            <DecathlonLogo className="footer-official-logo" color="#FFFFFF" height={22} />
          </div>

          <div className="footer-legal">
            <Link to="/terms">Terms and Conditions</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>

          <div className="footer-country">
            <span className="footer-flag">🇮🇳</span>
            <span>India</span>
            <span className="footer-country-arrow">˅</span>
          </div>
        </div>

        <div className="footer-copyright">
          © 2026 Decathlon Sports India Pvt Ltd. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
