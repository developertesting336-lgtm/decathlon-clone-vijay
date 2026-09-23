import React, { useCallback, useEffect, useState } from "react";
import {
  FiChevronRight,
  FiBox,
  FiUser,
  FiMapPin,
  FiPower,
  FiCreditCard,
  FiTarget,
  FiSliders,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";

import api from "../api/axios";
import socket from "../socket/socket";
import Navbar from "../components/Navbar";
import AddressDrawer from "../components/AddressDrawer";
import "../styles/MyAccount.css";

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

const formatPrice = (price) => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status) => {
  if (!status) return "";
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getImageUrl = (image) => {
  if (!image) return "";
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }
  const apiBaseUrl = api.defaults.baseURL || "";
  const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");
  if (image.startsWith("/uploads/")) return `${backendUrl}${image}`;
  if (image.startsWith("uploads/")) return `${backendUrl}/${image}`;
  return `${backendUrl}${image.startsWith("/") ? "" : "/"}${image}`;
};

const MyAccount = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Sidebar navigation: 'orders' | 'address'
  const initialNav = searchParams.get("tab") === "address" ? "address" : "orders";
  const [activeNav, setActiveNav] = useState(initialNav);

  // Orders State
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [activeTab, setActiveTab] = useState("online"); // 'online' | 'store'
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [cancellingId, setCancellingId] = useState("");

  // Return Modal State
  const [returnModalOrder, setReturnModalOrder] = useState(null);
  const [selectedReturnItems, setSelectedReturnItems] = useState({}); // { [productId]: quantity }
  const [returnReason, setReturnReason] = useState("");
  const [returnDetails, setReturnDetails] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Exchange Modal State
  const [exchangeModalOrder, setExchangeModalOrder] = useState(null);
  const [exchangeSelectedItem, setExchangeSelectedItem] = useState(null);
  const [exchangeQty, setExchangeQty] = useState(1);
  const [exchangeReason, setExchangeReason] = useState("");
  const [exchangeDetails, setExchangeDetails] = useState("");
  const [exchangeNewSize, setExchangeNewSize] = useState("");
  const [productDetailsMap, setProductDetailsMap] = useState({});
  const [loadingProductDetails, setLoadingProductDetails] = useState(false);
  const [submittingExchange, setSubmittingExchange] = useState(false);

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);

  const [user, setUser] = useState(null);

  const RETURN_WINDOW_DAYS = 7;

  const isOrderDeliveredWithinWindow = (order) => {
    if (!order) return false;
    const status = (order.orderStatus || "").toLowerCase();
    if (status !== "delivered") {
      return false;
    }
    const baseDate = order.deliveredAt
      ? new Date(order.deliveredAt)
      : new Date(order.createdAt);
    const diffDays = (new Date() - baseDate) / (1000 * 60 * 60 * 24);
    return diffDays <= RETURN_WINDOW_DAYS;
  };

  const isOrderReturnEligible = (order) => {
    if (!isOrderDeliveredWithinWindow(order)) return false;
    return (
      !order.returnStatus ||
      order.returnStatus === "NONE" ||
      order.returnStatus === "REJECTED" ||
      order.returnStatus === "CANCELLED"
    );
  };

  const isOrderExchangeEligible = (order) => {
    if (!isOrderDeliveredWithinWindow(order)) return false;
    return (
      !order.exchangeStatus ||
      order.exchangeStatus === "NONE" ||
      order.exchangeStatus === "REJECTED" ||
      order.exchangeStatus === "CANCELLED"
    );
  };

  const handleOpenReturnModal = (order) => {
    setReturnModalOrder(order);
    const initialItems = {};
    (order.orderItems || []).forEach((item) => {
      const pid = (item.product?._id || item.product || "").toString();
      if (pid) {
        initialItems[pid] = item.quantity;
      }
    });
    setSelectedReturnItems(initialItems);
    setReturnReason("");
    setReturnDetails("");
  };

  const handleOpenExchangeModal = (order) => {
    setExchangeModalOrder(order);
    const firstItem = order.orderItems?.[0] || null;
    setExchangeSelectedItem(firstItem);
    setExchangeQty(1);
    setExchangeReason("");
    setExchangeDetails("");
    setExchangeNewSize("");

    if (firstItem) {
      const pid = (firstItem.product?._id || firstItem.product || "").toString();
      fetchProductDetails(pid);
    }
  };

  const handleCloseExchangeModal = () => {
    if (submittingExchange) return;
    setExchangeModalOrder(null);
    setExchangeSelectedItem(null);
    setExchangeQty(1);
    setExchangeReason("");
    setExchangeDetails("");
    setExchangeNewSize("");
  };

  const fetchProductDetails = async (productId) => {
    if (!productId || productDetailsMap[productId]) return;
    try {
      setLoadingProductDetails(true);
      const res = await api.get(`/products/${productId}`);
      if (res.data?.product) {
        setProductDetailsMap((prev) => ({
          ...prev,
          [productId]: res.data.product,
        }));
      }
    } catch (err) {
      console.error("Fetch product for exchange error:", err);
    } finally {
      setLoadingProductDetails(false);
    }
  };

  const handleSelectExchangeProduct = (item) => {
    setExchangeSelectedItem(item);
    setExchangeQty(1);
    setExchangeNewSize("");
    const pid = (item.product?._id || item.product || "").toString();
    fetchProductDetails(pid);
  };

  const handleSubmitExchange = async (e) => {
    e.preventDefault();
    if (!exchangeModalOrder || !exchangeSelectedItem) return;

    if (!exchangeReason) {
      toast.error("Please select an exchange reason");
      return;
    }

    if (!exchangeNewSize) {
      toast.error("Please select a new size");
      return;
    }

    const pid = (
      exchangeSelectedItem.product?._id ||
      exchangeSelectedItem.product ||
      ""
    ).toString();

    try {
      setSubmittingExchange(true);
      const response = await api.post(
        `/orders/${exchangeModalOrder._id}/exchange`,
        {
          productId: pid,
          quantity: exchangeQty,
          currentSize: exchangeSelectedItem.size || "",
          newSize: exchangeNewSize,
          reason: exchangeReason,
          details: exchangeDetails,
        },
        getAuthConfig()
      );

      toast.success(
        response.data?.message || "Exchange request submitted successfully."
      );

      const updatedOrder = response.data?.order;
      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      } else {
        fetchOrders();
      }

      handleCloseExchangeModal();
    } catch (error) {
      console.error("Submit Exchange Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Unable to submit exchange request. Please try again."
      );
    } finally {
      setSubmittingExchange(false);
    }
  };

  const handleCloseReturnModal = () => {
    if (submittingReturn) return;
    setReturnModalOrder(null);
    setSelectedReturnItems({});
    setReturnReason("");
    setReturnDetails("");
  };

  const toggleItemSelection = (productId, maxQty) => {
    setSelectedReturnItems((prev) => {
      const updated = { ...prev };
      if (updated[productId] !== undefined) {
        delete updated[productId];
      } else {
        updated[productId] = maxQty;
      }
      return updated;
    });
  };

  const updateItemReturnQty = (productId, qty) => {
    setSelectedReturnItems((prev) => ({
      ...prev,
      [productId]: Number(qty),
    }));
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    if (!returnModalOrder) return;

    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, qty]) => Number(qty) > 0)
      .map(([productId, quantity]) => ({
        productId,
        quantity: Number(quantity),
      }));

    if (itemsToReturn.length === 0) {
      toast.error("Please select at least one product to return");
      return;
    }

    if (!returnReason || !returnReason.trim()) {
      toast.error("Please select a return reason");
      return;
    }

    try {
      setSubmittingReturn(true);
      const response = await api.post(
        `/orders/${returnModalOrder._id}/return`,
        {
          items: itemsToReturn,
          reason: returnReason,
          details: returnDetails,
        },
        getAuthConfig()
      );

      toast.success(
        response.data?.message ||
          "Your return request has been submitted successfully."
      );

      const updatedOrder = response.data?.order;
      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      } else {
        fetchOrders();
      }

      handleCloseReturnModal();
    } catch (error) {
      console.error("Submit Return Error:", error);
      toast.error(
        error.response?.data?.message ||
          "Unable to submit return request. Please try again."
      );
    } finally {
      setSubmittingReturn(false);
    }
  };

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "address") {
      setActiveNav("address");
    } else if (tabParam === "orders" || tabParam === "order-returns") {
      setActiveNav("orders");
    }
  }, [searchParams]);

  // Fetch Orders
  const fetchOrders = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    try {
      setLoadingOrders(true);
      const response = await api.get("/orders/my-orders", getAuthConfig());
      const fetchedOrders = response.data.orders || [];
      setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
    } catch (error) {
      console.error("Fetch My Orders Error:", error);
      if (error.response?.status === 401) {
        toast.error("Session expired. Please login again.");
        navigate("/login");
        return;
      }
      toast.error(error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoadingOrders(false);
    }
  }, [navigate]);

  // Fetch Addresses
  const fetchAddresses = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      setLoadingAddresses(true);
      const response = await api.get("/addresses", getAuthConfig());
      const fetchedAddresses = response.data?.addresses || [];
      setAddresses(Array.isArray(fetchedAddresses) ? fetchedAddresses : []);
    } catch (error) {
      console.error("Fetch Addresses Error:", error);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchAddresses();

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("User parse error", e);
      }
    }
  }, [fetchOrders, fetchAddresses]);

  useEffect(() => {
    const handleOrderUpdate = async (event) => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const response = await api.get("/orders/my-orders", getAuthConfig());
        const fetchedOrders = response.data?.orders || [];
        setOrders(Array.isArray(fetchedOrders) ? fetchedOrders : []);
      } catch (err) {
        console.error("Real-time my-orders refresh error:", err);
      }
    };

    socket.on("order_updated", handleOrderUpdate);

    return () => {
      socket.off("order_updated", handleOrderUpdate);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.dispatchEvent(new Event("authChanged"));
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      setCancellingId(orderId);
      const response = await api.put(
        `/orders/${orderId}/cancel`,
        {},
        getAuthConfig()
      );
      toast.success(response.data?.message || "Order cancelled successfully");
      fetchOrders();
    } catch (error) {
      console.error("Cancel Order Error:", error);
      toast.error(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setCancellingId("");
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm("Are you sure you want to delete this address?")) {
      return;
    }

    try {
      const response = await api.delete(`/addresses/${addressId}`, getAuthConfig());
      toast.success(response.data?.message || "Address deleted successfully");
      fetchAddresses();
    } catch (error) {
      console.error("Delete Address Error:", error);
      toast.error(error.response?.data?.message || "Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      const response = await api.put(
        `/addresses/${addressId}`,
        { isDefault: true },
        getAuthConfig()
      );
      toast.success(response.data?.message || "Set as default address");
      fetchAddresses();
    } catch (error) {
      console.error("Set Default Address Error:", error);
      toast.error(error.response?.data?.message || "Failed to update default address");
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setIsAddressDrawerOpen(true);
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setIsAddressDrawerOpen(true);
  };

  const handleAddressSaved = () => {
    fetchAddresses();
    setIsAddressDrawerOpen(false);
  };

  // Filter orders
  const getFilteredOrders = () => {
    if (activeTab === "store") return [];
    if (filterPeriod === "all") return orders;

    const now = new Date().getTime();
    let days = 30;
    if (filterPeriod === "3months") days = 90;
    if (filterPeriod === "6months") days = 180;

    const cutoffTime = now - days * 24 * 60 * 60 * 1000;

    return orders.filter((order) => {
      const orderTime = new Date(order.createdAt).getTime();
      return orderTime >= cutoffTime;
    });
  };

  const filteredOrders = getFilteredOrders();

  const getPeriodLabel = () => {
    switch (filterPeriod) {
      case "1month":
        return "Last 1 month";
      case "3months":
        return "Last 3 months";
      case "6months":
        return "Last 6 months";
      default:
        return "All orders";
    }
  };

  return (
    <div className="orders-page">
      <Navbar />

      <main className="orders-main">
        <div className="orders-layout">
          {/* SIDEBAR */}
          <aside className="orders-sidebar">
            <div className="orders-phone-box">
              {user?.mobile ? user.mobile : "+919459940381"}
            </div>

            <div className="loyalty-box">
              <div className="loyalty-heading">
                <strong>Loyalty Points</strong>
                <span>
                  0 pts
                  <FiChevronRight />
                </span>
              </div>

              <div className="loyalty-divider"></div>

              <p>
                Start shopping today to earn &amp; redeem points for direct
                savings on purchases!
              </p>

              <button
                type="button"
                onClick={() => toast.info("Loyalty program coming soon")}
              >
                LEARN MORE
              </button>
            </div>

            <div className="sidebar-menu">
              <div
                className={`sidebar-item ${activeNav === "orders" ? "active" : ""}`}
                onClick={() => {
                  setActiveNav("orders");
                  setSearchParams({ tab: "orders" });
                }}
              >
                <FiBox />
                <span>My Orders</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => navigate("/profile")}
              >
                <FiUser />
                <span>My Profile</span>
              </div>

              <div
                className="sidebar-item"
                onClick={() => toast.info("Wallet features coming soon")}
              >
                <FiCreditCard />
                <span>Wallet</span>
                <strong>₹ 0</strong>
              </div>

              <div
                className="sidebar-item"
                onClick={() => toast.info("Rewards coming soon")}
              >
                <FiTarget />
                <span>Sporty Rewards</span>
                <strong>₹ 0</strong>
              </div>

              <div
                className={`sidebar-item ${activeNav === "address" ? "active" : ""}`}
                onClick={() => {
                  setActiveNav("address");
                  setSearchParams({ tab: "address" });
                }}
              >
                <FiMapPin />
                <span>Address</span>
              </div>

              <div className="sidebar-item" onClick={handleLogout}>
                <FiPower />
                <span>Logout</span>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT SECTION */}
          <section className="orders-content">
            {activeNav === "address" ? (
              /* =====================================================
                 YOUR ADDRESS VIEW
              ===================================================== */
              <div className="address-section-card">
                <h2 className="address-section-title">Your Address</h2>

                <div className="address-grid">
                  {/* ADD NEW ADDRESS CARD */}
                  <div
                    className="add-address-dashed-card"
                    onClick={handleOpenAddAddress}
                  >
                    <div className="add-address-plus">+</div>
                    <div className="add-address-text">Add New Address</div>
                  </div>

                  {/* SAVED ADDRESS CARDS */}
                  {loadingAddresses ? (
                    <div className="orders-loading-spinner">
                      Loading addresses...
                    </div>
                  ) : (
                    addresses.map((address) => (
                      <div
                        key={address._id}
                        className={`address-card-box ${
                          !address.isDefault ? "non-default" : ""
                        }`}
                      >
                        <div>
                          <div className="address-card-header">
                            {address.addressType || "Home"}
                          </div>
                          <div className="address-card-name">
                            {address.firstName} {address.lastName}
                          </div>
                          <div className="address-card-body">
                            {address.houseBuilding}, {address.streetLocality}
                            {address.landmark ? `, ${address.landmark}` : ""},{" "}
                            {address.cityState}, {address.pincode}
                          </div>
                          <div className="address-card-phone">
                            Phone: {address.mobile}
                          </div>
                        </div>

                        <div className="address-card-actions">
                          <button
                            type="button"
                            className="btn-addr-action"
                            onClick={() => handleEditAddress(address)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="btn-addr-action"
                            onClick={() => handleDeleteAddress(address._id)}
                          >
                            Delete
                          </button>

                          {address.isDefault ? (
                            <span className="badge-default-address">
                              Default Address
                            </span>
                          ) : (
                            <button
                              type="button"
                              className="btn-set-default"
                              onClick={() => handleSetDefaultAddress(address._id)}
                            >
                              Set as Default
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* =====================================================
                 MY ORDERS VIEW
              ===================================================== */
              <>
                <div className="orders-tabs">
                  <div className="orders-title">Orders &amp; Returns</div>

                  <button
                    type="button"
                    className={`order-tab ${
                      activeTab === "online" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("online")}
                  >
                    ONLINE ORDER
                  </button>

                  <button
                    type="button"
                    className={`order-tab ${
                      activeTab === "store" ? "active" : ""
                    }`}
                    onClick={() => setActiveTab("store")}
                  >
                    STORE ORDER
                  </button>

                  <div style={{ position: "relative", marginLeft: "auto" }}>
                    <button
                      type="button"
                      className="filter-button"
                      onClick={() => setShowFilterDropdown((prev) => !prev)}
                    >
                      <FiSliders />
                      <span>{getPeriodLabel()}</span>
                    </button>

                    {showFilterDropdown && (
                      <div
                        style={{
                          position: "absolute",
                          top: "calc(100% + 5px)",
                          right: 0,
                          background: "#fff",
                          border: "1px solid #ddd",
                          borderRadius: "8px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                          zIndex: 10,
                          minWidth: "160px",
                          overflow: "hidden",
                        }}
                      >
                        {[
                          { id: "all", label: "All orders" },
                          { id: "1month", label: "Last 1 month" },
                          { id: "3months", label: "Last 3 months" },
                          { id: "6months", label: "Last 6 months" },
                        ].map((option) => (
                          <div
                            key={option.id}
                            onClick={() => {
                              setFilterPeriod(option.id);
                              setShowFilterDropdown(false);
                            }}
                            style={{
                              padding: "10px 16px",
                              fontSize: "13px",
                              cursor: "pointer",
                              background:
                                filterPeriod === option.id
                                  ? "#f0f2ff"
                                  : "#fff",
                              color:
                                filterPeriod === option.id
                                  ? "#3945bd"
                                  : "#111",
                              fontWeight:
                                filterPeriod === option.id ? "600" : "400",
                            }}
                          >
                            {option.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {loadingOrders ? (
                  <div className="orders-loading-spinner">
                    Loading your orders...
                  </div>
                ) : filteredOrders.length > 0 ? (
                  <div className="orders-list">
                    {filteredOrders.map((order) => (
                      <div key={order._id} className="order-card">
                        <div className="order-card-header">
                          <div className="order-card-info">
                            <span className="order-card-id">
                              Order #{order._id.slice(-8).toUpperCase()}
                            </span>
                            <span className="order-card-date">
                              Placed on {formatDate(order.createdAt)} •{" "}
                              {order.orderItems?.length || 0} item(s)
                            </span>
                          </div>

                          <div className="order-card-badges">
                            {order.orderStatus?.toLowerCase() === "cancelled" ? (
                              <>
                                <span className="status-badge cancelled">Cancelled</span>
                                {order.paymentStatus?.toLowerCase() === "refunded" ? (
                                  <span className="status-badge refunded">Refunded</span>
                                ) : (
                                  <span className="payment-badge pending">
                                    {order.paymentMethod === "COD" ? "Unpaid (COD)" : "Unpaid"}
                                  </span>
                                )}
                              </>
                            ) : order.orderStatus?.toLowerCase() === "refunded" ||
                              order.paymentStatus?.toLowerCase() === "refunded" ? (
                              <>
                                <span className="status-badge refunded">Refunded</span>
                                <span className="payment-badge refunded">Refunded</span>
                              </>
                            ) : (
                              <>
                                <span
                                  className={`status-badge ${order.orderStatus?.toLowerCase()}`}
                                >
                                  {formatStatus(order.orderStatus)}
                                </span>
                                <span
                                  className={`payment-badge ${order.paymentStatus?.toLowerCase()}`}
                                >
                                  {order.paymentStatus === "paid"
                                    ? "Paid"
                                    : order.paymentStatus === "failed"
                                    ? "Failed"
                                    : "Unpaid"}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* {order.returnRequest?.reason && (
                          <div className="order-card-return-note">
                            <strong>Return Details:</strong> {order.returnRequest.reason}
                            {order.returnRequest.refundAmount > 0 && (
                              <span> • Refund Amount: {formatPrice(order.returnRequest.refundAmount)}</span>
                            )}
                          </div>
                        )} */}

                        <div className="order-card-body">
                          {order.orderItems?.map((item, idx) => (
                            <div key={idx} className="order-card-item">
                              <img
                                src={getImageUrl(item.image)}
                                alt={item.name}
                                className="order-item-img"
                                onError={(e) => {
                                  e.target.src =
                                    "https://via.placeholder.com/60?text=Product";
                                }}
                              />
                              <div className="order-item-details">
                                <h4 className="order-item-name">{item.name}</h4>
                                <span className="order-item-meta">
                                  Qty: {item.quantity}{" "}
                                  {item.size ? `• Size: ${item.size}` : ""}
                                </span>
                              </div>
                              <div className="order-item-price">
                                {formatPrice(item.price * item.quantity)}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="order-card-footer">
                          <div className="order-total-price">
                            Total Amount: {formatPrice(order.totalAmount)}
                          </div>

                          <div className="order-actions">
                            {order.paymentStatus === "pending" &&
                              !["cancelled", "refunded", "return_requested", "returned", "failed"].includes(
                                order.orderStatus?.toLowerCase()
                              ) && (
                                <button
                                  type="button"
                                  className="btn-order-action btn-pay"
                                  onClick={() =>
                                    navigate(`/payment/${order._id}`)
                                  }
                                >
                                  Pay Now
                                </button>
                              )}

                            {(order.orderStatus === "pending" ||
                              order.orderStatus === "confirmed") && (
                              <button
                                type="button"
                                className="btn-order-action btn-cancel"
                                disabled={cancellingId === order._id}
                                onClick={() => handleCancelOrder(order._id)}
                              >
                                {cancellingId === order._id
                                  ? "Cancelling..."
                                  : "Cancel Order"}
                              </button>
                            )}

                            {/* RETURN BUTTON / BADGE */}
                            {isOrderReturnEligible(order) ? (
                              <button
                                type="button"
                                className="btn-order-action btn-return"
                                onClick={() => handleOpenReturnModal(order)}
                              >
                                Return
                              </button>
                            ) : order.returnStatus &&
                              order.returnStatus !== "NONE" &&
                              order.orderStatus !== "cancelled" ? (
                              <div
                                className={`return-status-tag ${order.returnStatus.toLowerCase()}`}
                              >
                                {order.returnStatus === "REQUESTED" ? (
                                  <span>Return Requested</span>
                                ) : order.returnStatus === "APPROVED" ? (
                                  <span>Return Approved</span>
                                ) : order.returnStatus === "PICKUP_SCHEDULED" ? (
                                  <span>Pickup Scheduled</span>
                                ) : order.returnStatus === "PICKED_UP" ? (
                                  <span>Picked Up</span>
                                ) : order.returnStatus === "RETURN_RECEIVED" ? (
                                  <span>Return Received</span>
                                ) : order.returnStatus === "REFUND_PROCESSING" ? (
                                  <span>Refund Processing</span>
                                ) : order.returnStatus === "REFUNDED" ? (
                                  <span>Refund Completed</span>
                                ) : order.returnStatus === "REJECTED" ? (
                                  <span>Return Rejected</span>
                                ) : (
                                  <span>{order.returnStatus.replace("_", " ")}</span>
                                )}
                              </div>
                            ) : null}

                            {/* EXCHANGE BUTTON / BADGE */}
                            {isOrderExchangeEligible(order) ? (
                              <button
                                type="button"
                                className="btn-order-action btn-exchange"
                                onClick={() => handleOpenExchangeModal(order)}
                              >
                                Exchange
                              </button>
                            ) : order.exchangeStatus &&
                              order.exchangeStatus !== "NONE" &&
                              order.orderStatus !== "cancelled" ? (
                              <div
                                className={`exchange-status-tag ${order.exchangeStatus.toLowerCase()}`}
                              >
                                {order.exchangeStatus === "REQUESTED" ? (
                                  <span>Exchange Requested</span>
                                ) : order.exchangeStatus === "APPROVED" ? (
                                  <span>Exchange Approved</span>
                                ) : order.exchangeStatus === "PICKUP_SCHEDULED" ? (
                                  <span>Exchange Pickup</span>
                                ) : order.exchangeStatus === "PICKED_UP" ? (
                                  <span>Item Picked Up</span>
                                ) : order.exchangeStatus === "RECEIVED" ? (
                                  <span>Item Received</span>
                                ) : order.exchangeStatus === "SHIPPED" ? (
                                  <span>Replacement Shipped</span>
                                ) : order.exchangeStatus === "DELIVERED" ? (
                                  <span>Exchange Delivered</span>
                                ) : order.exchangeStatus === "REJECTED" ? (
                                  <span>Exchange Rejected</span>
                                ) : (
                                  <span>{order.exchangeStatus.replace("_", " ")}</span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-orders">
                    <div className="empty-image">
                      <div className="tag-shape">
                        <div className="tag-hole"></div>
                        <div className="tag-dot"></div>
                      </div>
                    </div>

                    <p>No items are available</p>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <div
        className="floating-close"
        onClick={() => toast.info("Decathlon Support")}
        style={{ cursor: "pointer" }}
      >
        ×
      </div>

      <div
        className="floating-decathlon"
        onClick={() => navigate("/")}
        style={{ cursor: "pointer" }}
      >
        <div className="floating-mark">
          <span></span>
        </div>
      </div>

      {/* RETURN PRODUCT MODAL */}
      {returnModalOrder && (
        <div
          className="decathlon-modal-backdrop"
          onClick={handleCloseReturnModal}
        >
          <div
            className="decathlon-return-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="return-modal-header">
              <div className="return-modal-title-box">
                <h3>Return Product</h3>
                <span className="return-modal-subtitle">
                  Order #{returnModalOrder._id.slice(-8).toUpperCase()} •{" "}
                  Placed on {formatDate(returnModalOrder.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="return-modal-close"
                onClick={handleCloseReturnModal}
                disabled={submittingReturn}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="return-modal-body">
              <div className="return-form-section">
                <label className="return-section-label">
                  Select product(s) to return:
                </label>
                <div className="return-items-list">
                  {returnModalOrder.orderItems?.map((item, idx) => {
                    const pid = (
                      item.product?._id ||
                      item.product ||
                      ""
                    ).toString();
                    const isSelected = selectedReturnItems[pid] !== undefined;
                    const returnQty = selectedReturnItems[pid] || 1;

                    return (
                      <div
                        key={idx}
                        className={`return-item-row ${
                          isSelected ? "selected" : ""
                        }`}
                      >
                        <label className="return-item-checkbox-label">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() =>
                              toggleItemSelection(pid, item.quantity)
                            }
                            disabled={submittingReturn}
                          />
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="return-item-thumb"
                            onError={(e) => {
                              e.target.src =
                                "https://via.placeholder.com/50?text=Item";
                            }}
                          />
                          <div className="return-item-info">
                            <span className="return-item-name">
                              {item.name}
                            </span>
                            <span className="return-item-details">
                              Purchased: {item.quantity}{" "}
                              {item.size ? `• Size: ${item.size}` : ""} •{" "}
                              {formatPrice(item.price)} each
                            </span>
                          </div>
                        </label>

                        {isSelected && item.quantity > 1 && (
                          <div className="return-qty-select-box">
                            <span>Return Qty:</span>
                            <select
                              value={returnQty}
                              onChange={(e) =>
                                updateItemReturnQty(pid, e.target.value)
                              }
                              disabled={submittingReturn}
                            >
                              {Array.from(
                                { length: item.quantity },
                                (_, i) => i + 1
                              ).map((q) => (
                                <option key={q} value={q}>
                                  {q}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="return-form-section">
                <label className="return-section-label">
                  Return Reason: <span className="required-star">*</span>
                </label>
                <select
                  className="return-reason-select"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  disabled={submittingReturn}
                  required
                >
                  <option value="">Select reason</option>
                  <option value="Product damaged">Product damaged</option>
                  <option value="Wrong product received">Wrong product received</option>
                  <option value="Product doesn't fit">Product doesn't fit</option>
                  <option value="Product quality issue">Product quality issue</option>
                  <option value="Product not as expected">Product not as expected</option>
                  <option value="Changed my mind">Changed my mind</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="return-form-section">
                <label className="return-section-label">
                  Additional Details:{" "}
                  <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  className="return-details-textarea"
                  value={returnDetails}
                  onChange={(e) => setReturnDetails(e.target.value)}
                  placeholder="Please provide any additional comments or details..."
                  rows={3}
                  disabled={submittingReturn}
                />
              </div>

              {/* Estimated Refund Notice */}
              <div className="return-refund-estimate">
                <span>Estimated Refund Amount:</span>
                <strong>
                  {formatPrice(
                    returnModalOrder.orderItems?.reduce((total, item) => {
                      const pid = (
                        item.product?._id ||
                        item.product ||
                        ""
                      ).toString();
                      const qty = selectedReturnItems[pid];
                      return qty ? total + item.price * qty : total;
                    }, 0) || 0
                  )}
                </strong>
              </div>

              <div className="return-modal-actions">
                <button
                  type="button"
                  className="btn-return-cancel"
                  onClick={handleCloseReturnModal}
                  disabled={submittingReturn}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-return-submit"
                  disabled={
                    submittingReturn ||
                    Object.keys(selectedReturnItems).length === 0 ||
                    !returnReason
                  }
                >
                  {submittingReturn ? (
                    <span className="return-spinner-text">
                      <span className="return-mini-spinner"></span> Submitting...
                    </span>
                  ) : (
                    "Submit Return"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCHANGE PRODUCT MODAL */}
      {exchangeModalOrder && exchangeSelectedItem && (
        <div
          className="decathlon-modal-backdrop"
          onClick={handleCloseExchangeModal}
        >
          <div
            className="decathlon-return-modal decathlon-exchange-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="return-modal-header">
              <div className="return-modal-title-box">
                <h3>Exchange Product</h3>
                <span className="return-modal-subtitle">
                  Order #{exchangeModalOrder._id.slice(-8).toUpperCase()} • Placed on{" "}
                  {formatDate(exchangeModalOrder.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="return-modal-close"
                onClick={handleCloseExchangeModal}
                disabled={submittingExchange}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmitExchange} className="return-modal-body">
              {/* If multiple items, allow picking which item */}
              {exchangeModalOrder.orderItems?.length > 1 && (
                <div className="return-form-section">
                  <label className="return-section-label">
                    Select product to exchange:
                  </label>
                  <div className="exchange-product-picker">
                    {exchangeModalOrder.orderItems.map((item, idx) => {
                      const pid = (
                        item.product?._id ||
                        item.product ||
                        ""
                      ).toString();
                      const isCurrent =
                        (
                          exchangeSelectedItem.product?._id ||
                          exchangeSelectedItem.product ||
                          ""
                        ).toString() === pid;
                      return (
                        <div
                          key={idx}
                          className={`exchange-picker-item ${
                            isCurrent ? "active" : ""
                          }`}
                          onClick={() => handleSelectExchangeProduct(item)}
                        >
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name}
                            className="exchange-picker-thumb"
                          />
                          <span>{item.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CURRENT PRODUCT DISPLAY */}
              <div className="exchange-current-box">
                <span className="exchange-section-title">Current Product</span>
                <div className="exchange-current-row">
                  <img
                    src={getImageUrl(exchangeSelectedItem.image)}
                    alt={exchangeSelectedItem.name}
                    className="exchange-current-thumb"
                    onError={(e) => {
                      e.target.src =
                        "https://via.placeholder.com/60?text=Product";
                    }}
                  />
                  <div className="exchange-current-info">
                    <strong>{exchangeSelectedItem.name}</strong>
                    <div className="exchange-meta-chips">
                      <span className="exchange-chip">
                        Current Size: <strong>{exchangeSelectedItem.size || "Standard"}</strong>
                      </span>
                      <span className="exchange-chip">
                        Quantity: <strong>{exchangeQty}</strong>
                      </span>
                      <span className="exchange-chip">
                        Price: <strong>{formatPrice(exchangeSelectedItem.price)}</strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* REASON FOR EXCHANGE */}
              <div className="return-form-section">
                <label className="return-section-label">
                  Exchange Reason: <span className="required-star">*</span>
                </label>
                <select
                  className="return-reason-select"
                  value={exchangeReason}
                  onChange={(e) => setExchangeReason(e.target.value)}
                  disabled={submittingExchange}
                  required
                >
                  <option value="">Select reason</option>
                  <option value="Wrong size">Wrong size</option>
                  <option value="Wrong product">Wrong product</option>
                  <option value="Damaged product">Damaged product</option>
                  <option value="Product quality issue">Product quality issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* SELECT NEW SIZE */}
              <div className="return-form-section">
                <label className="return-section-label">
                  Select New Size: <span className="required-star">*</span>
                </label>
                {loadingProductDetails ? (
                  <div className="exchange-loading-sizes">
                    Checking available sizes &amp; stock...
                  </div>
                ) : (
                  (() => {
                    const pid = (
                      exchangeSelectedItem.product?._id ||
                      exchangeSelectedItem.product ||
                      ""
                    ).toString();
                    const prod = productDetailsMap[pid];
                    const availableSizes = Array.isArray(prod?.size)
                      ? prod.size
                      : ["S", "M", "L", "XL"];
                    const inStock = (prod?.stock ?? 1) >= exchangeQty;

                    return (
                      <div className="exchange-sizes-grid">
                        {availableSizes.map((s, sIdx) => {
                          const isSameAsCurrent =
                            (exchangeSelectedItem.size || "").trim().toLowerCase() ===
                            s.trim().toLowerCase();
                          const isSelected = exchangeNewSize === s;
                          const isOutOfStock = !inStock;

                          return (
                            <button
                              type="button"
                              key={sIdx}
                              className={`exchange-size-btn ${
                                isSelected ? "selected" : ""
                              } ${isOutOfStock ? "out-of-stock" : ""}`}
                              disabled={isOutOfStock || submittingExchange}
                              onClick={() => setExchangeNewSize(s)}
                            >
                              <span className="size-label">{s}</span>
                              {isSameAsCurrent && (
                                <span className="size-current-tag">Current</span>
                              )}
                              {isOutOfStock && (
                                <span className="size-stock-tag">Out of stock</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* PRICE DIFFERENCE DISPLAY */}
              {(() => {
                const pid = (
                  exchangeSelectedItem.product?._id ||
                  exchangeSelectedItem.product ||
                  ""
                ).toString();
                const prod = productDetailsMap[pid];
                const replacementUnitPrice = prod
                  ? prod.discountPrice > 0
                    ? prod.discountPrice
                    : prod.price
                  : exchangeSelectedItem.price;
                const origTotal = exchangeSelectedItem.price * exchangeQty;
                const newTotal = replacementUnitPrice * exchangeQty;
                const diff = newTotal - origTotal;

                return (
                  <div className="exchange-price-difference-box">
                    <div className="exchange-price-row">
                      <span>Original price ({exchangeQty} item):</span>
                      <strong>{formatPrice(origTotal)}</strong>
                    </div>
                    <div className="exchange-price-row">
                      <span>Replacement price:</span>
                      <strong>{formatPrice(newTotal)}</strong>
                    </div>
                    {diff > 0 ? (
                      <div className="exchange-diff-alert additional">
                        Additional payment required: <strong>{formatPrice(diff)}</strong>
                        <span className="diff-subtext"> (Will be settled upon delivery)</span>
                      </div>
                    ) : diff < 0 ? (
                      <div className="exchange-diff-alert refund">
                        Refund difference: <strong>{formatPrice(Math.abs(diff))}</strong>
                        <span className="diff-subtext"> (Will be credited upon inspection)</span>
                      </div>
                    ) : (
                      <div className="exchange-diff-alert same">
                        ✓ No price difference
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ADDITIONAL COMMENTS */}
              <div className="return-form-section">
                <label className="return-section-label">
                  Additional Details: <span className="optional-tag">(Optional)</span>
                </label>
                <textarea
                  className="return-details-textarea"
                  value={exchangeDetails}
                  onChange={(e) => setExchangeDetails(e.target.value)}
                  placeholder="Any comments regarding your exchange request..."
                  rows={2}
                  disabled={submittingExchange}
                />
              </div>

              <div className="return-modal-actions">
                <button
                  type="button"
                  className="btn-return-cancel"
                  onClick={handleCloseExchangeModal}
                  disabled={submittingExchange}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-return-submit btn-exchange-submit"
                  disabled={
                    submittingExchange ||
                    !exchangeReason ||
                    !exchangeNewSize
                  }
                >
                  {submittingExchange ? (
                    <span className="return-spinner-text">
                      <span className="return-mini-spinner"></span> Submitting...
                    </span>
                  ) : (
                    "Submit Exchange Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <AddressDrawer
        isOpen={isAddressDrawerOpen}
        onClose={() => setIsAddressDrawerOpen(false)}
        onAddressSaved={handleAddressSaved}
        selectedAddress={editingAddress}
        initialShowForm={true}
      />
    </div>
  );
};

export default MyAccount;
