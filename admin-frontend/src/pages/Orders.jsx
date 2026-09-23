import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdVisibility,
  MdRefresh,
  MdClose,
  MdSearch,
  MdChevronLeft,
  MdChevronRight,
  MdCheckCircle,
  MdCancel,
  MdLocalShipping,
  MdInventory,
  MdAssignmentReturn,
  MdCheck,
} from "react-icons/md";
import toast from "react-hot-toast";

import api from "../api/axios";
import socket from "../socket/socket";
import "../styles/Orders.css";

const ORDERS_PER_PAGE = 20;

const WORKING_STATUSES = ["pending", "confirmed", "processing", "shipped"];

const STATUS_OPTIONS = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
  "failed",
];

const RETURN_STATUS_OPTIONS = [
  "NONE",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RETURN_RECEIVED",
  "REFUND_PROCESSING",
  "REFUNDED",
  "CANCELLED",
];

const EXCHANGE_STATUS_OPTIONS = [
  "NONE",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKUP_SCHEDULED",
  "PICKED_UP",
  "RECEIVED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
];

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all_orders"); // 'all_orders' | 'returns' | 'exchanges'
  const [statusFilter, setStatusFilter] = useState("all");
  const [returnFilter, setReturnFilter] = useState("all");
  const [exchangeFilter, setExchangeFilter] = useState("all");
  const [orderDate, setOrderDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [processingRefundId, setProcessingRefundId] = useState("");

  // Helper to determine if order is Stripe-paid based on payment method and Stripe references
  const isStripePaidOrder = useCallback((order) => {
    if (!order) return false;
    return Boolean(
      order.stripePaymentIntentId ||
        (order.paymentMethod && order.paymentMethod !== "COD" && order.paymentStatus === "paid")
    );
  }, []);

  const sortOrders = useCallback((orderList) => {
    return [...orderList].sort((a, b) => {
      const aWorking = WORKING_STATUSES.includes(a.orderStatus);
      const bWorking = WORKING_STATUSES.includes(b.orderStatus);

      if (aWorking && !bWorking) {
        return -1;
      }
      if (!aWorking && bWorking) {
        return 1;
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, []);

  // Fetch orders from backend and replace state (strictly deduplicating by MongoDB _id)
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/orders/admin/all");
      const fetchedOrders = response.data?.orders || [];

      // Deduplicate using MongoDB _id as the unique identifier
      const uniqueMap = new Map();
      for (const order of fetchedOrders) {
        if (order && order._id) {
          uniqueMap.set(order._id.toString(), order);
        }
      }
      const cleanOrders = Array.from(uniqueMap.values());

      // Replace order state directly — NEVER append
      setOrders(sortOrders(cleanOrders));
      setCurrentPage(1);
    } catch (error) {
      console.error("Fetch Orders Error:", error);
      toast.error(error.response?.data?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [sortOrders]);

  // Initial load
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time Socket.IO handler: registers once and updates in-place by _id
  useEffect(() => {
    const handleOrderUpdate = (event) => {
      try {
        const incoming = event?.order || event?.data;
        if (!incoming || !incoming._id) return;

        const incomingId = incoming._id.toString();

        setOrders((prev) => {
          const exists = prev.some((o) => o._id && o._id.toString() === incomingId);
          let nextList;
          if (exists) {
            // Update the existing order in place
            nextList = prev.map((o) =>
              o._id && o._id.toString() === incomingId ? { ...o, ...incoming } : o
            );
          } else {
            // Add genuinely new order to front
            nextList = [incoming, ...prev];
          }
          return sortOrders(nextList);
        });

        // Also update open modal if viewing this order
        setSelectedOrder((prev) => {
          if (prev && prev._id && prev._id.toString() === incomingId) {
            return { ...prev, ...incoming };
          }
          return prev;
        });
      } catch (err) {
        console.error("Realtime order update error:", err);
      }
    };

    socket.on("order_updated", handleOrderUpdate);

    return () => {
      socket.off("order_updated", handleOrderUpdate);
    };
  }, [sortOrders]);

  const returnsCount = useMemo(() => {
    return orders.filter(
      (o) => o.returnStatus && o.returnStatus !== "NONE",
    ).length;
  }, [orders]);

  const exchangesCount = useMemo(() => {
    return orders.filter(
      (o) => o.exchangeStatus && o.exchangeStatus !== "NONE",
    ).length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    return orders.filter((order) => {
      // 1. Tab check
      if (activeTab === "returns") {
        if (!order.returnStatus || order.returnStatus === "NONE") return false;
        if (returnFilter !== "all" && order.returnStatus !== returnFilter)
          return false;
      } else if (activeTab === "exchanges") {
        if (!order.exchangeStatus || order.exchangeStatus === "NONE") return false;
        if (
          exchangeFilter !== "all" &&
          order.exchangeStatus !== exchangeFilter
        )
          return false;
      } else {
        // all_orders tab
        if (statusFilter !== "all" && order.orderStatus !== statusFilter)
          return false;
      }

      // 2. Date check
      const matchesDate =
        !orderDate ||
        new Date(order.createdAt).toISOString().slice(0, 10) === orderDate;
      if (!matchesDate) return false;

      // 3. Search query
      const orderId = order._id?.toLowerCase() || "";
      const customerName =
        order.user?.name?.toLowerCase() ||
        `${order.shippingAddress?.firstName || ""} ${
          order.shippingAddress?.lastName || ""
        }`.toLowerCase();
      const email = order.user?.email?.toLowerCase() || "";
      const itemName =
        order.orderItems
          ?.map((item) => item.name?.toLowerCase() || "")
          .join(" ") || "";
      const status = order.orderStatus?.toLowerCase() || "";
      const payment = order.paymentStatus?.toLowerCase() || "";
      const paymentMethod = order.paymentMethod?.toLowerCase() || "";
      const returnStatus = order.returnStatus?.toLowerCase() || "";
      const exchangeStatus = order.exchangeStatus?.toLowerCase() || "";

      return (
        !value ||
        orderId.includes(value) ||
        customerName.includes(value) ||
        email.includes(value) ||
        itemName.includes(value) ||
        status.includes(value) ||
        payment.includes(value) ||
        paymentMethod.includes(value) ||
        returnStatus.includes(value) ||
        exchangeStatus.includes(value)
      );
    });
  }, [
    orders,
    activeTab,
    statusFilter,
    returnFilter,
    exchangeFilter,
    orderDate,
    search,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, returnFilter, exchangeFilter, orderDate, activeTab]);

  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ORDERS_PER_PAGE;
    const end = start + ORDERS_PER_PAGE;
    return filteredOrders.slice(start, end);
  }, [filteredOrders, currentPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setReturnFilter("all");
    setExchangeFilter("all");
    setOrderDate("");
    setCurrentPage(1);
  };

  const openOrderModal = (order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const closeOrderModal = () => {
    setSelectedOrder(null);
    setModalOpen(false);
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await api.put(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      const updatedOrder = response.data?.order;

      setOrders((prev) =>
        sortOrders(
          prev.map((order) =>
            order._id === orderId
              ? {
                  ...order,
                  orderStatus: updatedOrder?.orderStatus || newStatus,
                }
              : order,
          ),
        ),
      );

      setSelectedOrder((prev) =>
        prev && prev._id === orderId
          ? {
              ...prev,
              orderStatus: updatedOrder?.orderStatus || newStatus,
            }
          : prev,
      );

      toast.success("Order status updated successfully");
    } catch (error) {
      console.error("Update Order Status Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update order status",
      );
    }
  };

  // Safe payment status updater: prevents manual "refunded" for Stripe orders
  const updatePaymentStatus = async (orderId, newPaymentStatus) => {
    const targetOrder = orders.find((o) => o._id === orderId) || selectedOrder;
    const isStripe = isStripePaidOrder(targetOrder);

    if (newPaymentStatus === "refunded" && isStripe) {
      toast.error(
        "Stripe payments cannot be marked refunded manually. Use the Process Refund button to execute an actual refund.",
      );
      return;
    }

    try {
      const response = await api.put(`/orders/${orderId}/payment-status`, {
        paymentStatus: newPaymentStatus,
      });

      const updatedOrder = response.data?.order;

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                paymentStatus: updatedOrder?.paymentStatus || newPaymentStatus,
                orderStatus: updatedOrder?.orderStatus || order.orderStatus,
              }
            : order,
        ),
      );

      setSelectedOrder((prev) =>
        prev && prev._id === orderId
          ? {
              ...prev,
              paymentStatus: updatedOrder?.paymentStatus || newPaymentStatus,
              orderStatus: updatedOrder?.orderStatus || prev.orderStatus,
            }
          : prev,
      );

      toast.success("Payment status updated successfully");
    } catch (error) {
      console.error("Update Payment Status Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update payment status",
      );
    }
  };

  const updateReturnStatus = async (orderId, newReturnStatus, adminNote = "") => {
    try {
      const response = await api.put(`/orders/${orderId}/return-status`, {
        returnStatus: newReturnStatus,
        adminNote,
      });

      const updatedOrder = response.data?.order;

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                returnStatus: updatedOrder?.returnStatus || newReturnStatus,
                returnRequest: updatedOrder?.returnRequest || order.returnRequest,
                orderStatus: updatedOrder?.orderStatus || order.orderStatus,
                paymentStatus: updatedOrder?.paymentStatus || order.paymentStatus,
              }
            : order,
        ),
      );

      setSelectedOrder((prev) =>
        prev && prev._id === orderId
          ? {
              ...prev,
              returnStatus: updatedOrder?.returnStatus || newReturnStatus,
              returnRequest: updatedOrder?.returnRequest || prev.returnRequest,
              orderStatus: updatedOrder?.orderStatus || prev.orderStatus,
              paymentStatus: updatedOrder?.paymentStatus || prev.paymentStatus,
            }
          : prev,
      );

      toast.success(`Return status updated to ${newReturnStatus.replace(/_/g, " ")}`);
    } catch (error) {
      console.error("Update Return Status Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update return status",
      );
    }
  };

  const handleProcessRefund = async (orderId, targetOrder = null) => {
    const orderToProcess =
      targetOrder || selectedOrder || orders.find((o) => o._id === orderId);
    const isStripe = isStripePaidOrder(orderToProcess);

    const confirmMsg = isStripe
      ? "Are you sure you want to process this refund? This will execute an actual Stripe refund back to the customer's payment method."
      : "Are you sure you want to mark this Cash on Delivery refund as completed?";

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setProcessingRefundId(orderId);
      const response = await api.post(
        `/orders/${orderId}/process-return-refund`,
        {
          adminNote: isStripe
            ? "Stripe refund executed from Admin Dashboard"
            : "COD cash/bank payout completed by Admin",
        },
      );

      const updatedOrder = response.data?.order;
      if (updatedOrder) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? updatedOrder : o)),
        );
        setSelectedOrder((prev) =>
          prev && prev._id === orderId ? updatedOrder : prev,
        );
      } else {
        fetchOrders();
      }

      toast.success(
        response.data?.message || "Refund processed successfully",
      );
    } catch (error) {
      console.error("Process Refund Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to process refund",
      );
    } finally {
      setProcessingRefundId("");
    }
  };

  const updateExchangeStatus = async (
    orderId,
    newExchangeStatus,
    adminNote = "",
  ) => {
    try {
      const response = await api.put(`/orders/${orderId}/exchange-status`, {
        exchangeStatus: newExchangeStatus,
        adminNote,
      });

      const updatedOrder = response.data?.order;

      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? {
                ...order,
                exchangeStatus:
                  updatedOrder?.exchangeStatus || newExchangeStatus,
                exchangeRequest:
                  updatedOrder?.exchangeRequest || order.exchangeRequest,
              }
            : order,
        ),
      );

      setSelectedOrder((prev) =>
        prev && prev._id === orderId
          ? {
              ...prev,
              exchangeStatus:
                updatedOrder?.exchangeStatus || newExchangeStatus,
              exchangeRequest:
                updatedOrder?.exchangeRequest || prev.exchangeRequest,
            }
          : prev,
      );

      toast.success(`Exchange status updated to ${newExchangeStatus.replace(/_/g, " ")}`);
    } catch (error) {
      console.error("Update Exchange Status Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to update exchange status",
      );
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "status-badge status-pending";
      case "confirmed":
        return "status-badge status-confirmed";
      case "processing":
        return "status-badge status-processing";
      case "shipped":
        return "status-badge status-shipped";
      case "delivered":
        return "status-badge status-delivered";
      case "cancelled":
        return "status-badge status-cancelled";
      case "returned":
        return "status-badge status-returned";
      case "failed":
        return "status-badge status-failed";
      default:
        return "status-badge";
    }
  };

  const getPaymentClass = (status) => {
    switch (status) {
      case "paid":
        return "payment-badge payment-paid";
      case "pending":
        return "payment-badge payment-pending";
      case "failed":
        return "payment-badge payment-failed";
      case "refunded":
        return "payment-badge payment-refunded";
      default:
        return "payment-badge";
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";
    if (method === "COD") return "Cash on Delivery";
    if (method === "CARD") return "Credit / Debit Card (Stripe)";
    if (method === "UPI") return "UPI (Stripe)";
    return method;
  };

  const formatDeliveryOption = (option) => {
    if (!option) return "-";
    if (option === "standard") return "Standard Delivery";
    if (option === "pickup") return "Pickup from Store";
    return option;
  };

  const formatStatus = (status) => {
    return (
      status
        ?.replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase()) || "-"
    );
  };

  // Render payment status badge distinguishing Stripe vs COD
  const renderPaymentBadge = (order) => {
    const isStripe = isStripePaidOrder(order);
    const isCod = order.paymentMethod === "COD";
    const status = order.paymentStatus || "pending";

    if (status === "refunded") {
      return (
        <span className="pay-badge refunded">
          Refunded {isStripe ? "(Stripe)" : "(COD)"}
        </span>
      );
    }
    if (status === "paid") {
      return (
        <span className="pay-badge paid">
          Paid {isStripe ? "(Stripe)" : ""}
        </span>
      );
    }
    if (status === "failed") {
      return <span className="pay-badge failed">Failed</span>;
    }
    // Pending states
    if (order.orderStatus === "cancelled" && isCod) {
      return <span className="pay-badge unpaid">Unpaid (COD)</span>;
    }
    if (isCod) {
      return <span className="pay-badge pending">Pending (COD)</span>;
    }
    return <span className="pay-badge pending">Pending</span>;
  };

  // Render interactive Order Status Timeline for Modal
  const renderOrderTimeline = (order) => {
    if (!order) return null;

    if (order.orderStatus === "cancelled") {
      return (
        <div className="order-timeline cancelled-timeline">
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdCheck /></div>
            <div className="timeline-content">
              <strong>Order Placed</strong>
              <span>{formatDate(order.createdAt)}</span>
            </div>
          </div>
          <div className="timeline-line active-line"></div>
          <div className="timeline-step error">
            <div className="timeline-dot"><MdCancel /></div>
            <div className="timeline-content">
              <strong>Cancelled</strong>
              <span>
                {order.paymentStatus === "refunded"
                  ? "Order Cancelled & Refunded"
                  : order.paymentMethod === "COD"
                  ? "Order Cancelled (Unpaid)"
                  : "Order Cancelled"}
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (order.orderStatus === "returned") {
      return (
        <div className="order-timeline">
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdCheck /></div>
            <div className="timeline-content">
              <strong>Delivered</strong>
              <span>{formatDate(order.deliveredAt || order.createdAt)}</span>
            </div>
          </div>
          <div className="timeline-line completed-line"></div>
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdAssignmentReturn /></div>
            <div className="timeline-content">
              <strong>Return Processed</strong>
              <span>{formatDate(order.returnRequest?.requestedAt || order.updatedAt)}</span>
            </div>
          </div>
          <div className="timeline-line completed-line"></div>
          <div className="timeline-step completed refund-step">
            <div className="timeline-dot"><MdCheckCircle /></div>
            <div className="timeline-content">
              <strong>Refund Completed</strong>
              <span>
                {order.returnRequest?.refundMethod === "COD_MANUAL"
                  ? "Manual Cash/Bank Payout"
                  : "Stripe Online Refund"}
              </span>
            </div>
          </div>
        </div>
      );
    }

    const steps = [
      { key: "confirmed", label: "Confirmed", icon: <MdCheck /> },
      { key: "processing", label: "Processing", icon: <MdInventory /> },
      { key: "shipped", label: "Shipped", icon: <MdLocalShipping /> },
      { key: "delivered", label: "Delivered", icon: <MdCheckCircle /> },
    ];

    const currentOrderIndex = steps.findIndex((s) => s.key === order.orderStatus);

    return (
      <div className="order-timeline">
        {steps.map((step, idx) => {
          const isCompleted = idx <= currentOrderIndex;
          const isActive = idx === currentOrderIndex;

          return (
            <React.Fragment key={step.key}>
              <div
                className={`timeline-step ${isCompleted ? "completed" : ""} ${
                  isActive ? "active" : ""
                }`}
              >
                <div className="timeline-dot">{step.icon}</div>
                <div className="timeline-content">
                  <strong>{step.label}</strong>
                  {isActive && <span>Current Stage</span>}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div
                  className={`timeline-line ${
                    idx < currentOrderIndex ? "completed-line" : ""
                  }`}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <div className="orders-page">
        {/* TOP HEADER */}
        <div className="orders-header">
          <div>
            <h1>Orders Management</h1>
            <p>Monitor, track, and manage customer orders, returns, and exchanges</p>
          </div>

          <button
            type="button"
            className="refresh-orders-btn"
            onClick={fetchOrders}
            title="Refresh orders list"
          >
            <MdRefresh />
            Refresh Orders
          </button>
        </div>

        {/* MAIN NAVIGATION TABS: ALL ORDERS | RETURNS | EXCHANGES */}
        <div className="orders-main-tabs">
          <button
            type="button"
            className={`orders-main-tab ${activeTab === "all_orders" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("all_orders");
              setCurrentPage(1);
            }}
          >
            All Orders ({orders.length})
          </button>
          <button
            type="button"
            className={`orders-main-tab ${activeTab === "returns" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("returns");
              setCurrentPage(1);
            }}
          >
            Returns ({returnsCount})
          </button>
          <button
            type="button"
            className={`orders-main-tab ${activeTab === "exchanges" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("exchanges");
              setCurrentPage(1);
            }}
          >
            Exchanges ({exchangesCount})
          </button>
        </div>

        {/* SINGLE CONSOLIDATED TOOLBAR */}
        <div className="orders-toolbar">
          <div className="orders-search">
            <MdSearch />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === "returns"
                  ? "Search returns by order ID, customer, item, reason..."
                  : activeTab === "exchanges"
                  ? "Search exchanges by order ID, customer, size..."
                  : "Search orders by ID, customer name, email, items..."
              }
            />
            {search && (
              <button
                type="button"
                className="clear-orders-search"
                onClick={() => setSearch("")}
                title="Clear search"
              >
                <MdClose />
              </button>
            )}
          </div>

          {/* DYNAMIC STATUS FILTER ACCORDING TO ACTIVE TAB */}
          {activeTab === "returns" ? (
            <select
              className="orders-status-filter"
              value={returnFilter}
              onChange={(e) => setReturnFilter(e.target.value)}
            >
              <option value="all">All Return Statuses</option>
              {RETURN_STATUS_OPTIONS.filter((s) => s !== "NONE").map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : activeTab === "exchanges" ? (
            <select
              className="orders-status-filter"
              value={exchangeFilter}
              onChange={(e) => setExchangeFilter(e.target.value)}
            >
              <option value="all">All Exchange Statuses</option>
              {EXCHANGE_STATUS_OPTIONS.filter((s) => s !== "NONE").map((status) => (
                <option key={status} value={status}>
                  {status.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="orders-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Order Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          )}

          <input
            type="date"
            className="orders-date-filter"
            value={orderDate}
            onChange={(e) => setOrderDate(e.target.value)}
            title="Filter by order date"
          />

          {(search ||
            (activeTab === "all_orders" && statusFilter !== "all") ||
            (activeTab === "returns" && returnFilter !== "all") ||
            (activeTab === "exchanges" && exchangeFilter !== "all") ||
            orderDate) && (
            <button
              type="button"
              className="clear-date-filter"
              onClick={clearFilters}
            >
              Clear Filters
            </button>
          )}

          <span className="orders-count">
            {filteredOrders.length}{" "}
            {activeTab === "returns"
              ? "return"
              : activeTab === "exchanges"
              ? "exchange"
              : "order"}
            {filteredOrders.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* ORDERS TABLE CONTAINER */}
        {loading ? (
          <div className="orders-loading">Loading orders...</div>
        ) : (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                {activeTab === "returns" ? (
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product(s)</th>
                    <th>Qty</th>
                    <th>Return Reason</th>
                    <th>Return Status</th>
                    <th>Refund Status</th>
                    <th>Actions</th>
                  </tr>
                ) : activeTab === "exchanges" ? (
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Original Size</th>
                    <th>New Size</th>
                    <th>Reason</th>
                    <th>Price Diff</th>
                    <th>Exchange Status</th>
                    <th>Actions</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Date</th>
                    <th>Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {paginatedOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={activeTab === "exchanges" ? "9" : activeTab === "returns" ? "8" : "7"}
                      className="empty-orders"
                    >
                      {search || statusFilter !== "all" || orderDate
                        ? "No orders match your filter criteria"
                        : "No orders found"}
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
                    const isStripe = isStripePaidOrder(order);

                    return (
                      <tr key={order._id}>
                        {/* 1. ORDER ID */}
                        <td>
                          <span className="order-id">
                            #{order._id.toString().slice(-8).toUpperCase()}
                          </span>
                        </td>

                        {/* 2. CUSTOMER */}
                        <td>
                          <div className="customer-cell">
                            <strong>
                              {order.user?.name ||
                                `${order.shippingAddress?.firstName || ""} ${
                                  order.shippingAddress?.lastName || ""
                                }`}
                            </strong>
                            <span>
                              {order.user?.email ||
                                order.shippingAddress?.mobile ||
                                "-"}
                            </span>
                          </div>
                        </td>

                        {/* 3. DYNAMIC TAB CELLS */}
                        {activeTab === "returns" ? (
                          <>
                            {/* Product(s) */}
                            <td>
                              <div className="table-product-preview">
                                <strong>
                                  {order.returnRequest?.items?.[0]?.name ||
                                    order.orderItems?.[0]?.name ||
                                    "Item"}
                                </strong>
                                {(order.returnRequest?.items?.length || order.orderItems?.length) > 1 && (
                                  <span className="more-items-count">
                                    +{(order.returnRequest?.items?.length || order.orderItems?.length) - 1} more
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Qty */}
                            <td>
                              <strong>
                                {order.returnRequest?.items?.reduce(
                                  (sum, i) => sum + (Number(i.quantity) || 1),
                                  0,
                                ) || 1}
                              </strong>
                            </td>

                            {/* Reason */}
                            <td>
                              <span className="table-reason-text">
                                {order.returnRequest?.reason || "Return"}
                              </span>
                            </td>

                            {/* Return Status */}
                            <td>
                              <span
                                className={`admin-return-badge badge-${(
                                  order.returnStatus || ""
                                ).toLowerCase()}`}
                              >
                                {order.returnStatus?.replace(/_/g, " ")}
                              </span>
                            </td>

                            {/* Refund Status */}
                            <td>
                              <div className="refund-cell-status">
                                <strong>
                                  ₹
                                  {Number(
                                    order.returnRequest?.refundAmount ||
                                      order.refundAmount ||
                                      order.totalAmount ||
                                      0,
                                  ).toLocaleString("en-IN")}
                                </strong>
                                <span className="table-pay-badge">
                                  {order.returnStatus === "REFUNDED"
                                    ? "✓ Refunded"
                                    : order.paymentMethod === "COD"
                                    ? "Refund Pending (COD)"
                                    : "Stripe Refund Due"}
                                </span>
                              </div>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="table-action-group">
                                {order.returnStatus === "REQUESTED" && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-table-action approve"
                                      onClick={() =>
                                        updateReturnStatus(order._id, "APPROVED")
                                      }
                                      title="Approve return request"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-table-action reject"
                                      onClick={() =>
                                        updateReturnStatus(order._id, "REJECTED")
                                      }
                                      title="Reject return request"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {order.returnStatus === "APPROVED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateReturnStatus(order._id, "PICKUP_SCHEDULED")
                                    }
                                  >
                                    Schedule Pickup
                                  </button>
                                )}

                                {order.returnStatus === "PICKUP_SCHEDULED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateReturnStatus(order._id, "PICKED_UP")
                                    }
                                  >
                                    Mark Picked Up
                                  </button>
                                )}

                                {order.returnStatus === "PICKED_UP" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateReturnStatus(order._id, "RETURN_RECEIVED")
                                    }
                                  >
                                    Mark Received
                                  </button>
                                )}

                                {(order.returnStatus === "RETURN_RECEIVED" ||
                                  order.returnStatus === "REFUND_PROCESSING") && (
                                  <button
                                    type="button"
                                    className={`btn-table-action refund ${
                                      order.paymentMethod === "COD" ? "cod" : "stripe"
                                    }`}
                                    disabled={processingRefundId === order._id}
                                    onClick={() => handleProcessRefund(order._id, order)}
                                  >
                                    {processingRefundId === order._id
                                      ? "Processing..."
                                      : order.paymentMethod === "COD"
                                      ? "Mark COD Refund Completed"
                                      : "Process Stripe Refund"}
                                  </button>
                                )}

                                {order.returnStatus === "REFUNDED" && (
                                  <span className="refund-complete-badge">
                                    ✓ Refunded
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className="view-order-btn"
                                  title="View Order Details"
                                  onClick={() => openOrderModal(order)}
                                >
                                  <MdVisibility />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : activeTab === "exchanges" ? (
                          <>
                            {/* Product */}
                            <td>
                              <div className="table-product-preview">
                                <strong>
                                  {order.exchangeRequest?.items?.[0]?.name ||
                                    order.orderItems?.[0]?.name ||
                                    "Item"}
                                </strong>
                              </div>
                            </td>

                            {/* Original Size */}
                            <td>
                              <span className="table-size-badge original">
                                {order.exchangeRequest?.items?.[0]?.originalSize || "-"}
                              </span>
                            </td>

                            {/* New Size */}
                            <td>
                              <span className="table-size-badge replacement">
                                {order.exchangeRequest?.items?.[0]?.newSize || "-"}
                              </span>
                            </td>

                            {/* Reason */}
                            <td>
                              <span className="table-reason-text">
                                {order.exchangeRequest?.reason || "Exchange"}
                              </span>
                            </td>

                            {/* Price Difference */}
                            <td>
                              {order.exchangeRequest?.additionalPaymentRequired > 0 ? (
                                <span className="diff-pill pay">
                                  +₹{order.exchangeRequest.additionalPaymentRequired}
                                </span>
                              ) : order.exchangeRequest?.refundDifference > 0 ? (
                                <span className="diff-pill refund">
                                  -₹{order.exchangeRequest.refundDifference}
                                </span>
                              ) : (
                                <span className="diff-pill same">₹0</span>
                              )}
                            </td>

                            {/* Exchange Status */}
                            <td>
                              <span
                                className={`admin-exchange-badge badge-${(
                                  order.exchangeStatus || ""
                                ).toLowerCase()}`}
                              >
                                {order.exchangeStatus?.replace(/_/g, " ")}
                              </span>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="table-action-group">
                                {order.exchangeStatus === "REQUESTED" && (
                                  <>
                                    <button
                                      type="button"
                                      className="btn-table-action approve"
                                      onClick={() =>
                                        updateExchangeStatus(order._id, "APPROVED")
                                      }
                                      title="Approve exchange request"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      className="btn-table-action reject"
                                      onClick={() =>
                                        updateExchangeStatus(order._id, "REJECTED")
                                      }
                                      title="Reject exchange request"
                                    >
                                      Reject
                                    </button>
                                  </>
                                )}

                                {order.exchangeStatus === "APPROVED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateExchangeStatus(order._id, "PICKUP_SCHEDULED")
                                    }
                                  >
                                    Schedule Pickup
                                  </button>
                                )}

                                {order.exchangeStatus === "PICKUP_SCHEDULED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateExchangeStatus(order._id, "PICKED_UP")
                                    }
                                  >
                                    Mark Picked Up
                                  </button>
                                )}

                                {order.exchangeStatus === "PICKED_UP" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() =>
                                      updateExchangeStatus(order._id, "RECEIVED")
                                    }
                                  >
                                    Mark Received
                                  </button>
                                )}

                                {order.exchangeStatus === "RECEIVED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action step ship"
                                    onClick={() =>
                                      updateExchangeStatus(order._id, "SHIPPED")
                                    }
                                  >
                                    Ship Replacement
                                  </button>
                                )}

                                {order.exchangeStatus === "SHIPPED" && (
                                  <button
                                    type="button"
                                    className="btn-table-action approve"
                                    onClick={() =>
                                      updateExchangeStatus(order._id, "DELIVERED")
                                    }
                                  >
                                    Mark Delivered
                                  </button>
                                )}

                                {order.exchangeStatus === "DELIVERED" && (
                                  <span className="refund-complete-badge">
                                    ✓ Delivered
                                  </span>
                                )}

                                <button
                                  type="button"
                                  className="view-order-btn"
                                  title="View Order Details"
                                  onClick={() => openOrderModal(order)}
                                >
                                  <MdVisibility />
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          /* ALL ORDERS TAB */
                          <>
                            <td>{formatDate(order.createdAt)}</td>

                            <td>
                              <strong>
                                ₹
                                {Number(order.totalAmount || 0).toLocaleString(
                                  "en-IN",
                                )}
                              </strong>
                            </td>

                            {/* Safe Payment Badge / Non-corruptible Dropdown */}
                            <td>
                              {isStripe ? (
                                // For Stripe orders: display authoritative status badge (never allow manual "refunded")
                                renderPaymentBadge(order)
                              ) : (
                                // For COD orders: allow updating between pending and paid (or display badge if refunded/cancelled)
                                order.paymentStatus === "refunded" ||
                                order.orderStatus === "cancelled" ? (
                                  renderPaymentBadge(order)
                                ) : (
                                  <select
                                    value={order.paymentStatus || "pending"}
                                    onChange={(e) =>
                                      updatePaymentStatus(order._id, e.target.value)
                                    }
                                    className={getPaymentClass(
                                      order.paymentStatus || "pending",
                                    )}
                                  >
                                    <option value="pending">Pending (COD)</option>
                                    <option value="paid">Paid</option>
                                    <option value="failed">Failed</option>
                                  </select>
                                )
                              )}
                            </td>

                            {/* Order Status Dropdown */}
                            <td>
                              <select
                                value={order.orderStatus}
                                onChange={(e) =>
                                  updateOrderStatus(order._id, e.target.value)
                                }
                                className={getStatusClass(order.orderStatus)}
                              >
                                {STATUS_OPTIONS.map((status) => (
                                  <option key={status} value={status}>
                                    {formatStatus(status)}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Action */}
                            <td>
                              <button
                                type="button"
                                className="view-order-btn"
                                title="View Order Details"
                                onClick={() => openOrderModal(order)}
                              >
                                <MdVisibility />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="orders-pagination">
                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  title="Previous Page"
                >
                  <MdChevronLeft />
                </button>

                <div className="pagination-pages">
                  {Array.from(
                    {
                      length: totalPages,
                    },
                    (_, index) => index + 1,
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={
                        currentPage === page
                          ? "pagination-page active"
                          : "pagination-page"
                      }
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  title="Next Page"
                >
                  <MdChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* =========================================================
          ORDER DETAILS MODAL
          ========================================================= */}
      {modalOpen && selectedOrder && (
        <div className="order-modal-overlay" onClick={closeOrderModal}>
          <div className="order-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="order-modal-close"
              onClick={closeOrderModal}
              title="Close Modal"
            >
              <MdClose />
            </button>

            {/* MODAL HEADER */}
            <div className="order-modal-header">
              <div>
                <h2>
                  Order #{selectedOrder._id.toString().slice(-8).toUpperCase()}
                </h2>
                <p>Placed on {formatDate(selectedOrder.createdAt)}</p>
              </div>

              <div className="modal-header-badges">
                <span className={getStatusClass(selectedOrder.orderStatus)}>
                  {formatStatus(selectedOrder.orderStatus)}
                </span>
                {renderPaymentBadge(selectedOrder)}
              </div>
            </div>

            {/* VISUAL ORDER STATUS TIMELINE */}
            <div className="order-detail-section timeline-section">
              <h3>Order Status Timeline</h3>
              {renderOrderTimeline(selectedOrder)}
            </div>

            {/* DEDICATED REFUND SUMMARY CARD (IF REFUNDED) */}
            {(selectedOrder.paymentStatus === "refunded" ||
              selectedOrder.returnStatus === "REFUNDED") && (
              <div className="order-detail-section refund-summary-card">
                <div className="refund-summary-header">
                  <MdCheckCircle className="refund-success-icon" />
                  <div>
                    <h4>Refund Completed</h4>
                    <p>
                      This order has been successfully refunded via{" "}
                      {selectedOrder.returnRequest?.refundMethod === "COD_MANUAL" ||
                      selectedOrder.paymentMethod === "COD"
                        ? "Manual Cash / Bank Payout"
                        : "Stripe Online Payment Gateway"}
                    </p>
                  </div>
                </div>

                <div className="refund-meta-grid">
                  <div className="refund-meta-item">
                    <span>Refund ID</span>
                    <code>
                      {selectedOrder.returnRequest?.stripeRefundId ||
                        selectedOrder.stripeRefundId ||
                        "COD-MANUAL-REFUND"}
                    </code>
                  </div>

                  <div className="refund-meta-item">
                    <span>Refund Amount</span>
                    <strong className="refund-amount-text">
                      ₹
                      {Number(
                        selectedOrder.returnRequest?.refundAmount ||
                          selectedOrder.refundAmount ||
                          selectedOrder.totalAmount ||
                          0,
                      ).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <div className="refund-meta-item">
                    <span>Refund Date</span>
                    <strong>
                      {formatDate(
                        selectedOrder.refundedAt ||
                          selectedOrder.returnRequest?.processedAt ||
                          selectedOrder.updatedAt,
                      )}
                    </strong>
                  </div>

                  <div className="refund-meta-item">
                    <span>Refund Method</span>
                    <strong>
                      {selectedOrder.returnRequest?.refundMethod === "COD_MANUAL" ||
                      selectedOrder.paymentMethod === "COD"
                        ? "COD Manual Refund"
                        : "Stripe Refund"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOMER DETAILS */}
            <div className="order-detail-section">
              <h3>Customer Details</h3>
              <p>
                <strong>Name:</strong>{" "}
                {selectedOrder.user?.name ||
                  `${selectedOrder.shippingAddress?.firstName || ""} ${
                    selectedOrder.shippingAddress?.lastName || ""
                  }`}
              </p>
              <p>
                <strong>Email:</strong> {selectedOrder.user?.email || "-"}
              </p>
              <p>
                <strong>Mobile:</strong>{" "}
                {selectedOrder.shippingAddress?.mobile || "-"}
              </p>
              <p>
                <strong>Shipping Address:</strong>{" "}
                {selectedOrder.shippingAddress?.houseBuilding},{" "}
                {selectedOrder.shippingAddress?.streetLocality}
                {selectedOrder.shippingAddress?.landmark
                  ? `, ${selectedOrder.shippingAddress.landmark}`
                  : ""}
                , {selectedOrder.shippingAddress?.cityState} -{" "}
                {selectedOrder.shippingAddress?.pincode}
              </p>
            </div>

            {/* ORDER ITEMS */}
            <div className="order-detail-section">
              <h3>Order Items ({selectedOrder.orderItems?.length || 0})</h3>
              <div className="order-items-list">
                {selectedOrder.orderItems?.map((item, index) => (
                  <div
                    className="order-item"
                    key={`${item.product?._id || item.product || index}-${index}`}
                  >
                    <div>
                      <strong>{item.name}</strong>
                      <span>Qty: {item.quantity}</span>
                      {item.size && <span>Size: {item.size}</span>}
                      {item.color && <span>Color: {item.color}</span>}
                    </div>
                    <strong>
                      ₹
                      {Number(item.price * item.quantity).toLocaleString("en-IN")}
                    </strong>
                  </div>
                ))}
              </div>
            </div>

            {/* RETURN REQUEST DETAILS (IF RETURN REQUESTED) */}
            {selectedOrder.returnStatus && selectedOrder.returnStatus !== "NONE" && (
              <div className="order-detail-section return-detail-card">
                <div className="return-detail-header">
                  <h3>Return Request Details</h3>
                  <span
                    className={`admin-return-badge badge-${(
                      selectedOrder.returnStatus || ""
                    ).toLowerCase()}`}
                  >
                    {selectedOrder.returnStatus?.replace(/_/g, " ")}
                  </span>
                </div>

                {/* RETURN ACTION WORKFLOW BUTTONS */}
                <div className="admin-lifecycle-actions">
                  <span>Progress Return:</span>
                  <div className="admin-action-btns">
                    {selectedOrder.returnStatus === "REQUESTED" && (
                      <>
                        <button
                          type="button"
                          className="btn-action-step approve"
                          onClick={() =>
                            updateReturnStatus(selectedOrder._id, "APPROVED")
                          }
                        >
                          Approve Return
                        </button>
                        <button
                          type="button"
                          className="btn-action-step reject"
                          onClick={() =>
                            updateReturnStatus(selectedOrder._id, "REJECTED")
                          }
                        >
                          Reject Return
                        </button>
                      </>
                    )}

                    {selectedOrder.returnStatus === "APPROVED" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateReturnStatus(selectedOrder._id, "PICKUP_SCHEDULED")
                        }
                      >
                        Schedule Pickup
                      </button>
                    )}

                    {selectedOrder.returnStatus === "PICKUP_SCHEDULED" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateReturnStatus(selectedOrder._id, "PICKED_UP")
                        }
                      >
                        Mark Picked Up
                      </button>
                    )}

                    {selectedOrder.returnStatus === "PICKED_UP" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateReturnStatus(selectedOrder._id, "RETURN_RECEIVED")
                        }
                      >
                        Mark Received
                      </button>
                    )}

                    {(selectedOrder.returnStatus === "RETURN_RECEIVED" ||
                      selectedOrder.returnStatus === "REFUND_PROCESSING") && (
                      <button
                        type="button"
                        className={`btn-action-step refund ${
                          selectedOrder.paymentMethod === "COD" ? "cod" : "stripe"
                        }`}
                        disabled={processingRefundId === selectedOrder._id}
                        onClick={() => handleProcessRefund(selectedOrder._id, selectedOrder)}
                      >
                        {processingRefundId === selectedOrder._id
                          ? "Processing..."
                          : selectedOrder.paymentMethod === "COD"
                          ? "Mark COD Refund Completed"
                          : "Process Stripe Refund"}
                      </button>
                    )}

                    {selectedOrder.returnStatus === "REFUNDED" && (
                      <span className="refund-complete-badge">
                        ✓ Refund Completed
                      </span>
                    )}
                  </div>
                </div>

                <div className="order-summary-row">
                  <span>Change Return Status Directly</span>
                  <select
                    value={selectedOrder.returnStatus || "NONE"}
                    onChange={(e) =>
                      updateReturnStatus(selectedOrder._id, e.target.value)
                    }
                    className="admin-return-status-select"
                  >
                    {RETURN_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="order-summary-row">
                  <span>Requested On</span>
                  <strong>
                    {formatDate(
                      selectedOrder.returnRequest?.requestedAt ||
                        selectedOrder.updatedAt,
                    )}
                  </strong>
                </div>

                <div className="order-summary-row">
                  <span>Return Reason</span>
                  <strong className="return-reason-highlight">
                    {selectedOrder.returnRequest?.reason || "Not specified"}
                  </strong>
                </div>

                {selectedOrder.returnRequest?.details && (
                  <div className="order-summary-row">
                    <span>Customer Details</span>
                    <p className="return-details-p">
                      {selectedOrder.returnRequest.details}
                    </p>
                  </div>
                )}

                <div className="order-summary-row">
                  <span>Refund Amount</span>
                  <strong className="return-refund-amount">
                    ₹
                    {Number(
                      selectedOrder.returnRequest?.refundAmount ||
                        selectedOrder.refundAmount ||
                        selectedOrder.totalAmount ||
                        0,
                    ).toLocaleString("en-IN")}
                  </strong>
                </div>

                <div className="order-summary-row">
                  <span>Refund Method</span>
                  <strong>
                    {selectedOrder.returnRequest?.refundMethod === "COD_MANUAL" ||
                    selectedOrder.paymentMethod === "COD"
                      ? "Cash / Manual Bank Transfer (COD)"
                      : "Stripe Online Refund"}
                  </strong>
                </div>

                {selectedOrder.returnRequest?.stripeRefundId && (
                  <div className="order-summary-row highlight-stripe">
                    <span>Stripe Refund ID</span>
                    <code className="stripe-id-code">
                      {selectedOrder.returnRequest.stripeRefundId}
                    </code>
                  </div>
                )}

                {/* Returned Items */}
                {selectedOrder.returnRequest?.items?.length > 0 && (
                  <div className="return-items-box">
                    <strong>Items Requested for Return:</strong>
                    <div className="return-items-sublist">
                      {selectedOrder.returnRequest.items.map((ritem, rIdx) => (
                        <div key={rIdx} className="return-subitem-row">
                          <span className="return-subitem-name">
                            {ritem.name}
                          </span>
                          <span className="return-subitem-qty">
                            Qty: <strong>{ritem.quantity}</strong>
                            {ritem.size ? ` • Size: ${ritem.size}` : ""}
                          </span>
                          <span className="return-subitem-price">
                            ₹
                            {Number(
                              ritem.price * ritem.quantity,
                            ).toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* EXCHANGE REQUEST DETAILS (IF EXCHANGE REQUESTED) */}
            {selectedOrder.exchangeStatus && selectedOrder.exchangeStatus !== "NONE" && (
              <div className="order-detail-section exchange-detail-card">
                <div className="return-detail-header">
                  <h3>Exchange Request Details</h3>
                  <span
                    className={`admin-exchange-badge badge-${(
                      selectedOrder.exchangeStatus || ""
                    ).toLowerCase()}`}
                  >
                    {selectedOrder.exchangeStatus?.replace(/_/g, " ")}
                  </span>
                </div>

                {/* EXCHANGE ACTION WORKFLOW BUTTONS */}
                <div className="admin-lifecycle-actions">
                  <span>Progress Exchange:</span>
                  <div className="admin-action-btns">
                    {selectedOrder.exchangeStatus === "REQUESTED" && (
                      <>
                        <button
                          type="button"
                          className="btn-action-step approve"
                          onClick={() =>
                            updateExchangeStatus(selectedOrder._id, "APPROVED")
                          }
                        >
                          Approve Exchange
                        </button>
                        <button
                          type="button"
                          className="btn-action-step reject"
                          onClick={() =>
                            updateExchangeStatus(selectedOrder._id, "REJECTED")
                          }
                        >
                          Reject Exchange
                        </button>
                      </>
                    )}

                    {selectedOrder.exchangeStatus === "APPROVED" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateExchangeStatus(selectedOrder._id, "PICKUP_SCHEDULED")
                        }
                      >
                        Schedule Pickup
                      </button>
                    )}

                    {selectedOrder.exchangeStatus === "PICKUP_SCHEDULED" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateExchangeStatus(selectedOrder._id, "PICKED_UP")
                        }
                      >
                        Mark Picked Up
                      </button>
                    )}

                    {selectedOrder.exchangeStatus === "PICKED_UP" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateExchangeStatus(selectedOrder._id, "RECEIVED")
                        }
                      >
                        Mark Received
                      </button>
                    )}

                    {selectedOrder.exchangeStatus === "RECEIVED" && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() =>
                          updateExchangeStatus(selectedOrder._id, "SHIPPED")
                        }
                      >
                        Ship Replacement
                      </button>
                    )}

                    {selectedOrder.exchangeStatus === "SHIPPED" && (
                      <button
                        type="button"
                        className="btn-action-step approve"
                        onClick={() =>
                          updateExchangeStatus(selectedOrder._id, "DELIVERED")
                        }
                      >
                        Mark Delivered
                      </button>
                    )}

                    {selectedOrder.exchangeStatus === "DELIVERED" && (
                      <span className="refund-complete-badge">
                        ✓ Exchange Delivered
                      </span>
                    )}
                  </div>
                </div>

                <div className="order-summary-row">
                  <span>Change Exchange Status Directly</span>
                  <select
                    value={selectedOrder.exchangeStatus || "NONE"}
                    onChange={(e) =>
                      updateExchangeStatus(selectedOrder._id, e.target.value)
                    }
                    className="admin-return-status-select"
                  >
                    {EXCHANGE_STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="order-summary-row">
                  <span>Exchange Reason</span>
                  <strong className="return-reason-highlight">
                    {selectedOrder.exchangeRequest?.reason || "Not specified"}
                  </strong>
                </div>

                {selectedOrder.exchangeRequest?.details && (
                  <div className="order-summary-row">
                    <span>Customer Details</span>
                    <p className="return-details-p">
                      {selectedOrder.exchangeRequest.details}
                    </p>
                  </div>
                )}

                <div className="order-summary-row">
                  <span>Price Difference</span>
                  {selectedOrder.exchangeRequest?.additionalPaymentRequired > 0 ? (
                    <strong style={{ color: "#b45309" }}>
                      Additional Payment Required: ₹{selectedOrder.exchangeRequest.additionalPaymentRequired}
                    </strong>
                  ) : selectedOrder.exchangeRequest?.refundDifference > 0 ? (
                    <strong style={{ color: "#15803d" }}>
                      Refund Difference: ₹{selectedOrder.exchangeRequest.refundDifference}
                    </strong>
                  ) : (
                    <span>No Price Difference (₹0)</span>
                  )}
                </div>

                {/* Exchange Item Specs */}
                {selectedOrder.exchangeRequest?.items?.length > 0 && (
                  <div className="return-items-box">
                    <strong>Exchange Item Details:</strong>
                    <div className="return-items-sublist">
                      {selectedOrder.exchangeRequest.items.map((eitem, eIdx) => (
                        <div key={eIdx} className="return-subitem-row exchange-spec-row">
                          <span className="return-subitem-name">
                            {eitem.name}
                          </span>
                          <span>
                            Original Size: <strong>{eitem.originalSize || "Std"}</strong> → Replacement Size:{" "}
                            <strong style={{ color: "#0082c3" }}>{eitem.newSize}</strong>
                          </span>
                          <span className="return-subitem-qty">
                            Qty: <strong>{eitem.quantity}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAYMENT DETAILS & FINANCIALS */}
            <div className="order-detail-section">
              <h3>Payment &amp; Financial Breakdown</h3>

              <div className="order-summary-row">
                <span>Payment Method</span>
                <strong>
                  {formatPaymentMethod(selectedOrder.paymentMethod)}
                </strong>
              </div>

              <div className="order-summary-row">
                <span>Payment Status</span>
                {isStripePaidOrder(selectedOrder) ? (
                  renderPaymentBadge(selectedOrder)
                ) : (
                  <select
                    value={selectedOrder.paymentStatus || "pending"}
                    onChange={(e) =>
                      updatePaymentStatus(selectedOrder._id, e.target.value)
                    }
                    className={getPaymentClass(
                      selectedOrder.paymentStatus || "pending",
                    )}
                  >
                    <option value="pending">Pending (COD)</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                )}
              </div>

              {selectedOrder.stripePaymentIntentId && (
                <div className="order-summary-row highlight-stripe">
                  <span>Stripe PaymentIntent</span>
                  <code className="stripe-id-code">
                    {selectedOrder.stripePaymentIntentId}
                  </code>
                </div>
              )}

              <div className="order-summary-row">
                <span>Delivery Option</span>
                <strong>
                  {formatDeliveryOption(selectedOrder.deliveryOption)}
                </strong>
              </div>

              <div className="order-summary-row">
                <span>Subtotal</span>
                <strong>
                  ₹{Number(selectedOrder.subtotal || 0).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="order-summary-row">
                <span>Discount</span>
                <strong>
                  - ₹{Number(selectedOrder.discount || 0).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="order-summary-row">
                <span>Delivery Charge</span>
                <strong>
                  ₹{Number(selectedOrder.deliveryCharge || 0).toLocaleString("en-IN")}
                </strong>
              </div>

              <div className="order-summary-row total-row">
                <span>Total Amount</span>
                <strong>
                  ₹{Number(selectedOrder.totalAmount || 0).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;
