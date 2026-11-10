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
            <svg
              viewBox="0 0 188 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="footer-official-logo"
              width="150"
              height="22"
              aria-label="Decathlon"
            >
              <path
                d="M57.5509 23.8H70.7949V19.544H62.5909V15.974H69.8569V12.012H62.5909V8.442H70.7949V4.2H57.5509V23.8ZM87.2309 15.358C85.3129 18.41 83.4509 19.684 81.0569 19.684C77.9489 19.684 76.1429 17.5 76.1429 13.706C76.1429 10.108 77.8089 8.316 80.3709 8.316C82.0649 8.316 83.4649 9.072 83.8989 11.592H88.9389C88.3929 6.79 85.3269 3.808 80.4269 3.808C74.7429 3.808 71.0049 7.82599 71.0049 13.986C71.0049 20.188 74.7429 24.192 80.8889 24.192C84.9069 24.192 87.6369 22.512 89.4429 20.244H96.3169V23.8H101.329V4.2H94.2169L87.2309 15.358ZM96.3169 16.31H91.8789L96.3169 9.1V16.31ZM46.7989 4.2H39.4349V23.8H46.7989C52.6369 23.8 56.4029 19.95 56.4029 14C56.4029 8.05 52.6369 4.2 46.7989 4.2ZM46.7289 19.544H44.4749V8.442H46.7289C49.6409 8.442 51.2789 10.5 51.2789 14C51.2789 17.486 49.6409 19.544 46.7289 19.544ZM159.177 3.808C153.255 3.808 149.279 7.826 149.279 14C149.279 20.174 153.255 24.192 159.177 24.192C165.113 24.192 169.075 20.174 169.075 14C169.075 7.82601 165.113 3.808 159.177 3.808ZM159.177 19.684C156.265 19.684 154.431 17.738 154.431 14C154.431 10.262 156.265 8.316 159.177 8.316C162.103 8.316 163.923 10.262 163.923 14C163.923 17.738 162.103 19.684 159.177 19.684ZM102.589 8.442H107.531V23.8H112.571V8.442H117.513V4.2H102.589L102.589 8.442ZM181.941 4.2V14.994L175.445 4.2H170.223V23.8H175.095V12.558L181.857 23.8H186.813V4.2L181.941 4.2ZM142.139 4.2H137.099V23.8H149.741V19.558H142.139V4.2ZM130.603 11.676H123.813V4.2H118.773V23.8H123.813V15.904H130.603V23.8H135.643V4.2H130.603V11.676Z"
                fill="#FFFFFF"
              />
              <path
                d="M25.2111 0C14.2668 0 0.653107 11.3236 0.653107 20.7085C0.653107 25.5554 4.37614 28 9.29335 28C12.904 28 17.2733 26.6794 21.488 24.1365V5.40893C20.3641 7.33366 15.0816 15.0888 10.8388 19.2193C8.67519 21.3266 6.96119 22.2398 5.48603 22.2398C3.82822 22.2398 3.04147 21.1159 3.04147 19.4441C3.04147 11.8575 15.8122 1.99498 24.2698 1.99498C27.754 1.99498 30.0018 3.54039 30.0018 6.54692C30.0018 9.30055 28.1333 12.7566 24.9441 15.9458V21.7481C30.5076 17.3507 33.8373 11.7451 33.8373 7.22127C33.8373 2.4586 30.1283 0 25.2111 0Z"
                fill="#FFFFFF"
              />
            </svg>
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
