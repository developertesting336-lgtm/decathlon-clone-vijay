import React, { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiPackage, FiTruck } from "react-icons/fi";
import { Link, useParams } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import "../styles/OrderSuccess.css";

const OrderSuccess = () => {
  const { orderId } = useParams();

  const [order, setOrder] = useState(null);

  const [loading, setLoading] = useState(true);

  const getAuthConfig = () => {
    const token = localStorage.getItem("token");

    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  };

  const formatPrice = (price) =>
    `₹${Number(price || 0).toLocaleString("en-IN")}`;

  const fetchOrder = useCallback(async () => {
    if (!orderId) {
      toast.error("Order ID is missing");
      return;
    }

    try {
      const response = await api.get(`/orders/${orderId}`, getAuthConfig());

      setOrder(response.data?.order);
    } catch (error) {
      console.error("Order Success Error:", error);

      toast.error(error.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  if (loading) {
    return <div className="order-success-loading">Loading...</div>;
  }

  if (!order) {
    return (
      <div className="order-success-page">
        <div className="order-success-card">
          <h1>Order not found</h1>

          <Link to="/">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  const address = order.shippingAddress;

  return (
    <main className="order-success-page">
      <div className="order-success-card">
        <div className="success-icon">
          <FiCheckCircle />
        </div>

        <h1>Order placed successfully!</h1>

        <p className="success-message">
          Thank you for shopping with Decathlon.
        </p>

        <div className="success-order-box">
          <div className="success-order-item">
            <FiPackage />

            <div>
              <span>Order ID</span>

              <strong>#{order._id}</strong>
            </div>
          </div>

          <div className="success-order-item">
            <FiTruck />

            <div>
              <span>Delivery</span>

              <strong>Home Delivery</strong>
            </div>
          </div>

          <div className="success-order-item">
            <div className="success-payment-icon">₹</div>

            <div>
              <span>Payment</span>

              <strong>
                {order.paymentMethod === "COD"
                  ? "Pay on Delivery"
                  : order.paymentStatus}
              </strong>
            </div>
          </div>
        </div>

        <div className="success-total">
          <span>Total Amount</span>

          <strong>{formatPrice(order.totalAmount)}</strong>
        </div>

        {address && (
          <div className="success-address">
            <h3>Delivery Address</h3>

            <strong>
              {address.firstName} {address.lastName}
            </strong>

            <p>
              {address.houseBuilding}, {address.streetLocality}
              {address.landmark ? `, ${address.landmark}` : ""}
            </p>

            <p>
              {address.cityState}, {address.pincode}
            </p>

            <p>+91 {address.mobile}</p>
          </div>
        )}

        <div className="success-buttons">
          <Link to="/account/orders-returns" className="success-orders-btn">
            View My Orders
          </Link>

          <Link to="/" className="success-shop-btn">
            Continue Shopping
          </Link>
        </div>
      </div>
    </main>
  );
};

export default OrderSuccess;
