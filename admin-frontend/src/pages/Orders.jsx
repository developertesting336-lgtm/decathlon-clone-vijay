import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  MdThumbUp,
  MdSchedule,
  MdAutorenew,
  MdDoneAll,
  MdSync,
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

const RETURN_NEXT_ACTIONS = {
  REQUESTED: { label: "Approve Return", status: "APPROVED" },
  APPROVED: { label: "Schedule Pickup", status: "PICKUP_SCHEDULED" },
  PICKUP_SCHEDULED: { label: "Mark Picked Up", status: "PICKED_UP" },
  PICKED_UP: { label: "Mark Return Received", status: "RETURN_RECEIVED" },
  RETURN_RECEIVED: { label: "Process Refund", refund: true },
  REFUND_PROCESSING: { label: "Complete Refund", refund: true },
};

const EXCHANGE_NEXT_ACTIONS = {
  REQUESTED: { label: "Approve Exchange", status: "APPROVED" },
  APPROVED: { label: "Schedule Pickup", status: "PICKUP_SCHEDULED" },
  PICKUP_SCHEDULED: { label: "Mark Picked Up", status: "PICKED_UP" },
  PICKED_UP: { label: "Mark Received", status: "RECEIVED" },
  RECEIVED: { label: "Ship Replacement", status: "SHIPPED" },
  SHIPPED: { label: "Mark Exchange Delivered", status: "DELIVERED" },
};

const Orders = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState(() => {
    if (tabParam === "returns") return "returns";
    if (tabParam === "exchanges") return "exchanges";
    return "all_orders";
  }); // 'all_orders' | 'returns' | 'exchanges'

  useEffect(() => {
    if (tabParam === "returns") {
      setActiveTab("returns");
    } else if (tabParam === "exchanges") {
      setActiveTab("exchanges");
    } else if (tabParam === "all_orders") {
      setActiveTab("all_orders");
    }
  }, [tabParam]);
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

    const handleTrackingUpdate = (event) => {
      try {
        const orderId = event?.orderId;
        if (!orderId) return;
        const targetId = orderId.toString();

        setOrders((prev) =>
          sortOrders(
            prev.map((o) => {
              if (o._id && o._id.toString() === targetId) {
                const history = o.trackingHistory ? [...o.trackingHistory] : [];
                if (event.status && !history.some((h) => h.status === event.status)) {
                  history.push({
                    status: event.status,
                    location: event.currentLocation?.city || "",
                    description: `Status updated to ${event.status}`,
                    timestamp: event.timestamp || new Date(),
                  });
                }
                return {
                  ...o,
                  orderStatus: event.status === "DELIVERED" ? "delivered" : o.orderStatus,
                  deliveredAt: event.status === "DELIVERED" ? (event.timestamp || new Date()) : o.deliveredAt,
                  trackingNumber: event.trackingNumber || o.trackingNumber,
                  currentLocation: event.currentLocation || o.currentLocation,
                  trackingHistory: history,
                };
              }
              return o;
            })
          )
        );

        setSelectedOrder((prev) => {
          if (prev && prev._id && prev._id.toString() === targetId) {
            const history = prev.trackingHistory ? [...prev.trackingHistory] : [];
            if (event.status && !history.some((h) => h.status === event.status)) {
              history.push({
                status: event.status,
                location: event.currentLocation?.city || "",
                description: `Status updated to ${event.status}`,
                timestamp: event.timestamp || new Date(),
              });
            }
            return {
              ...prev,
              orderStatus: event.status === "DELIVERED" ? "delivered" : prev.orderStatus,
              deliveredAt: event.status === "DELIVERED" ? (event.timestamp || new Date()) : prev.deliveredAt,
              trackingNumber: event.trackingNumber || prev.trackingNumber,
              currentLocation: event.currentLocation || prev.currentLocation,
              trackingHistory: history,
            };
          }
          return prev;
        });
      } catch (err) {
        console.error("Realtime tracking update error:", err);
      }
    };

    const handlePaymentStatusUpdate = (event) => {
      try {
        const orderId = event?.orderId;
        if (!orderId) return;
        const targetId = orderId.toString();

        setOrders((prev) =>
          prev.map((o) => {
            if (o._id && o._id.toString() === targetId) {
              return {
                ...o,
                paymentStatus: event.paymentStatus || "paid",
                paymentReceivedAt: event.timestamp || new Date(),
              };
            }
            return o;
          })
        );

        setSelectedOrder((prev) => {
          if (prev && prev._id && prev._id.toString() === targetId) {
            return {
              ...prev,
              paymentStatus: event.paymentStatus || "paid",
              paymentReceivedAt: event.timestamp || new Date(),
            };
          }
          return prev;
        });
      } catch (err) {
        console.error("Realtime payment status update error:", err);
      }
    };

    socket.on("order_updated", handleOrderUpdate);
    socket.on("order_tracking_updated", handleTrackingUpdate);
    socket.on("payment_status_updated", handlePaymentStatusUpdate);

    return () => {
      socket.off("order_updated", handleOrderUpdate);
      socket.off("order_tracking_updated", handleTrackingUpdate);
      socket.off("payment_status_updated", handlePaymentStatusUpdate);
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

  const getOrderTrackingStatus = useCallback((order) => {
    if (!order) return "ORDER_PLACED";
    if (order.orderStatus === "cancelled") return "CANCELLED";
    if (order.trackingHistory && order.trackingHistory.length > 0) {
      return order.trackingHistory[order.trackingHistory.length - 1].status;
    }
    if (order.orderStatus === "delivered") return "DELIVERED";
    if (order.orderStatus === "shipped") return "SHIPPED";
    return "ORDER_PLACED";
  }, []);

  const handleMarkAsDelivered = async (order) => {
    if (!order) return;
    const confirmDelivery = window.confirm(
      `Confirm delivery for Order #${order._id.toString().slice(-8).toUpperCase()}?\nThis will mark tracking and order status as DELIVERED.`
    );
    if (!confirmDelivery) return;

    try {
      const locCity =
        order.shippingAddress?.cityState ||
        order.currentLocation?.city ||
        "Delhi";
      const locLat = order.currentLocation?.latitude || 28.6139;
      const locLng = order.currentLocation?.longitude || 77.2090;

      const response = await api.put(`/orders/${order._id}/tracking`, {
        status: "DELIVERED",
        location: {
          city: locCity,
          latitude: locLat,
          longitude: locLng,
        },
        description: "Order delivered successfully",
      });

      const updatedOrder = response.data?.order;
      const trackingData = response.data?.tracking;

      setOrders((prev) =>
        sortOrders(
          prev.map((o) =>
            o._id === order._id
              ? {
                  ...o,
                  ...(updatedOrder || {}),
                  orderStatus: "delivered",
                  deliveredAt: trackingData?.deliveredAt || new Date().toISOString(),
                  trackingHistory: trackingData?.trackingHistory || o.trackingHistory,
                }
              : o
          )
        )
      );

      setSelectedOrder((prev) =>
        prev && prev._id === order._id
          ? {
              ...prev,
              ...(updatedOrder || {}),
              orderStatus: "delivered",
              deliveredAt: trackingData?.deliveredAt || new Date().toISOString(),
              trackingHistory: trackingData?.trackingHistory || prev.trackingHistory,
            }
          : prev
      );

      toast.success("Order marked as DELIVERED successfully!");
    } catch (error) {
      console.error("Mark Delivered Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to mark order as delivered"
      );
    }
  };

  const handleMarkCodPaymentReceived = async (order) => {
    if (!order) return;
    const confirmCod = window.confirm(
      "Confirm that COD payment has been received?"
    );
    if (!confirmCod) return;

    try {
      const response = await api.put(`/orders/${order._id}/payment-status`, {
        paymentStatus: "paid",
      });

      const updatedOrder = response.data?.order;

      setOrders((prev) =>
        prev.map((o) =>
          o._id === order._id
            ? {
                ...o,
                ...(updatedOrder || {}),
                paymentStatus: "paid",
                paymentReceivedAt: updatedOrder?.paymentReceivedAt || new Date().toISOString(),
              }
            : o
        )
      );

      setSelectedOrder((prev) =>
        prev && prev._id === order._id
          ? {
              ...prev,
              ...(updatedOrder || {}),
              paymentStatus: "paid",
              paymentReceivedAt: updatedOrder?.paymentReceivedAt || new Date().toISOString(),
            }
          : prev
      );

      toast.success("COD payment confirmed as received!");
    } catch (error) {
      console.error("Confirm COD Payment Error:", error);
      toast.error(
        error.response?.data?.message || "Failed to confirm COD payment"
      );
    }
  };

  const handleUpdateTrackingStep = async (order, nextStatus) => {
    if (!order) return;
    try {
      const locCity =
        order.shippingAddress?.cityState ||
        order.currentLocation?.city ||
        "Central Fulfillment Hub, Bengaluru";
      const locLat = order.currentLocation?.latitude || 12.9716;
      const locLng = order.currentLocation?.longitude || 77.5946;

      const response = await api.put(`/orders/${order._id}/tracking`, {
        status: nextStatus,
        location: {
          city: locCity,
          latitude: locLat,
          longitude: locLng,
        },
      });

      const updatedOrder = response.data?.order;
      const trackingData = response.data?.tracking;

      setOrders((prev) =>
        sortOrders(
          prev.map((o) =>
            o._id === order._id
              ? {
                  ...o,
                  ...(updatedOrder || {}),
                  trackingHistory: trackingData?.trackingHistory || o.trackingHistory,
                }
              : o
          )
        )
      );

      setSelectedOrder((prev) =>
        prev && prev._id === order._id
          ? {
              ...prev,
              ...(updatedOrder || {}),
              trackingHistory: trackingData?.trackingHistory || prev.trackingHistory,
            }
          : prev
      );

      toast.success(`Tracking updated to ${nextStatus.replace(/_/g, " ")}`);
    } catch (error) {
      console.error("Update Tracking Step Error:", error);
      toast.error(error.response?.data?.message || "Failed to update tracking");
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "pending":
        return "order-status-select status-pending";
      case "confirmed":
        return "order-status-select status-confirmed";
      case "processing":
        return "order-status-select status-processing";
      case "shipped":
        return "order-status-select status-shipped";
      case "delivered":
        return "order-status-select status-delivered";
      case "cancelled":
        return "order-status-select status-cancelled";
      case "returned":
        return "order-status-select status-returned";
      case "failed":
        return "order-status-select status-failed";
      default:
        return "order-status-select";
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

  const formatDateTime = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPaymentMethod = (method) => {
    if (!method) return "-";
    if (method === "COD") return "Cash on Delivery (COD)";
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

  const formatReturnStatus = (status) => {
    if (!status || status === "NONE") return "None";
    return status.replace(/_/g, " ");
  };

  const formatExchangeStatus = (status) => {
    if (!status || status === "NONE") return "None";
    return status.replace(/_/g, " ");
  };

  const hasActiveReturn = (order) => {
    if (!order) return false;
    const status = (order.returnStatus || order.returnRequest?.status || "NONE").toUpperCase();
    return (status !== "NONE" && status !== "CANCELLED") || order.orderStatus === "returned";
  };

  const hasActiveExchange = (order) => {
    if (!order) return false;
    const status = (order.exchangeStatus || order.exchangeRequest?.status || "NONE").toUpperCase();
    return status !== "NONE" && status !== "CANCELLED";
  };

  const getDisplayedOrderStatus = (order) => {
    if (!order) return "-";

    const returnStatus = (order.returnStatus || order.returnRequest?.status || "NONE").toUpperCase();
    const exchangeStatus = (order.exchangeStatus || order.exchangeRequest?.status || "NONE").toUpperCase();

    // Completed lifecycle states take precedence when both fields are present.
    if (returnStatus === "REFUNDED") return "Returned";
    if (["DELIVERED", "COMPLETED"].includes(exchangeStatus)) return "Exchanged";

    if ([
      "REQUESTED",
      "APPROVED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "RETURN_RECEIVED",
      "REFUND_PROCESSING",
    ].includes(returnStatus)) {
      return "Return Active";
    }

    if ([
      "REQUESTED",
      "APPROVED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "RECEIVED",
      "SHIPPED",
    ].includes(exchangeStatus)) {
      return "Exchange Active";
    }

    return formatStatus(order.orderStatus);
  };

  const getReturnNextAction = (order) => {
    const status = (order?.returnStatus || order?.returnRequest?.status || "NONE").toUpperCase();
    return RETURN_NEXT_ACTIONS[status] || null;
  };

  const getExchangeNextAction = (order) => {
    const status = (order?.exchangeStatus || order?.exchangeRequest?.status || "NONE").toUpperCase();
    return EXCHANGE_NEXT_ACTIONS[status] || null;
  };

  const handleReturnNextAction = (order) => {
    const action = getReturnNextAction(order);
    if (!action) return;
    if (action.refund) {
      return handleProcessRefund(order._id, order);
    }
    return updateReturnStatus(order._id, action.status);
  };

  const handleExchangeNextAction = (order) => {
    const action = getExchangeNextAction(order);
    if (!action) return;
    return updateExchangeStatus(order._id, action.status);
  };

  // Render payment status badge distinguishing Stripe vs COD, Returns, Exchanges, Cancelled
  const renderPaymentBadge = (order) => {
    if (!order) return null;
    const isStripe = isStripePaidOrder(order);
    const isCod = order.paymentMethod === "COD";
    const rawStatus = (order.paymentStatus || "pending").toLowerCase();
    const returnStatus = (order.returnStatus || order.returnRequest?.status || "NONE").toUpperCase();
    const hasReturn = returnStatus !== "NONE" && returnStatus !== "CANCELLED";

    // Handle Return Orders payment badge rules
    if (hasReturn) {
      if (rawStatus === "refunded" || returnStatus === "REFUNDED") {
        return (
          <span className="pay-badge refunded">
            {isCod ? "REFUNDED (COD)" : "REFUNDED"}
          </span>
        );
      }
      if (isCod) {
        return (
          <span className="pay-badge pending">
            COD REFUND PENDING
          </span>
        );
      }
      return (
        <span className="pay-badge refund-processing">
          REFUND PROCESSING
        </span>
      );
    }

    // Cancelled orders
    if (order.orderStatus === "cancelled") {
      if (rawStatus === "refunded") {
        return <span className="pay-badge refunded">REFUNDED</span>;
      }
      if (isCod) {
        return <span className="pay-badge cancelled-pay">CANCELLED (NO PAYMENT)</span>;
      }
      return <span className="pay-badge pending">PENDING</span>;
    }

    // Normal & Exchange orders
    if (rawStatus === "refunded") {
      return (
        <span className="pay-badge refunded">
          {isStripe ? "REFUNDED" : "REFUNDED (COD)"}
        </span>
      );
    }
    if (rawStatus === "paid") {
      return (
        <span className="pay-badge paid">
          {isCod ? "PAID (COD)" : `Paid ${isStripe ? "(Stripe)" : ""}`}
        </span>
      );
    }
    if (rawStatus === "failed") {
      return <span className="pay-badge failed">Failed</span>;
    }
    if (isCod) {
      return <span className="pay-badge pending">PENDING (COD)</span>;
    }
    return <span className="pay-badge pending">Pending</span>;
  };

  // 1. ORIGINAL ORDER DELIVERY TIMELINE
  const renderDeliveryTimeline = (order) => {
    if (!order) return null;

    if (order.orderStatus === "cancelled") {
      return (
        <div className="order-timeline cancelled-timeline">
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdCheck /></div>
            <div className="timeline-content">
              <strong>Order Placed</strong>
              <span>{formatDateTime(order.createdAt)}</span>
            </div>
          </div>
          <div className="timeline-line cancelled-line"></div>
          <div className="timeline-step error">
            <div className="timeline-dot"><MdCancel /></div>
            <div className="timeline-content">
              <strong>Order Cancelled</strong>
              <span>
                {order.cancelledAt
                  ? formatDateTime(order.cancelledAt)
                  : formatDateTime(order.updatedAt)}
              </span>
              {order.cancellationReason && (
                <span className="cancellation-reason-text">
                  Reason: {order.cancellationReason}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    const TRACKING_STEPS = [
      { key: "ORDER_PLACED", label: "Order Placed", icon: <MdCheck /> },
      { key: "SHIPPED", label: "Shipped", icon: <MdLocalShipping /> },
      { key: "REACHED_HUB", label: "Reached Hub", icon: <MdInventory /> },
      { key: "OUT_FOR_DELIVERY", label: "Out For Delivery", icon: <MdLocalShipping /> },
      { key: "DELIVERED", label: "Delivered", icon: <MdCheckCircle /> },
    ];

    const isOrderAlreadyDelivered =
      hasActiveReturn(order) ||
      hasActiveExchange(order) ||
      order.orderStatus === "returned" ||
      order.orderStatus === "delivered" ||
      Boolean(order.deliveredAt);

    const currentTracking = isOrderAlreadyDelivered
      ? "DELIVERED"
      : getOrderTrackingStatus(order);

    const currentStepIndex = isOrderAlreadyDelivered
      ? TRACKING_STEPS.length - 1
      : TRACKING_STEPS.findIndex((s) => s.key === currentTracking);

    const getStepTimestamp = (stepKey) => {
      const entry = (order.trackingHistory || []).find((h) => h.status === stepKey);
      if (entry?.timestamp) return formatDateTime(entry.timestamp);
      if (stepKey === "ORDER_PLACED") return formatDateTime(order.createdAt);
      if (stepKey === "DELIVERED" && (order.deliveredAt || isOrderAlreadyDelivered)) {
        return formatDateTime(order.deliveredAt || order.updatedAt || order.createdAt);
      }
      return null;
    };

    return (
      <div className="tracking-timeline-wrapper">
        <div className="order-timeline">
          {TRACKING_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentStepIndex;
            const isActive = idx === currentStepIndex;
            const stepTime = getStepTimestamp(step.key);

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
                    {stepTime && <span className="step-time">{stepTime}</span>}
                    {isActive && (
                      <span className="step-current-tag">
                        {isOrderAlreadyDelivered ? "Delivered" : "Current Stage"}
                      </span>
                    )}
                  </div>
                </div>
                {idx < TRACKING_STEPS.length - 1 && (
                  <div
                    className={`timeline-line ${
                      idx < currentStepIndex ? "completed-line" : ""
                    }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Action progression bar only for active un-delivered orders */}
        {!isOrderAlreadyDelivered && (
          <div className="admin-tracking-actions-bar">
            <div className="tracking-current-summary">
              <span>Tracking Status:</span>
              <strong className="tracking-status-badge">
                {currentTracking.replace(/_/g, " ")}
              </strong>
            </div>

            <div className="tracking-control-buttons">
              {currentTracking === "ORDER_PLACED" && (
                <button
                  type="button"
                  className="btn-tracking-step ship"
                  onClick={() => handleUpdateTrackingStep(order, "SHIPPED")}
                >
                  Mark Shipped
                </button>
              )}

              {currentTracking === "SHIPPED" && (
                <button
                  type="button"
                  className="btn-tracking-step hub"
                  onClick={() => handleUpdateTrackingStep(order, "REACHED_HUB")}
                >
                  Mark Reached Hub
                </button>
              )}

              {currentTracking === "REACHED_HUB" && (
                <button
                  type="button"
                  className="btn-tracking-step out-delivery"
                  onClick={() => handleUpdateTrackingStep(order, "OUT_FOR_DELIVERY")}
                >
                  Mark Out for Delivery
                </button>
              )}

              {currentTracking === "OUT_FOR_DELIVERY" && (
                <button
                  type="button"
                  className="btn-tracking-step deliver"
                  onClick={() => handleMarkAsDelivered(order)}
                >
                  Mark as Delivered
                </button>
              )}

              {currentTracking === "DELIVERED" && (
                <span className="delivered-done-badge">
                  ✓ Order Delivered
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. ORIGINAL ORDER LOGISTICS CARD
  const renderDeliveryLogisticsCard = (order) => {
    const isCancelled = order.orderStatus === "cancelled";
    const isOrderAlreadyDelivered =
      hasActiveReturn(order) ||
      hasActiveExchange(order) ||
      order.orderStatus === "returned" ||
      order.orderStatus === "delivered" ||
      Boolean(order.deliveredAt);

    return (
      <div className="tracking-metadata-card">
        <div className="tracking-meta-grid">
          <div className="tracking-meta-item">
            <span>Tracking Number</span>
            <strong>{order.trackingNumber || "Pending Generation"}</strong>
          </div>
          <div className="tracking-meta-item">
            <span>Carrier</span>
            <strong>{order.carrier || "Decathlon Demo Logistics"}</strong>
          </div>
          <div className="tracking-meta-item">
            <span>Current Location</span>
            <strong>
              {isCancelled
                ? "Not Applicable"
                : isOrderAlreadyDelivered
                ? order.shippingAddress?.cityState || "Delivered to Customer"
                : (order.currentLocation?.city || order.shippingAddress?.cityState || "In Transit")}
            </strong>
          </div>
          <div className="tracking-meta-item">
            <span>Estimated Delivery</span>
            <strong>
              {isCancelled
                ? "Not Applicable"
                : isOrderAlreadyDelivered
                ? "Delivered"
                : formatDate(order.estimatedDeliveryDate)}
            </strong>
          </div>
          <div className={`tracking-meta-item ${isCancelled ? "cancelled" : "delivered"}`}>
            <span>Delivered Timestamp</span>
            {isCancelled ? (
              <strong style={{ color: "#ef4444" }}>Not Delivered</strong>
            ) : isOrderAlreadyDelivered ? (
              <strong style={{ color: "#16a34a" }}>
                {formatDateTime(order.deliveredAt || order.updatedAt || order.createdAt)}
              </strong>
            ) : (
              <span style={{ color: "#64748b" }}>Pending Delivery</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 2. RETURN TRACKING TIMELINE
  const RETURN_TIMELINE_STEPS = [
    { key: "ORDER_DELIVERED", label: "Order Delivered", icon: <MdCheckCircle /> },
    { key: "REQUESTED", label: "Return Requested", icon: <MdAssignmentReturn /> },
    { key: "APPROVED", label: "Return Approved", icon: <MdThumbUp /> },
    { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled", icon: <MdSchedule /> },
    { key: "PICKED_UP", label: "Picked Up", icon: <MdLocalShipping /> },
    { key: "RETURN_RECEIVED", label: "Return Received", icon: <MdInventory /> },
    { key: "REFUND_PROCESSING", label: "Refund Processing", icon: <MdAutorenew /> },
    { key: "REFUNDED", label: "Refunded", icon: <MdDoneAll /> },
  ];

  const renderReturnTimeline = (order) => {
    if (!order) return null;
    const rStatus = (order.returnStatus || order.returnRequest?.status || "REQUESTED").toUpperCase();

    if (rStatus === "REJECTED") {
      return (
        <div className="order-timeline cancelled-timeline">
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdCheckCircle /></div>
            <div className="timeline-content">
              <strong>Order Delivered</strong>
              <span>{formatDateTime(order.deliveredAt || order.createdAt)}</span>
            </div>
          </div>
          <div className="timeline-line completed-line"></div>
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdAssignmentReturn /></div>
            <div className="timeline-content">
              <strong>Return Requested</strong>
              <span>{formatDate(order.returnRequest?.requestedAt || order.updatedAt)}</span>
            </div>
          </div>
          <div className="timeline-line cancelled-line"></div>
          <div className="timeline-step error">
            <div className="timeline-dot"><MdCancel /></div>
            <div className="timeline-content">
              <strong>Return Rejected</strong>
              {order.returnRequest?.adminNote && (
                <span className="cancellation-reason-text">
                  Note: {order.returnRequest.adminNote}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    const stepOrder = [
      "ORDER_DELIVERED",
      "REQUESTED",
      "APPROVED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "RETURN_RECEIVED",
      "REFUND_PROCESSING",
      "REFUNDED",
    ];

    let currentIdx = stepOrder.indexOf(rStatus);
    if (currentIdx === -1) currentIdx = 1;

    const getReturnStepTime = (stepKey) => {
      if (stepKey === "ORDER_DELIVERED") {
        return formatDateTime(order.deliveredAt || order.createdAt);
      }
      if (stepKey === "REQUESTED") {
        return formatDate(order.returnRequest?.requestedAt || order.updatedAt);
      }
      if (stepKey === "REFUNDED" && (order.refundedAt || order.returnRequest?.processedAt)) {
        return formatDate(order.refundedAt || order.returnRequest?.processedAt);
      }
      return null;
    };

    return (
      <div className="tracking-timeline-wrapper return-flow">
        <div className="order-timeline">
          {RETURN_TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIdx;
            const isActive = idx === currentIdx;
            const stepTime = getReturnStepTime(step.key);

            return (
              <React.Fragment key={step.key}>
                <div
                  className={`timeline-step ${isCompleted ? "completed return-step-done" : ""} ${
                    isActive ? "active return-step-active" : ""
                  }`}
                >
                  <div className="timeline-dot">{step.icon}</div>
                  <div className="timeline-content">
                    <strong>{step.label}</strong>
                    {stepTime && <span className="step-time">{stepTime}</span>}
                    {isActive && (
                      <span className="step-current-tag return-tag">Active</span>
                    )}
                  </div>
                </div>
                {idx < RETURN_TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`timeline-line ${
                      idx < currentIdx ? "completed-line return-line-done" : ""
                    }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. RETURN DETAILS CARD
  const renderReturnDetailsCard = (order) => {
    const isCod = order.paymentMethod === "COD" || order.returnRequest?.refundMethod === "COD_MANUAL";
    const rStatus = (order.returnStatus || order.returnRequest?.status || "REQUESTED").toUpperCase();
    const isRefunded = rStatus === "REFUNDED" || order.paymentStatus === "refunded";
    const refundAmount = Number(
      order.returnRequest?.refundAmount || order.refundAmount || order.totalAmount || 0
    );

    return (
      <div className="return-details-card">
        <div className="return-meta-grid">
          <div className="return-meta-item">
            <span>Return Status</span>
            <strong className={`badge-pill return-${rStatus.toLowerCase()}`}>
              {formatReturnStatus(rStatus)}
            </strong>
          </div>

          <div className="return-meta-item">
            <span>Requested On</span>
            <strong>{formatDateTime(order.returnRequest?.requestedAt || order.updatedAt)}</strong>
          </div>

          <div className="return-meta-item">
            <span>Return Reason</span>
            <strong>{order.returnRequest?.reason || "Not Specified"}</strong>
          </div>

          <div className="return-meta-item">
            <span>Pickup Address</span>
            <strong>
              {order.returnRequest?.pickupAddress ||
                `${order.shippingAddress?.houseBuilding}, ${order.shippingAddress?.streetLocality}, ${order.shippingAddress?.cityState} - ${order.shippingAddress?.pincode}`}
            </strong>
          </div>

          <div className="return-meta-item">
            <span>Pickup Status</span>
            <strong>
              {["PICKED_UP", "RETURN_RECEIVED", "REFUND_PROCESSING", "REFUNDED"].includes(rStatus)
                ? "Items Picked Up"
                : rStatus === "PICKUP_SCHEDULED"
                ? "Pickup Scheduled"
                : "Pending Pickup Scheduling"}
            </strong>
          </div>

          {/* PAYMENT & REFUND SECTION */}
          <div className="return-meta-item highlight-refund">
            <span>Payment &amp; Refund Status</span>
            {isCod ? (
              <div>
                <strong style={{ color: isRefunded ? "#16a34a" : "#ea580c" }}>
                  {isRefunded ? "REFUNDED (COD Cash / Bank Payout)" : "COD REFUND PENDING"}
                </strong>
                <p className="refund-subtext">
                  {isRefunded
                    ? `₹${refundAmount.toLocaleString("en-IN")} settled via manual payout on ${formatDate(
                        order.refundedAt || order.returnRequest?.processedAt || order.updatedAt
                      )}.`
                    : `₹${refundAmount.toLocaleString("en-IN")} will be refunded via Cash/Bank Transfer upon return verification.`}
                </p>
                {order.returnRequest?.adminNote && (
                  <p className="refund-subtext">Note: {order.returnRequest.adminNote}</p>
                )}
              </div>
            ) : (
              <div>
                <strong style={{ color: isRefunded ? "#16a34a" : "#7c3aed" }}>
                  {isRefunded ? "Payment: REFUNDED (Stripe Gateway)" : "Payment: REFUND PROCESSING"}
                </strong>
                <p className="refund-subtext">
                  {isRefunded
                    ? `₹${refundAmount.toLocaleString("en-IN")} refunded to original payment method. Stripe Refund ID: ${
                        order.returnRequest?.stripeRefundId || order.stripeRefundId || "Completed"
                      }`
                    : `₹${refundAmount.toLocaleString("en-IN")} refund being processed to original payment method.`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RETURNED ITEMS LIST */}
        {order.returnRequest?.items && order.returnRequest.items.length > 0 && (
          <div className="return-items-section">
            <h4>Returned Product ({order.returnRequest.items.length})</h4>
            <div className="return-items-list">
              {order.returnRequest.items.map((item, idx) => (
                <div key={idx} className="return-item-row">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="return-item-thumb"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  )}
                  <div className="return-item-info">
                    <strong>{item.name}</strong>
                    <span>
                      Qty: {item.quantity} {item.size ? `• Size: ${item.size}` : ""}{" "}
                      {item.color ? `• Color: ${item.color}` : ""}
                    </span>
                  </div>
                  <div className="return-item-price">
                    ₹{Number(item.price || 0).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. EXCHANGE TRACKING TIMELINE
  const EXCHANGE_TIMELINE_STEPS = [
    { key: "ORDER_DELIVERED", label: "Order Delivered", icon: <MdCheckCircle /> },
    { key: "REQUESTED", label: "Exchange Requested", icon: <MdSync /> },
    { key: "APPROVED", label: "Exchange Approved", icon: <MdThumbUp /> },
    { key: "PICKUP_SCHEDULED", label: "Pickup Scheduled", icon: <MdSchedule /> },
    { key: "PICKED_UP", label: "Picked Up", icon: <MdLocalShipping /> },
    { key: "RECEIVED", label: "Product Received", icon: <MdInventory /> },
    { key: "SHIPPED", label: "Replacement Shipped", icon: <MdLocalShipping /> },
    { key: "DELIVERED", label: "Replacement Delivered", icon: <MdCheckCircle /> },
  ];

  const renderExchangeTimeline = (order) => {
    if (!order) return null;
    const eStatus = (order.exchangeStatus || order.exchangeRequest?.status || "REQUESTED").toUpperCase();

    if (eStatus === "REJECTED") {
      return (
        <div className="order-timeline cancelled-timeline">
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdCheckCircle /></div>
            <div className="timeline-content">
              <strong>Order Delivered</strong>
              <span>{formatDateTime(order.deliveredAt || order.createdAt)}</span>
            </div>
          </div>
          <div className="timeline-line completed-line"></div>
          <div className="timeline-step completed">
            <div className="timeline-dot"><MdSync /></div>
            <div className="timeline-content">
              <strong>Exchange Requested</strong>
              <span>{formatDate(order.exchangeRequest?.requestedAt || order.updatedAt)}</span>
            </div>
          </div>
          <div className="timeline-line cancelled-line"></div>
          <div className="timeline-step error">
            <div className="timeline-dot"><MdCancel /></div>
            <div className="timeline-content">
              <strong>Exchange Rejected</strong>
              {order.exchangeRequest?.adminNote && (
                <span className="cancellation-reason-text">
                  Note: {order.exchangeRequest.adminNote}
                </span>
              )}
            </div>
          </div>
        </div>
      );
    }

    const stepOrder = [
      "ORDER_DELIVERED",
      "REQUESTED",
      "APPROVED",
      "PICKUP_SCHEDULED",
      "PICKED_UP",
      "RECEIVED",
      "SHIPPED",
      "DELIVERED",
    ];

    let currentIdx = stepOrder.indexOf(eStatus);
    if (currentIdx === -1) currentIdx = 1;

    const getExchangeStepTime = (stepKey) => {
      if (stepKey === "ORDER_DELIVERED") {
        return formatDateTime(order.deliveredAt || order.createdAt);
      }
      if (stepKey === "REQUESTED") {
        return formatDate(order.exchangeRequest?.requestedAt || order.updatedAt);
      }
      if (stepKey === "DELIVERED" && order.exchangeRequest?.replacementDeliveredAt) {
        return formatDate(order.exchangeRequest.replacementDeliveredAt);
      }
      return null;
    };

    return (
      <div className="tracking-timeline-wrapper exchange-flow">
        <div className="order-timeline">
          {EXCHANGE_TIMELINE_STEPS.map((step, idx) => {
            const isCompleted = idx <= currentIdx;
            const isActive = idx === currentIdx;
            const stepTime = getExchangeStepTime(step.key);

            return (
              <React.Fragment key={step.key}>
                <div
                  className={`timeline-step ${isCompleted ? "completed exchange-step-done" : ""} ${
                    isActive ? "active exchange-step-active" : ""
                  }`}
                >
                  <div className="timeline-dot">{step.icon}</div>
                  <div className="timeline-content">
                    <strong>{step.label}</strong>
                    {stepTime && <span className="step-time">{stepTime}</span>}
                    {isActive && (
                      <span className="step-current-tag exchange-tag">Active</span>
                    )}
                  </div>
                </div>
                {idx < EXCHANGE_TIMELINE_STEPS.length - 1 && (
                  <div
                    className={`timeline-line ${
                      idx < currentIdx ? "completed-line exchange-line-done" : ""
                    }`}
                  ></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  // 2. EXCHANGE DETAILS CARD
  const renderExchangeDetailsCard = (order) => {
    const eStatus = (order.exchangeStatus || order.exchangeRequest?.status || "REQUESTED").toUpperCase();
    const reqItem = order.exchangeRequest?.items?.[0] || {};
    const origItem = order.orderItems?.[0] || {};

    const replacementTrackingNum =
      order.exchangeRequest?.replacementTrackingNumber ||
      (["SHIPPED", "DELIVERED"].includes(eStatus)
        ? `EX-TRK-${order._id.toString().slice(-8).toUpperCase()}`
        : "Pending Generation");

    const replacementCarrier =
      order.exchangeRequest?.replacementCarrier || "Decathlon Express Logistics";

    const replacementLocation =
      order.exchangeRequest?.replacementLocation ||
      (eStatus === "DELIVERED"
        ? "Delivered to Customer"
        : eStatus === "SHIPPED"
        ? "In Transit to Destination"
        : eStatus === "RECEIVED"
        ? "Decathlon Fulfillment Center"
        : "Awaiting Item Pickup & Inspection");

    const replacementETA =
      order.exchangeRequest?.estimatedReplacementDeliveryDate
        ? formatDate(order.exchangeRequest.estimatedReplacementDeliveryDate)
        : eStatus === "DELIVERED"
        ? "Delivered"
        : eStatus === "SHIPPED"
        ? "Within 2-3 business days"
        : "Calculated upon dispatch";

    return (
      <div className="exchange-details-card">
        <div className="exchange-meta-grid">
          <div className="exchange-meta-item">
            <span>Exchange Status</span>
            <strong className={`badge-pill exchange-${eStatus.toLowerCase()}`}>
              {formatExchangeStatus(eStatus)}
            </strong>
          </div>

          <div className="exchange-meta-item">
            <span>Original Product</span>
            <strong>{origItem.name || reqItem.name || "Product"}</strong>
            <span className="meta-sub">Original Size: {origItem.size || reqItem.originalSize || "Standard"}</span>
          </div>

          <div className="exchange-meta-item highlight-exchange">
            <span>Replacement Product &amp; Size</span>
            <strong style={{ color: "#0082c3" }}>
              {reqItem.name || origItem.name || "Product"}
            </strong>
            <span className="meta-sub" style={{ fontWeight: 700, color: "#0284c7" }}>
              Requested Size: {reqItem.newSize || "N/A"}
            </span>
          </div>

          <div className="exchange-meta-item">
            <span>Exchange Quantity</span>
            <strong>{reqItem.quantity || 1} unit(s)</strong>
          </div>

          <div className="exchange-meta-item">
            <span>Exchange Reason</span>
            <strong>{order.exchangeRequest?.reason || "Not Specified"}</strong>
            {order.exchangeRequest?.details && (
              <span className="meta-sub">Note: {order.exchangeRequest.details}</span>
            )}
          </div>

          <div className="exchange-meta-item">
            <span>Pickup Address &amp; Contact</span>
            <strong>
              {order.shippingAddress?.houseBuilding}, {order.shippingAddress?.streetLocality},{" "}
              {order.shippingAddress?.cityState} - {order.shippingAddress?.pincode}
            </strong>
            <span className="meta-sub">
              Contact: {order.shippingAddress?.firstName} {order.shippingAddress?.lastName} (
              {order.shippingAddress?.mobile})
            </span>
          </div>

          {/* REPLACEMENT SHIPMENT LOGISTICS */}
          <div className="exchange-meta-item highlight-logistics">
            <span>Replacement Tracking Number</span>
            <strong>{replacementTrackingNum}</strong>
          </div>

          <div className="exchange-meta-item highlight-logistics">
            <span>Replacement Carrier</span>
            <strong>{replacementCarrier}</strong>
          </div>

          <div className="exchange-meta-item highlight-logistics">
            <span>Replacement Location</span>
            <strong>{replacementLocation}</strong>
          </div>

          <div className="exchange-meta-item highlight-logistics">
            <span>Expected Replacement Delivery</span>
            <strong style={{ color: "#16a34a" }}>{replacementETA}</strong>
          </div>

          {/* PAYMENT BEHAVIOR FOR EXCHANGE: KEEP EXISTING PAYMENT */}
          <div className="exchange-meta-item">
            <span>Payment Status</span>
            <div>
              {renderPaymentBadge(order)}
              {Number(order.exchangeRequest?.additionalPaymentRequired || 0) > 0 && (
                <span className="meta-sub" style={{ color: "#dc2626", display: "block", marginTop: "4px" }}>
                  Additional Payment Required: ₹{order.exchangeRequest.additionalPaymentRequired}
                </span>
              )}
            </div>
          </div>
        </div>
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
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Return Reason</th>
                    <th>Return Status</th>
                    <th>Payment Method</th>
                    <th>Payment Status</th>
                    <th>Request Date</th>
                    <th>Refund Amount</th>
                    <th>Actions</th>
                  </tr>
                ) : activeTab === "exchanges" ? (
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th>Current Size</th>
                    <th>Requested Size</th>
                    <th>Quantity</th>
                    <th>Exchange Status</th>
                    <th>Price Diff</th>
                    <th>Request Date</th>
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
                      colSpan={activeTab === "returns" ? "11" : activeTab === "exchanges" ? "10" : "7"}
                      className="empty-orders"
                    >
                      {search || statusFilter !== "all" || orderDate
                        ? "No orders match your filter criteria"
                        : "No orders found"}
                    </td>
                  </tr>
                ) : (
                  paginatedOrders.map((order) => {
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
                            {/* Product */}
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

                            {/* Quantity */}
                            <td>
                              <strong>
                                {order.returnRequest?.items?.reduce(
                                  (sum, i) => sum + (Number(i.quantity) || 1),
                                  0,
                                ) || 1}
                              </strong>
                            </td>

                            {/* Return Reason */}
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

                            {/* Payment Method */}
                            <td>
                              <span className={`table-pay-badge ${order.paymentMethod === "COD" ? "cod" : "stripe"}`}>
                                {order.paymentMethod === "COD" ? "COD" : "Online / Stripe"}
                              </span>
                            </td>

                            {/* Payment Status */}
                            <td>
                              <span className={`status-badge payment-${(order.paymentStatus || "pending").toLowerCase()}`}>
                                {order.paymentStatus || "Pending"}
                              </span>
                            </td>

                            {/* Request Date */}
                            <td>
                              <span className="table-date">
                                {order.returnRequest?.requestedAt
                                  ? new Date(order.returnRequest.requestedAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </span>
                            </td>

                            {/* Refund Amount */}
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
                              </div>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="table-action-group">
                                {getReturnNextAction(order) && (
                                  <button
                                    type="button"
                                    className={`btn-table-action ${getReturnNextAction(order).refund ? `refund ${order.paymentMethod === "COD" ? "cod" : "stripe"}` : "step"}`}
                                    disabled={getReturnNextAction(order).refund && processingRefundId === order._id}
                                    onClick={() => handleReturnNextAction(order)}
                                    title={getReturnNextAction(order).label}
                                  >
                                    {getReturnNextAction(order).refund && processingRefundId === order._id
                                      ? "Processing..."
                                      : getReturnNextAction(order).label}
                                  </button>
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

                            {/* Current Size */}
                            <td>
                              <span className="table-size-badge original">
                                {order.exchangeRequest?.items?.[0]?.originalSize || "-"}
                              </span>
                            </td>

                            {/* Requested Size */}
                            <td>
                              <span className="table-size-badge replacement">
                                {order.exchangeRequest?.items?.[0]?.newSize || "-"}
                              </span>
                            </td>

                            {/* Quantity */}
                            <td>
                              <strong>
                                {order.exchangeRequest?.items?.[0]?.quantity || 1}
                              </strong>
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

                            {/* Price Diff */}
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

                            {/* Request Date */}
                            <td>
                              <span className="table-date">
                                {order.exchangeRequest?.requestedAt
                                  ? new Date(order.exchangeRequest.requestedAt).toLocaleDateString("en-IN", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })
                                  : "-"}
                              </span>
                            </td>

                            {/* Actions */}
                            <td>
                              <div className="table-action-group">
                                {getExchangeNextAction(order) && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() => handleExchangeNextAction(order)}
                                    title={getExchangeNextAction(order).label}
                                  >
                                    {getExchangeNextAction(order).label}
                                  </button>
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

                            {/* Payment Status Column */}
                            <td>
                              {renderPaymentBadge(order)}
                            </td>

                            {/* Order Status — Read-only auto-updating badge */}
                            <td>
                              <span className={getStatusClass(order.orderStatus)}>
                                {getDisplayedOrderStatus(order)}
                              </span>
                            </td>

                            {/* Actions Column — only shows the NEXT step button, nothing when done */}
                            <td>
                              <div className="table-action-group">

                                {hasActiveReturn(order) && getReturnNextAction(order) && (
                                  <button
                                    type="button"
                                    className={`btn-table-action ${getReturnNextAction(order).refund ? `refund ${order.paymentMethod === "COD" ? "cod" : "stripe"}` : "step"}`}
                                    disabled={getReturnNextAction(order).refund && processingRefundId === order._id}
                                    onClick={() => handleReturnNextAction(order)}
                                    title={getReturnNextAction(order).label}
                                  >
                                    {getReturnNextAction(order).refund && processingRefundId === order._id
                                      ? "Processing..."
                                      : getReturnNextAction(order).label}
                                  </button>
                                )}

                                {!hasActiveReturn(order) && hasActiveExchange(order) && getExchangeNextAction(order) && (
                                  <button
                                    type="button"
                                    className="btn-table-action step"
                                    onClick={() => handleExchangeNextAction(order)}
                                    title={getExchangeNextAction(order).label}
                                  >
                                    {getExchangeNextAction(order).label}
                                  </button>
                                )}

                                {/* Delivery progression — each button disappears after its step is done */}
                                {!hasActiveReturn(order) &&
                                  !hasActiveExchange(order) &&
                                  order.orderStatus !== "cancelled" &&
                                  order.orderStatus !== "returned" &&
                                  order.orderStatus !== "delivered" && (
                                    <>
                                      {getOrderTrackingStatus(order) === "ORDER_PLACED" && (
                                        <button
                                          type="button"
                                          className="btn-table-action step ship"
                                          onClick={() => handleUpdateTrackingStep(order, "SHIPPED")}
                                          title="Mark order as Shipped"
                                        >
                                          Mark Shipped
                                        </button>
                                      )}

                                      {getOrderTrackingStatus(order) === "SHIPPED" && (
                                        <button
                                          type="button"
                                          className="btn-table-action step hub"
                                          onClick={() => handleUpdateTrackingStep(order, "REACHED_HUB")}
                                          title="Mark as Reached Hub"
                                        >
                                          Mark Hub
                                        </button>
                                      )}

                                      {getOrderTrackingStatus(order) === "REACHED_HUB" && (
                                        <button
                                          type="button"
                                          className="btn-table-action step out-delivery"
                                          onClick={() => handleUpdateTrackingStep(order, "OUT_FOR_DELIVERY")}
                                          title="Mark as Out for Delivery"
                                        >
                                          Out for Delivery
                                        </button>
                                      )}

                                      {getOrderTrackingStatus(order) === "OUT_FOR_DELIVERY" && (
                                        <button
                                          type="button"
                                          className="btn-table-action deliver"
                                          onClick={() => handleMarkAsDelivered(order)}
                                          title="Mark order as Delivered"
                                        >
                                          Mark Delivered
                                        </button>
                                      )}
                                    </>
                                  )}

                                {/* COD payment — disappears once paid */}
                                {order.paymentMethod === "COD" &&
                                  !hasActiveReturn(order) &&
                                  !hasActiveExchange(order) &&
                                  (order.paymentStatus || "").toLowerCase() === "pending" &&
                                  order.orderStatus !== "cancelled" && (
                                    <button
                                      type="button"
                                      className="btn-table-action cod-pay"
                                      onClick={() => handleMarkCodPaymentReceived(order)}
                                      title="Mark COD Payment Received"
                                    >
                                      Mark COD Received
                                    </button>
                                  )}

                                {/* View details — always visible */}
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
                  {selectedOrder.orderStatus === "cancelled"
                    ? "🔴 ORDER CANCELLED"
                    : (hasActiveReturn(selectedOrder) ||
                       hasActiveExchange(selectedOrder) ||
                       selectedOrder.orderStatus === "returned")
                    ? "DELIVERED"
                    : formatStatus(selectedOrder.orderStatus)}
                </span>
                {renderPaymentBadge(selectedOrder)}
              </div>
            </div>

            {/* =========================================================
                SECTION 1: ORIGINAL ORDER TRACKING
                ========================================================= */}
            <div className="order-detail-section tracking-section-container">
              <div className="section-title-with-badge">
                <h3>1. Original Order Delivery Tracking</h3>
                {selectedOrder.orderStatus === "cancelled" ? (
                  <span className="section-header-badge cancelled">Cancelled</span>
                ) : (hasActiveReturn(selectedOrder) ||
                     hasActiveExchange(selectedOrder) ||
                     selectedOrder.orderStatus === "returned" ||
                     selectedOrder.orderStatus === "delivered" ||
                     Boolean(selectedOrder.deliveredAt)) ? (
                  <span className="section-header-badge delivered">Delivered</span>
                ) : (
                  <span className="section-header-badge in-progress">In Progress</span>
                )}
              </div>
              {renderDeliveryTimeline(selectedOrder)}
              {renderDeliveryLogisticsCard(selectedOrder)}
            </div>

            {/* =========================================================
                SECTION 2: RETURN TRACKING (FOR RETURN ORDERS)
                ========================================================= */}
            {hasActiveReturn(selectedOrder) && (
              <div className="order-detail-section tracking-section-container return-tracking-section">
                <div className="section-title-with-badge">
                  <h3>2. Return Tracking</h3>
                  <span className="section-header-badge return-status-pill">
                    CURRENT STATUS: {formatReturnStatus(selectedOrder.returnStatus || selectedOrder.returnRequest?.status)}
                  </span>
                </div>
                {renderReturnTimeline(selectedOrder)}
                {renderReturnDetailsCard(selectedOrder)}
              </div>
            )}

            {/* =========================================================
                SECTION 2: EXCHANGE TRACKING (FOR EXCHANGE ORDERS)
                ========================================================= */}
            {hasActiveExchange(selectedOrder) && (
              <div className="order-detail-section tracking-section-container exchange-tracking-section">
                <div className="section-title-with-badge">
                  <h3>2. Exchange Tracking</h3>
                  <span className="section-header-badge exchange-status-pill">
                    CURRENT STATUS: {formatExchangeStatus(selectedOrder.exchangeStatus || selectedOrder.exchangeRequest?.status)}
                  </span>
                </div>
                {renderExchangeTimeline(selectedOrder)}
                {renderExchangeDetailsCard(selectedOrder)}
              </div>
            )}

            {/* DEDICATED REFUND CARD FOR CANCELLED ORDERS WITH REFUND */}
            {selectedOrder.orderStatus === "cancelled" &&
              selectedOrder.paymentStatus === "refunded" && (
                <div className="order-detail-section refund-summary-card">
                  <div className="refund-summary-header">
                    <MdCheckCircle className="refund-success-icon" />
                    <div>
                      <h4>Cancellation Refund Completed</h4>
                      <p>
                        This cancelled order has been refunded to the original payment method.
                      </p>
                    </div>
                  </div>

                  <div className="refund-meta-grid">
                    <div className="refund-meta-item">
                      <span>Refund ID</span>
                      <code>
                        {selectedOrder.stripeRefundId || "ONLINE-REFUND"}
                      </code>
                    </div>

                    <div className="refund-meta-item">
                      <span>Refund Amount</span>
                      <strong className="refund-amount-text">
                        ₹
                        {Number(
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
                          selectedOrder.refundedAt || selectedOrder.updatedAt,
                        )}
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
                    {getReturnNextAction(selectedOrder) && (
                      <button
                        type="button"
                        className={`btn-action-step ${getReturnNextAction(selectedOrder).refund ? `refund ${selectedOrder.paymentMethod === "COD" ? "cod" : "stripe"}` : "primary"}`}
                        disabled={getReturnNextAction(selectedOrder).refund && processingRefundId === selectedOrder._id}
                        onClick={() => handleReturnNextAction(selectedOrder)}
                      >
                        {getReturnNextAction(selectedOrder).refund && processingRefundId === selectedOrder._id
                          ? "Processing..."
                          : getReturnNextAction(selectedOrder).label}
                      </button>
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
                    {getExchangeNextAction(selectedOrder) && (
                      <button
                        type="button"
                        className="btn-action-step primary"
                        onClick={() => handleExchangeNextAction(selectedOrder)}
                      >
                        {getExchangeNextAction(selectedOrder).label}
                      </button>
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
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {renderPaymentBadge(selectedOrder)}
                  {selectedOrder.paymentMethod === "COD" &&
                    (selectedOrder.paymentStatus || "").toLowerCase() === "pending" &&
                    selectedOrder.orderStatus !== "cancelled" && (
                      <button
                        type="button"
                        className="btn-table-action cod-pay"
                        style={{ padding: "4px 10px", fontSize: "12px" }}
                        onClick={() => handleMarkCodPaymentReceived(selectedOrder)}
                      >
                        Mark COD Payment Received
                      </button>
                    )}
                </div>
              </div>

              {(selectedOrder.paymentReceivedAt || selectedOrder.paidAt) && (
                <div className="order-summary-row highlight-payment-date">
                  <span>Payment Received Date/Time</span>
                  <strong style={{ color: "#16a34a" }}>
                    {formatDateTime(selectedOrder.paymentReceivedAt || selectedOrder.paidAt)}
                  </strong>
                </div>
              )}

              {selectedOrder.deliveredAt && (
                <div className="order-summary-row highlight-delivered-date">
                  <span>Delivered Date/Time</span>
                  <strong style={{ color: "#16a34a" }}>
                    {formatDateTime(selectedOrder.deliveredAt)}
                  </strong>
                </div>
              )}

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
