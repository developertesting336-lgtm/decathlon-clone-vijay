import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/pageSections/Footer/Footer";

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
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "#f8fafc" }}>
      <Navbar />
      <main style={{ flex: 1, maxWidth: 920, width: "100%", margin: "32px auto", padding: "0 20px" }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, border: "1px solid #e2e8f0" }}>
          <h1 style={{ margin: "0 0 8px", color: "#0f172a", fontSize: 28 }}>{info.title}</h1>
          <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 15 }}>{info.subtitle}</p>

          <div style={{ display: "grid", gap: 20 }}>
            {info.sections.map((sec) => (
              <section key={sec.heading}>
                <h2 style={{ margin: "0 0 6px", fontSize: 18, color: "#0082c3" }}>{sec.heading}</h2>
                <p style={{ margin: 0, lineHeight: 1.6, color: "#334155", fontSize: 15 }}>{sec.body}</p>
              </section>
            ))}
          </div>

          <div style={{ marginTop: 28, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link to="/" style={{ padding: "10px 18px", background: "#0082c3", color: "#fff", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
              Back to Storefront
            </Link>
            <Link to="/support" style={{ padding: "10px 18px", background: "#f1f5f9", color: "#0f172a", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>
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
