import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/pageSections/Footer/Footer";
import "../styles/InfoPage.css";

const INFO_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    subtitle: "How Decathlon Sports India collects, uses, and protects your data.",
    sections: [
      {
        heading: "Information We Collect",
        body: "We collect account details (name, email, phone number), shipping addresses, order history, and support inquiries solely to process orders, provide customer assistance, and deliver restock or order status alerts.",
      },
      {
        heading: "Payment & Security",
        body: "Online card and UPI payments are processed through Stripe with TLS encryption. We never store raw card numbers or CVV codes on our servers.",
      },
      {
        heading: "Your Controls",
        body: "You can update your profile, saved addresses, and communication preferences anytime from your Profile and Account settings, or reach out via our Support Center.",
      },
    ],
  },
  terms: {
    title: "Terms & Conditions",
    subtitle: "Terms governing purchases, returns, exchanges, and loyalty benefits.",
    sections: [
      {
        heading: "Orders & Pricing",
        body: "All prices are displayed in INR inclusive of applicable taxes. Coupons and promotional discounts are validated server-side at checkout and are subject to minimum order and eligibility rules.",
      },
      {
        heading: "Returns & Exchanges",
        body: "Delivered orders are eligible for return or size/variant exchange within 7 days of delivery from your Orders & Returns page, provided items remain unused with original tags.",
      },
      {
        heading: "Warranty & Support",
        body: "Decathlon products carry a standard 2-year manufacturing warranty unless stated otherwise. Raise a ticket in the Support Center for warranty or delivery assistance.",
      },
    ],
  },
  stores: {
    title: "Decathlon Stores & Click & Collect",
    subtitle: "Pick up eligible online orders in-store or visit a Decathlon Experience Store.",
    sections: [
      {
        heading: "Store Pickup (Click & Collect)",
        body: "Select Pickup from Store at checkout for free 2-hour collection readiness at participating Decathlon stores.",
      },
      {
        heading: "Featured Hubs",
        body: "Bengaluru (Whitefield, Bannerghatta, Brigade Road) • Mumbai (R City, Thane) • Delhi NCR (Rohini, Noida, Gurugram) • Hyderabad • Chennai • Pune.",
      },
      {
        heading: "Need Store Assistance?",
        body: "Visit our Help & Support Center to raise a ticket or chat with our AI Assistant for store availability and pickup help.",
      },
    ],
  },
};

const InfoPage = ({ type = "privacy" }) => {
  const info = INFO_CONTENT[type] || INFO_CONTENT.privacy;

  return (
    <div className="info-page">
      <Navbar />
      <main className="info-main">
        <div className="info-card">
          <h1 className="info-title">{info.title}</h1>
          <p className="info-subtitle">{info.subtitle}</p>

          <div className="info-sections">
            {info.sections.map((sec) => (
              <section key={sec.heading} className="info-section">
                <h2>{sec.heading}</h2>
                <p>{sec.body}</p>
              </section>
            ))}
          </div>

          <div className="info-actions">
            <Link to="/" className="info-btn-primary">
              Back to Storefront
            </Link>
            <Link to="/support" className="info-btn-secondary">
              Visit Support Center
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InfoPage;
