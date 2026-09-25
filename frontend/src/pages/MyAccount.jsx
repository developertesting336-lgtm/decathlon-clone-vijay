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
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiX,
  FiCopy,
  FiCheck,
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

const formatDateTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
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

  // Tracking Modal State
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);
  const [trackingData, setTrackingData] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);
  const [copiedTracking, setCopiedTracking] = useState(false);

  const TRACKING_STEPS = [
    {
      key: "ORDER_PLACED",
      label: "Order Placed",
      desc: "Your order has been placed and confirmed.",
    },
    {
      key: "SHIPPED",
      label: "Shipped",
      desc: "Package dispatched from Decathlon fulfillment hub.",
    },
    {
      key: "REACHED_HUB",
      label: "Reached Hub",
      desc: "Package arrived at regional distribution center.",
    },
    {
      key: "OUT_FOR_DELIVERY",
      label: "Out For Delivery",
      desc: "Delivery executive is on the way to your address.",
    },
    {
      key: "DELIVERED",
      label: "Delivered",
      desc: "Package handed over and delivered successfully.",
    },
  ];

  const RETURN_CUSTOMER_STEPS = [
    {
      key: "ORDER_DELIVERED",
      label: "Order Delivered",
      desc: "Original item was delivered to your address.",
    },
    {
      key: "REQUESTED",
      label: "Return Requested",
      desc: "Return request submitted and under verification.",
    },
    {
      key: "APPROVED",
      label: "Return Approved",
      desc: "Decathlon support approved your return request.",
    },
    {
      key: "PICKUP_SCHEDULED",
      label: "Pickup Scheduled",
      desc: "Logistics courier partner scheduled to collect item.",
    },
    {
      key: "PICKED_UP",
      label: "Picked Up",
      desc: "Return parcel handed over to courier executive.",
    },
    {
      key: "RETURN_RECEIVED",
      label: "Return Received",
      desc: "Package safely arrived at Decathlon hub for quality check.",
    },
    {
      key: "REFUND_PROCESSING",
      label: "Refund Processing",
      desc: "Quality inspection passed. Refund is being processed.",
    },
    {
      key: "REFUNDED",
      label: "Refunded",
      desc: "Refund completed successfully to your account.",
    },
  ];

  const EXCHANGE_CUSTOMER_STEPS = [
    {
      key: "ORDER_DELIVERED",
      label: "Order Delivered",
      desc: "Original item was delivered to your address.",
    },
    {
      key: "REQUESTED",
      label: "Exchange Requested",
      desc: "Replacement size request submitted and under review.",
    },
    {
      key: "APPROVED",
      label: "Exchange Approved",
      desc: "Exchange request approved by Decathlon.",
    },
    {
      key: "PICKUP_SCHEDULED",
      label: "Pickup Scheduled",
      desc: "Courier scheduled to pick up the original item.",
    },
    {
      key: "PICKED_UP",
      label: "Picked Up",
      desc: "Original product collected from your address.",
    },
    {
      key: "RECEIVED",
      label: "Product Received",
      desc: "Original product received and verified at warehouse.",
    },
    {
      key: "SHIPPED",
      label: "Replacement Shipped",
      desc: "Replacement item packed and dispatched to you.",
    },
    {
      key: "DELIVERED",
      label: "Replacement Delivered",
      desc: "Replacement product delivered successfully.",
    },
  ];

  const getCustomerStepIndex = (status) => {
    const norm = (status || "").toUpperCase();
    if (norm === "DELIVERED") return 4;
    if (norm === "OUT_FOR_DELIVERY") return 3;
    if (norm === "REACHED_HUB") return 2;
    if (norm === "SHIPPED") return 1;
    return 0;
  };

  const getReturnCustomerStepIndex = (status) => {
    const norm = (status || "").toUpperCase();
    const map = {
      ORDER_DELIVERED: 0,
      REQUESTED: 1,
      APPROVED: 2,
      PICKUP_SCHEDULED: 3,
      PICKED_UP: 4,
      RETURN_RECEIVED: 5,
      REFUND_PROCESSING: 6,
      REFUNDED: 7,
    };
    return map[norm] !== undefined ? map[norm] : 1;
  };

  const getExchangeCustomerStepIndex = (status) => {
    const norm = (status || "").toUpperCase();
    const map = {
      ORDER_DELIVERED: 0,
      REQUESTED: 1,
      APPROVED: 2,
      PICKUP_SCHEDULED: 3,
      PICKED_UP: 4,
      RECEIVED: 5,
      SHIPPED: 6,
      DELIVERED: 7,
    };
    return map[norm] !== undefined ? map[norm] : 1;
  };

  const getCustomerStepTimestamp = (stepKey, history, order) => {
    if (stepKey === "ORDER_PLACED") {
      const match = (history || []).find(
        (h) => (h.status || "").toUpperCase() === "ORDER_PLACED"
      );
      return match?.timestamp || order?.createdAt;
    }
    if (stepKey === "DELIVERED") {
      const match = (history || []).find(
        (h) => (h.status || "").toUpperCase() === "DELIVERED"
      );
      return match?.timestamp || order?.deliveredAt;
    }
    const match = (history || []).find(
      (h) => (h.status || "").toUpperCase() === stepKey
    );
    return match?.timestamp;
  };

  const getReturnCustomerStepTimestamp = (stepKey, returnReq, history, order) => {
    if (stepKey === "ORDER_DELIVERED") {
      const match = (history || []).find(
        (h) => (h.status || "").toUpperCase() === "DELIVERED"
      );
      return match?.timestamp || order?.deliveredAt;
    }
    if (stepKey === "REQUESTED") {
      return returnReq?.requestedAt || returnReq?.createdAt;
    }
    if (stepKey === "APPROVED") {
      return returnReq?.approvedAt;
    }
    if (stepKey === "PICKUP_SCHEDULED") {
      return returnReq?.pickupDate || returnReq?.pickupScheduledAt;
    }
    if (stepKey === "PICKED_UP") {
      return returnReq?.pickedUpAt;
    }
    if (stepKey === "RETURN_RECEIVED") {
      return returnReq?.receivedAt;
    }
    if (stepKey === "REFUND_PROCESSING") {
      return (
        returnReq?.refundProcessingAt ||
        (returnReq?.status === "REFUND_PROCESSING" ? returnReq?.updatedAt : null)
      );
    }
    if (stepKey === "REFUNDED") {
      return returnReq?.refundedAt || order?.refundedAt;
    }
    return null;
  };

  const getExchangeCustomerStepTimestamp = (stepKey, exchangeReq, history, order) => {
    if (stepKey === "ORDER_DELIVERED") {
      const match = (history || []).find(
        (h) => (h.status || "").toUpperCase() === "DELIVERED"
      );
      return match?.timestamp || order?.deliveredAt;
    }
    if (stepKey === "REQUESTED") {
      return exchangeReq?.requestedAt || exchangeReq?.createdAt;
    }
    if (stepKey === "APPROVED") {
      return exchangeReq?.approvedAt;
    }
    if (stepKey === "PICKUP_SCHEDULED") {
      return exchangeReq?.pickupDate || exchangeReq?.pickupScheduledAt;
    }
    if (stepKey === "PICKED_UP") {
      return exchangeReq?.pickedUpAt;
    }
    if (stepKey === "RECEIVED") {
      return exchangeReq?.receivedAt;
    }
    if (stepKey === "SHIPPED") {
      return exchangeReq?.shippedAt;
    }
    if (stepKey === "DELIVERED") {
      return exchangeReq?.replacementDeliveredAt || exchangeReq?.deliveredAt;
    }
    return null;
  };

  const formatReturnStatusText = (status) => {
    const map = {
      REQUESTED: "Return Requested",
      APPROVED: "Return Approved",
      PICKUP_SCHEDULED: "Pickup Scheduled",
      PICKED_UP: "Item Picked Up",
      RETURN_RECEIVED: "Return Received",
      REFUND_PROCESSING: "Refund Processing",
      REFUNDED: "Refunded",
      REJECTED: "Return Rejected",
    };
    return (
      map[(status || "").toUpperCase()] ||
      (status || "Return In Progress").replace(/_/g, " ")
    );
  };

  const formatExchangeStatusText = (status) => {
    const map = {
      REQUESTED: "Exchange Requested",
      APPROVED: "Exchange Approved",
      PICKUP_SCHEDULED: "Pickup Scheduled",
      PICKED_UP: "Item Picked Up",
      RECEIVED: "Product Received",
      SHIPPED: "Replacement Shipped",
      DELIVERED: "Replacement Delivered",
      REJECTED: "Exchange Rejected",
    };
    return (
      map[(status || "").toUpperCase()] ||
      (status || "Exchange In Progress").replace(/_/g, " ")
    );
  };

  const handleOpenTrackingModal = async (order) => {
    setTrackingModalOrder(order);
    setLoadingTracking(true);
    setCopiedTracking(false);
    try {
      const res = await api.get(`/orders/${order._id}/tracking`, getAuthConfig());
      if (res.data) {
        const t = res.data.tracking || res.data;
        const isCancelled =
          Boolean(t.isCancelled) ||
          (t.orderStatus || order.orderStatus || "").toLowerCase() === "cancelled" ||
          (t.status || "").toUpperCase() === "CANCELLED";

        setTrackingData({
          orderId: order._id,
          ...t,
          isCancelled,
          status: isCancelled
            ? "CANCELLED"
            : t.status || (order.orderStatus === "delivered" ? "DELIVERED" : order.orderStatus),
          history: t.trackingHistory || t.history || order.trackingHistory || [],
          orderStatus: t.orderStatus || order.orderStatus,
          paymentStatus: t.paymentStatus || order.paymentStatus,
          paymentMethod: t.paymentMethod || order.paymentMethod,
          returnStatus: t.returnStatus || order.returnStatus || order.returnRequest?.status || "NONE",
          returnRequest: t.returnRequest || order.returnRequest || null,
          exchangeStatus: t.exchangeStatus || order.exchangeStatus || order.exchangeRequest?.status || "NONE",
          exchangeRequest: t.exchangeRequest || order.exchangeRequest || null,
          deliveredAt: isCancelled ? null : (t.deliveredAt || order.deliveredAt),
          cancelledAt: t.cancelledAt || order.cancelledAt || (isCancelled ? order.updatedAt : null),
          cancellationReason:
            t.cancellationReason || order.cancellationReason || (isCancelled ? "Order cancelled" : ""),
          paymentReceivedAt: t.paymentReceivedAt || order.paymentReceivedAt,
          shippingAddress: order.shippingAddress,
          orderItems: order.orderItems,
        });
      }
    } catch (err) {
      console.error("Failed to fetch tracking data:", err);
      const isCancelled = (order.orderStatus || "").toLowerCase() === "cancelled";
      setTrackingData({
        orderId: order._id,
        trackingNumber:
          order.tracking?.trackingNumber ||
          order.trackingNumber ||
          `TRK-${order._id.slice(-8).toUpperCase()}`,
        carrier: order.tracking?.carrier || order.carrier || "Decathlon Demo Logistics",
        status: isCancelled
          ? "CANCELLED"
          : order.tracking?.status ||
            (order.orderStatus === "delivered" ? "DELIVERED" : "ORDER_PLACED"),
        isCancelled,
        currentLocation: isCancelled
          ? { city: "Not Applicable" }
          : order.tracking?.currentLocation || order.currentLocation,
        estimatedDelivery: isCancelled
          ? null
          : order.tracking?.estimatedDelivery || order.estimatedDeliveryDate,
        deliveredAt: isCancelled ? null : order.deliveredAt,
        cancelledAt: order.cancelledAt || (isCancelled ? order.updatedAt : null),
        cancellationReason:
          order.cancellationReason || (isCancelled ? "Order cancelled" : ""),
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        returnStatus: order.returnStatus || order.returnRequest?.status || "NONE",
        returnRequest: order.returnRequest || null,
        exchangeStatus: order.exchangeStatus || order.exchangeRequest?.status || "NONE",
        exchangeRequest: order.exchangeRequest || null,
        paymentReceivedAt: order.paymentReceivedAt,
        history: order.tracking?.history || order.trackingHistory || [],
        shippingAddress: order.shippingAddress,
        orderItems: order.orderItems,
      });
    } finally {
      setLoadingTracking(false);
    }
  };

  const handleCloseTrackingModal = () => {
    setTrackingModalOrder(null);
    setTrackingData(null);
  };

  const handleCopyTrackingNumber = (trkNum) => {
    if (!trkNum) return;
    navigator.clipboard.writeText(trkNum);
    setCopiedTracking(true);
    toast.success("Tracking number copied to clipboard!");
    setTimeout(() => setCopiedTracking(false), 2500);
  };

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
    if (!order || (order.orderStatus || "").toLowerCase() !== "delivered") return false;
    if (!isOrderDeliveredWithinWindow(order)) return false;
    const hasActiveReturn =
      order.returnStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.returnStatus);
    const hasActiveExchange =
      order.exchangeStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.exchangeStatus);
    return !hasActiveReturn && !hasActiveExchange;
  };

  const isOrderExchangeEligible = (order) => {
    if (!order || (order.orderStatus || "").toLowerCase() !== "delivered") return false;
    if (!isOrderDeliveredWithinWindow(order)) return false;
    const hasActiveReturn =
      order.returnStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.returnStatus);
    const hasActiveExchange =
      order.exchangeStatus &&
      !["NONE", "REJECTED", "CANCELLED"].includes(order.exchangeStatus);
    return !hasActiveExchange && !hasActiveReturn;
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

    const handleTrackingUpdate = (payload) => {
      if (!payload || !payload.orderId) return;

      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          if (o._id === payload.orderId) {
            const isDelivered = payload.status === "DELIVERED";
            return {
              ...o,
              orderStatus: isDelivered ? "delivered" : o.orderStatus,
              deliveredAt: isDelivered ? payload.timestamp || new Date() : o.deliveredAt,
              tracking: {
                ...o.tracking,
                status: payload.status,
                trackingNumber: payload.trackingNumber || o.tracking?.trackingNumber,
                currentLocation: payload.currentLocation || o.tracking?.currentLocation,
                history: payload.history || o.tracking?.history,
              },
            };
          }
          return o;
        })
      );

      setTrackingData((prev) => {
        if (!prev) return prev;
        const currentId = prev.orderId || prev._id;
        if (currentId === payload.orderId) {
          const isDelivered = payload.status === "DELIVERED";
          const newHistory =
            payload.history ||
            (prev.history
              ? [
                  ...prev.history,
                  {
                    status: payload.status,
                    timestamp: payload.timestamp || new Date().toISOString(),
                    location: payload.currentLocation,
                    description:
                      payload.description || `Status updated to ${payload.status}`,
                  },
                ]
              : []);

          return {
            ...prev,
            status: payload.status,
            orderStatus: isDelivered ? "delivered" : prev.orderStatus,
            deliveredAt: isDelivered
              ? payload.timestamp || new Date().toISOString()
              : prev.deliveredAt,
            currentLocation: payload.currentLocation || prev.currentLocation,
            trackingNumber: payload.trackingNumber || prev.trackingNumber,
            history: newHistory,
          };
        }
        return prev;
      });
    };

    const handlePaymentUpdate = (payload) => {
      if (!payload || !payload.orderId) return;

      setOrders((prevOrders) =>
        prevOrders.map((o) => {
          if (o._id === payload.orderId) {
            return {
              ...o,
              paymentStatus: payload.paymentStatus,
              paymentReceivedAt: payload.timestamp || new Date(),
              paidAt: payload.timestamp || new Date(),
            };
          }
          return o;
        })
      );

      setTrackingData((prev) => {
        if (!prev) return prev;
        const currentId = prev.orderId || prev._id;
        if (currentId === payload.orderId) {
          return {
            ...prev,
            paymentStatus: payload.paymentStatus,
            paymentReceivedAt: payload.timestamp || new Date().toISOString(),
          };
        }
        return prev;
      });
    };

    socket.on("order_updated", handleOrderUpdate);
    socket.on("order_tracking_updated", handleTrackingUpdate);
    socket.on("payment_status_updated", handlePaymentUpdate);

    return () => {
      socket.off("order_updated", handleOrderUpdate);
      socket.off("order_tracking_updated", handleTrackingUpdate);
      socket.off("payment_status_updated", handlePaymentUpdate);
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
                                  <span className="payment-badge refunded">REFUNDED</span>
                                ) : order.paymentStatus?.toLowerCase() === "paid" ? (
                                  <span className="payment-badge paid">
                                    {order.paymentMethod === "COD" ? "PAID (COD)" : "Paid"}
                                  </span>
                                ) : (
                                  <span className="payment-badge pending">
                                    {order.paymentMethod === "COD" ? "PENDING (COD)" : "Pending"}
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
                                  {order.paymentMethod === "COD"
                                    ? order.paymentStatus === "paid"
                                      ? "PAID (COD)"
                                      : "PENDING (COD)"
                                    : order.paymentStatus === "paid"
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
                            <button
                              type="button"
                              className="btn-order-action btn-track"
                              onClick={() => handleOpenTrackingModal(order)}
                              title="Track Delivery Status"
                            >
                              <FiTruck /> Track Order
                            </button>

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
      {/* CUSTOMER TRACKING MODAL */}
      {trackingModalOrder && (
        <div
          className="decathlon-tracking-modal-overlay"
          onClick={handleCloseTrackingModal}
        >
          <div
            className="decathlon-tracking-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tracking-modal-header">
              <div className="tracking-modal-title-group">
                <div className="tracking-header-badge">
                  <FiTruck className="tracking-header-icon" /> Live Order Tracking
                </div>
                <h3 className="tracking-modal-title">
                  Order #{trackingModalOrder._id.slice(-8).toUpperCase()}
                </h3>
                <span className="tracking-modal-subtitle">
                  Placed on {formatDateTime(trackingModalOrder.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="btn-tracking-modal-close"
                onClick={handleCloseTrackingModal}
                title="Close modal"
              >
                <FiX />
              </button>
            </div>

            {loadingTracking ? (
              <div className="tracking-modal-loading">
                <div className="tracking-spinner"></div>
                <p>Fetching real-time tracking information...</p>
              </div>
            ) : (
              <div className="tracking-modal-body">
                {/* 1. Overview Card */}
                {(() => {
                  const isOrderCancelled =
                    Boolean(trackingData?.isCancelled) ||
                    (trackingData?.orderStatus || trackingModalOrder?.orderStatus || "").toLowerCase() === "cancelled" ||
                    (trackingData?.status || "").toUpperCase() === "CANCELLED";

                  const retStatus = (
                    trackingData?.returnStatus ||
                    trackingModalOrder?.returnStatus ||
                    trackingModalOrder?.returnRequest?.status ||
                    "NONE"
                  ).toUpperCase();
                  const hasActiveReturn = retStatus !== "NONE" && retStatus !== "";
                  const returnReq =
                    trackingData?.returnRequest || trackingModalOrder?.returnRequest;

                  const exchStatus = (
                    trackingData?.exchangeStatus ||
                    trackingModalOrder?.exchangeStatus ||
                    trackingModalOrder?.exchangeRequest?.status ||
                    "NONE"
                  ).toUpperCase();
                  const hasActiveExchange = exchStatus !== "NONE" && exchStatus !== "";
                  const exchangeReq =
                    trackingData?.exchangeRequest || trackingModalOrder?.exchangeRequest;

                  const isDelivered =
                    (trackingData?.status || trackingModalOrder?.orderStatus || "").toUpperCase() ===
                      "DELIVERED" ||
                    hasActiveReturn ||
                    hasActiveExchange;

                  const method =
                    trackingData?.paymentMethod || trackingModalOrder.paymentMethod;
                  const payStatus = (
                    trackingData?.paymentStatus ||
                    trackingModalOrder.paymentStatus ||
                    ""
                  ).toLowerCase();

                  return (
                    <>
                      <div className="tracking-summary-card">
                        <div className="tracking-summary-top">
                          <div className="summary-status-col">
                            <span className="summary-label">Current Tracking Status</span>
                            <div className="summary-status-badge-row">
                              {isOrderCancelled ? (
                                <span className="customer-tracking-pill cancelled">
                                  <span className="cancelled-indicator"></span> ORDER CANCELLED
                                </span>
                              ) : hasActiveReturn ? (
                                <span className="customer-tracking-pill return-pill">
                                  <span className="pulse-indicator orange"></span>
                                  {formatReturnStatusText(retStatus).toUpperCase()}
                                </span>
                              ) : hasActiveExchange ? (
                                <span className="customer-tracking-pill exchange-pill">
                                  <span className="pulse-indicator blue"></span>
                                  {formatExchangeStatusText(exchStatus).toUpperCase()}
                                </span>
                              ) : (
                                <span
                                  className={`customer-tracking-pill ${(
                                    trackingData?.status ||
                                    trackingModalOrder.orderStatus ||
                                    ""
                                  ).toLowerCase()}`}
                                >
                                  <span className="pulse-indicator"></span>
                                  {(
                                    trackingData?.status ||
                                    trackingModalOrder.orderStatus ||
                                    "ORDER_PLACED"
                                  ).replace(/_/g, " ")}
                                </span>
                              )}

                              {/* Separate Payment Badge */}
                              {(() => {
                                if (hasActiveReturn) {
                                  if (method === "COD") {
                                    if (payStatus === "refunded" || retStatus === "REFUNDED") {
                                      return (
                                        <span className="customer-payment-pill refunded">
                                          Payment: REFUNDED (COD)
                                        </span>
                                      );
                                    }
                                    if (
                                      retStatus === "RETURN_RECEIVED" ||
                                      retStatus === "REFUND_PROCESSING" ||
                                      retStatus === "PICKED_UP"
                                    ) {
                                      return (
                                        <span className="customer-payment-pill pending">
                                          Payment: COD REFUND PENDING
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="customer-payment-pill pending">
                                        Payment: COD REFUND PENDING
                                      </span>
                                    );
                                  } else {
                                    if (payStatus === "refunded" || retStatus === "REFUNDED") {
                                      return (
                                        <span className="customer-payment-pill refunded">
                                          Payment: REFUNDED
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="customer-payment-pill pending">
                                        Payment: REFUND PROCESSING
                                      </span>
                                    );
                                  }
                                }

                                if (hasActiveExchange) {
                                  if (method === "COD") {
                                    return (
                                      <span
                                        className={`customer-payment-pill ${
                                          payStatus === "paid" ? "paid" : "pending"
                                        }`}
                                      >
                                        Payment: {payStatus === "paid" ? "PAID (COD)" : "PENDING (COD)"}
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="customer-payment-pill paid">
                                      Payment: PAID (Online)
                                    </span>
                                  );
                                }

                                if (isOrderCancelled) {
                                  if (payStatus === "refunded") {
                                    return (
                                      <span className="customer-payment-pill refunded">
                                        Payment: REFUNDED
                                      </span>
                                    );
                                  }
                                  if (method === "COD") {
                                    return (
                                      <span className="customer-payment-pill cancelled">
                                        Payment: NOT CHARGED
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="customer-payment-pill pending">
                                      Payment: REFUND IN PROGRESS
                                    </span>
                                  );
                                }

                                if (payStatus === "refunded") {
                                  return (
                                    <span className="customer-payment-pill refunded">
                                      Payment: REFUNDED
                                    </span>
                                  );
                                }
                                if (method === "COD") {
                                  if (payStatus === "paid") {
                                    return (
                                      <span className="customer-payment-pill paid">
                                        Payment: PAID (COD)
                                      </span>
                                    );
                                  }
                                  return (
                                    <span className="customer-payment-pill pending">
                                      Payment: PENDING (COD)
                                    </span>
                                  );
                                }
                                if (payStatus === "paid") {
                                  return (
                                    <span className="customer-payment-pill paid">
                                      Payment: Paid
                                    </span>
                                  );
                                }
                                if (payStatus === "failed") {
                                  return (
                                    <span className="customer-payment-pill failed">
                                      Payment: Failed
                                    </span>
                                  );
                                }
                                return (
                                  <span className="customer-payment-pill pending">
                                    Payment: Pending
                                  </span>
                                );
                              })()}
                            </div>
                          </div>

                          <div className="summary-tracking-num-col">
                            <span className="summary-label">Tracking Number</span>
                            <div className="tracking-num-copy-row">
                              <span className="tracking-number-text">
                                {trackingData?.trackingNumber ||
                                  `TRK-${trackingModalOrder._id.slice(-8).toUpperCase()}`}
                              </span>
                              <button
                                type="button"
                                className="btn-copy-tracking"
                                onClick={() =>
                                  handleCopyTrackingNumber(
                                    trackingData?.trackingNumber ||
                                      `TRK-${trackingModalOrder._id.slice(-8).toUpperCase()}`
                                  )
                                }
                                title="Copy tracking number"
                              >
                                {copiedTracking ? <FiCheck /> : <FiCopy />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="tracking-summary-grid">
                          <div className="summary-grid-item">
                            <span className="grid-item-label">Carrier Partner</span>
                            <span className="grid-item-value">
                              {hasActiveExchange && exchangeReq?.replacementCarrier
                                ? exchangeReq.replacementCarrier
                                : trackingData?.carrier || "Decathlon Demo Logistics"}
                            </span>
                          </div>

                          <div className="summary-grid-item">
                            <span className="grid-item-label">Current Location</span>
                            <span className="grid-item-value location">
                              <FiMapPin className="grid-location-icon" />
                              {isOrderCancelled
                                ? "Not Applicable"
                                : hasActiveExchange && exchangeReq?.replacementLocation
                                ? exchangeReq.replacementLocation
                                : hasActiveReturn &&
                                  (retStatus === "PICKED_UP" || retStatus === "RETURN_RECEIVED")
                                ? "Decathlon Returns Hub"
                                : trackingData?.currentLocation?.city
                                ? `${trackingData.currentLocation.city}${
                                    trackingData.currentLocation.latitude
                                      ? ` (${trackingData.currentLocation.latitude.toFixed(
                                          4
                                        )}, ${trackingData.currentLocation.longitude.toFixed(
                                          4
                                        )})`
                                      : ""
                                  }`
                                : "Decathlon Central Logistics Hub"}
                            </span>
                          </div>

                          <div className="summary-grid-item">
                            <span className="grid-item-label">Estimated Delivery</span>
                            <span className="grid-item-value">
                              {isOrderCancelled
                                ? "Not Applicable"
                                : hasActiveReturn
                                ? "Not Applicable (Order Delivered)"
                                : hasActiveExchange
                                ? exchangeReq?.estimatedReplacementDeliveryDate
                                  ? `Replacement ETA: ${formatDate(
                                      exchangeReq.estimatedReplacementDeliveryDate
                                    )}`
                                  : "3-5 business days (Replacement)"
                                : isDelivered
                                ? "Not Applicable (Order Delivered)"
                                : trackingData?.estimatedDelivery
                                ? formatDate(trackingData.estimatedDelivery)
                                : "Within 2-3 business days"}
                            </span>
                          </div>

                          <div className="summary-grid-item">
                            <span className="grid-item-label">Delivered Date &amp; Time</span>
                            <span
                              className={`grid-item-value ${
                                !isOrderCancelled && (isDelivered || trackingData?.deliveredAt)
                                  ? "delivered-highlight"
                                  : isOrderCancelled
                                  ? "cancelled-highlight"
                                  : ""
                              }`}
                            >
                              {isOrderCancelled
                                ? "Not Delivered"
                                : isDelivered || trackingData?.deliveredAt
                                ? formatDateTime(
                                    trackingData?.deliveredAt ||
                                      trackingModalOrder.deliveredAt ||
                                      trackingModalOrder.updatedAt
                                  )
                                : "Pending Delivery"}
                            </span>
                          </div>

                          {trackingData?.paymentMethod === "COD" && (
                            <div className="summary-grid-item">
                              <span className="grid-item-label">COD Payment Status</span>
                              <span
                                className={`grid-item-value ${
                                  trackingData?.paymentStatus === "paid" ||
                                  payStatus === "refunded"
                                    ? "paid-highlight"
                                    : isOrderCancelled
                                    ? "cancelled-highlight"
                                    : ""
                                }`}
                              >
                                {hasActiveReturn
                                  ? payStatus === "refunded" || retStatus === "REFUNDED"
                                    ? "Refund Completed (COD)"
                                    : "COD Refund Pending (To be paid upon return inspection)"
                                  : trackingData?.paymentStatus === "paid" &&
                                    (trackingData?.paymentReceivedAt || trackingData?.paidAt)
                                  ? `Payment Received (${formatDateTime(
                                      trackingData.paymentReceivedAt || trackingData.paidAt
                                    )})`
                                  : isOrderCancelled
                                  ? "Payment Not Charged (Cancelled)"
                                  : "Payment Pending (To be paid upon delivery)"}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 1. SECTION 1: Original Order Delivery Tracking */}
                      <div className="tracking-section-container original-delivery-section">
                        <div className="section-title-with-badge">
                          <h4 className="tracking-section-title">
                            1. Original Order Delivery Tracking
                          </h4>
                          {isOrderCancelled ? (
                            <span className="section-header-badge cancelled">ORDER CANCELLED</span>
                          ) : hasActiveReturn || hasActiveExchange || isDelivered ? (
                            <span className="section-header-badge delivered">
                              DELIVERED (COMPLETED)
                            </span>
                          ) : (
                            <span className="section-header-badge in-progress">
                              ACTIVE DELIVERY
                            </span>
                          )}
                        </div>

                        {isOrderCancelled ? (
                          /* Cancelled Order Flow: ONLY Order Placed -> Order Cancelled */
                          <div className="customer-stepper cancelled-stepper">
                            {/* Step 1: Order Placed */}
                            <div className="customer-step-node completed">
                              <div className="step-node-indicator">
                                <div className="node-circle completed">
                                  <FiCheck className="node-icon" />
                                </div>
                                <div className="node-connector filled error-connector"></div>
                              </div>

                              <div className="step-node-content">
                                <div className="step-node-header">
                                  <span className="step-node-label">Order Placed</span>
                                  <span className="step-node-time">
                                    <FiClock className="step-clock-icon" />{" "}
                                    {formatDateTime(trackingModalOrder.createdAt)}
                                  </span>
                                </div>
                                <p className="step-node-desc">
                                  Your order was placed and confirmed.
                                </p>
                              </div>
                            </div>

                            {/* Step 2: Order Cancelled */}
                            <div className="customer-step-node cancelled">
                              <div className="step-node-indicator">
                                <div className="node-circle cancelled-node">
                                  <FiX className="node-icon cancelled-icon" />
                                </div>
                              </div>

                              <div className="step-node-content">
                                <div className="step-node-header">
                                  <span className="step-node-label cancelled-label">
                                    Order Cancelled
                                  </span>
                                  {(trackingData?.cancelledAt ||
                                    trackingModalOrder.cancelledAt ||
                                    trackingModalOrder.updatedAt) && (
                                    <span className="step-node-time cancelled-time">
                                      <FiClock className="step-clock-icon" />{" "}
                                      {formatDateTime(
                                        trackingData?.cancelledAt ||
                                          trackingModalOrder.cancelledAt ||
                                          trackingModalOrder.updatedAt
                                      )}
                                    </span>
                                  )}
                                </div>
                                <p className="step-node-desc cancelled-desc">
                                  {trackingData?.cancellationReason ||
                                    trackingModalOrder.cancellationReason ||
                                    "Your order has been cancelled and will not be delivered."}
                                </p>
                                {(trackingData?.paymentStatus === "refunded" ||
                                  trackingModalOrder.paymentStatus === "refunded") && (
                                  <div className="cancelled-refund-badge-note">
                                    ✓ Full refund has been initiated to your original payment method.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Normal 5-Step Delivery Flow */
                          <>
                            <div className="customer-stepper">
                              {TRACKING_STEPS.map((step, idx) => {
                                const currentIdx =
                                  hasActiveReturn || hasActiveExchange || isDelivered
                                    ? 4
                                    : getCustomerStepIndex(
                                        trackingData?.status || trackingModalOrder.orderStatus
                                      );
                                const isCompleted = idx < currentIdx || (idx === 4 && (hasActiveReturn || hasActiveExchange || isDelivered));
                                const isCurrent =
                                  idx === currentIdx &&
                                  !(hasActiveReturn || hasActiveExchange || isDelivered);
                                const stepTime = getCustomerStepTimestamp(
                                  step.key,
                                  trackingData?.history,
                                  trackingModalOrder
                                );

                                return (
                                  <div
                                    key={step.key}
                                    className={`customer-step-node ${
                                      isCompleted
                                        ? "completed"
                                        : isCurrent
                                        ? "current"
                                        : "upcoming"
                                    }`}
                                  >
                                    <div className="step-node-indicator">
                                      <div className="node-circle">
                                        {isCompleted ? (
                                          <FiCheck className="node-icon" />
                                        ) : (
                                          <span className="node-num">{idx + 1}</span>
                                        )}
                                      </div>
                                      {idx < TRACKING_STEPS.length - 1 && (
                                        <div
                                          className={`node-connector ${
                                            idx < currentIdx || (hasActiveReturn || hasActiveExchange || isDelivered)
                                              ? "filled"
                                              : ""
                                          }`}
                                        ></div>
                                      )}
                                    </div>

                                    <div className="step-node-content">
                                      <div className="step-node-header">
                                        <span className="step-node-label">{step.label}</span>
                                        {stepTime && (
                                          <span className="step-node-time">
                                            <FiClock className="step-clock-icon" />{" "}
                                            {formatDateTime(stepTime)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="step-node-desc">{step.desc}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {(hasActiveReturn || hasActiveExchange) && (
                              <div className="delivery-preserved-note">
                                <FiCheckCircle className="preserved-check-icon" />
                                <span>
                                  Original order was delivered successfully on{" "}
                                  <strong>
                                    {formatDateTime(
                                      trackingData?.deliveredAt ||
                                        trackingModalOrder.deliveredAt ||
                                        trackingModalOrder.updatedAt
                                    )}
                                  </strong>
                                  . Delivery history is preserved.
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* 2. SECTION 2: Return Tracking (when return active) */}
                      {hasActiveReturn && (
                        <div className="tracking-section-container return-tracking-section">
                          <div className="section-title-with-badge">
                            <h4 className="tracking-section-title">2. Return Tracking</h4>
                            <span className="section-header-badge return">
                              CURRENT STATUS: {formatReturnStatusText(retStatus).toUpperCase()}
                            </span>
                          </div>

                          {/* Prominent Return Banner */}
                          <div className="return-prominent-banner">
                            <div className="banner-top-row">
                              <div>
                                <span className="banner-label">CURRENT RETURN STATUS</span>
                                <h3 className="banner-status-title">
                                  {formatReturnStatusText(retStatus)}
                                </h3>
                              </div>
                              <div className="banner-payment-col">
                                <span className="banner-label">PAYMENT / REFUND STATUS</span>
                                <span className={`banner-payment-pill ${retStatus === "REFUNDED" || payStatus === "refunded" ? "refunded" : "processing"}`}>
                                  {method === "COD"
                                    ? retStatus === "REFUNDED" || payStatus === "refunded"
                                      ? "REFUNDED (COD Cash/Bank Payout)"
                                      : "COD REFUND PENDING"
                                    : retStatus === "REFUNDED" || payStatus === "refunded"
                                    ? "REFUNDED"
                                    : "REFUND PROCESSING"}
                                </span>
                              </div>
                            </div>
                            <div className="banner-meta-row">
                              <span><strong>Reason:</strong> {returnReq?.reason || "Product Return"}</span>
                              {returnReq?.details && <span><strong>Notes:</strong> {returnReq.details}</span>}
                              {returnReq?.refundAmount && (
                                <span><strong>Refund Amount:</strong> {formatPrice(returnReq.refundAmount)}</span>
                              )}
                            </div>
                          </div>

                          {/* 8-Step Return Timeline Stepper */}
                          <div className="customer-stepper return-customer-stepper">
                            {RETURN_CUSTOMER_STEPS.map((step, idx) => {
                              const retCurrentIdx = getReturnCustomerStepIndex(retStatus);
                              const isCompleted = idx < retCurrentIdx || (idx === 7 && (retStatus === "REFUNDED" || payStatus === "refunded"));
                              const isCurrent = idx === retCurrentIdx && !(retStatus === "REFUNDED" || payStatus === "refunded");
                              const stepTime = getReturnCustomerStepTimestamp(
                                step.key,
                                returnReq,
                                trackingData?.history,
                                trackingModalOrder
                              );

                              return (
                                <div
                                  key={step.key}
                                  className={`customer-step-node return-step-node ${
                                    isCompleted
                                      ? "completed"
                                      : isCurrent
                                      ? "current"
                                      : "upcoming"
                                  }`}
                                >
                                  <div className="step-node-indicator">
                                    <div className="node-circle return-circle">
                                      {isCompleted ? (
                                        <FiCheck className="node-icon" />
                                      ) : (
                                        <span className="node-num">{idx + 1}</span>
                                      )}
                                    </div>
                                    {idx < RETURN_CUSTOMER_STEPS.length - 1 && (
                                      <div
                                        className={`node-connector return-connector ${
                                          idx < retCurrentIdx ? "filled" : ""
                                        }`}
                                      ></div>
                                    )}
                                  </div>

                                  <div className="step-node-content">
                                    <div className="step-node-header">
                                      <span className="step-node-label">{step.label}</span>
                                      {stepTime && (
                                        <span className="step-node-time">
                                          <FiClock className="step-clock-icon" />{" "}
                                          {formatDateTime(stepTime)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="step-node-desc">{step.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Return Logistics & Refund Card */}
                          <div className="return-details-card">
                            <div className="details-card-col">
                              <h5 className="details-card-subheading">Return Logistics</h5>
                              <div className="details-meta-line">
                                <strong>Pickup Location:</strong>{" "}
                                <span>
                                  {returnReq?.pickupAddress ||
                                    (trackingModalOrder.shippingAddress
                                      ? `${trackingModalOrder.shippingAddress.address}, ${trackingModalOrder.shippingAddress.city}`
                                      : "Registered Customer Address")}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Pickup Date:</strong>{" "}
                                <span>
                                  {returnReq?.pickupDate
                                    ? formatDateTime(returnReq.pickupDate)
                                    : getReturnCustomerStepIndex(retStatus) >= 3
                                    ? "Courier Assigned for Collection"
                                    : "Will be scheduled upon approval"}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Items to Return:</strong>{" "}
                                <span>
                                  {returnReq?.items && returnReq.items.length > 0
                                    ? returnReq.items
                                        .map(
                                          (it) =>
                                            `${it.title || "Product"} (Qty: ${it.quantity || 1})`
                                        )
                                        .join(", ")
                                    : trackingModalOrder.orderItems?.[0]?.title || "Order Product"}
                                </span>
                              </div>
                            </div>

                            <div className="details-card-col">
                              <h5 className="details-card-subheading">Refund Information</h5>
                              <div className="details-meta-line">
                                <strong>Refund Amount:</strong>{" "}
                                <span>
                                  {formatPrice(
                                    returnReq?.refundAmount || trackingModalOrder.totalPrice
                                  )}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Payment Method:</strong>{" "}
                                <span>{method === "COD" ? "Cash on Delivery (COD)" : "Online / Stripe Card"}</span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Refund Status:</strong>{" "}
                                <span>
                                  {method === "COD"
                                    ? retStatus === "REFUNDED" || payStatus === "refunded"
                                      ? "COD Refund Completed"
                                      : "COD Refund Pending (Cash / Bank transfer on quality check)"
                                    : retStatus === "REFUNDED" || payStatus === "refunded"
                                    ? "Refunded to original card"
                                    : "Refund Processing"}
                                </span>
                              </div>
                              {method !== "COD" && returnReq?.stripeRefundId && (
                                <div className="details-meta-line">
                                  <strong>Stripe Refund ID:</strong>{" "}
                                  <code>{returnReq.stripeRefundId}</code>
                                </div>
                              )}
                              {method === "COD" && (
                                <div className="cod-refund-note">
                                  ℹ️ COD refunds are verified at warehouse and paid directly to your registered bank account or in cash.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 2. SECTION 2: Exchange Tracking (when exchange active) */}
                      {hasActiveExchange && (
                        <div className="tracking-section-container exchange-tracking-section">
                          <div className="section-title-with-badge">
                            <h4 className="tracking-section-title">2. Exchange Tracking</h4>
                            <span className="section-header-badge exchange">
                              CURRENT STATUS: {formatExchangeStatusText(exchStatus).toUpperCase()}
                            </span>
                          </div>

                          {/* Prominent Exchange Banner */}
                          <div className="exchange-prominent-banner">
                            <div className="banner-top-row">
                              <div>
                                <span className="banner-label">CURRENT EXCHANGE STATUS</span>
                                <h3 className="banner-status-title">
                                  {formatExchangeStatusText(exchStatus)}
                                </h3>
                              </div>
                              <div className="banner-payment-col">
                                <span className="banner-label">PAYMENT STATUS</span>
                                <span className="banner-payment-pill exchange-paid">
                                  Payment Preserved ({method === "COD" ? "COD" : "Paid Online"})
                                </span>
                              </div>
                            </div>
                            <div className="banner-meta-row">
                              <span><strong>Reason:</strong> {exchangeReq?.reason || "Size Exchange"}</span>
                              <span><strong>Original Size:</strong> {exchangeReq?.originalSize || "Standard"}</span>
                              <span><strong>Requested Replacement Size:</strong> <span className="highlight-tag">{exchangeReq?.newSize || "Requested Variant"}</span></span>
                              <span><strong>Quantity:</strong> {exchangeReq?.quantity || 1}</span>
                            </div>
                          </div>

                          {/* 8-Step Exchange Timeline Stepper */}
                          <div className="customer-stepper exchange-customer-stepper">
                            {EXCHANGE_CUSTOMER_STEPS.map((step, idx) => {
                              const exchCurrentIdx = getExchangeCustomerStepIndex(exchStatus);
                              const isCompleted = idx < exchCurrentIdx || (idx === 7 && exchStatus === "DELIVERED");
                              const isCurrent = idx === exchCurrentIdx && exchStatus !== "DELIVERED";
                              const stepTime = getExchangeCustomerStepTimestamp(
                                step.key,
                                exchangeReq,
                                trackingData?.history,
                                trackingModalOrder
                              );

                              return (
                                <div
                                  key={step.key}
                                  className={`customer-step-node exchange-step-node ${
                                    isCompleted
                                      ? "completed"
                                      : isCurrent
                                      ? "current"
                                      : "upcoming"
                                  }`}
                                >
                                  <div className="step-node-indicator">
                                    <div className="node-circle exchange-circle">
                                      {isCompleted ? (
                                        <FiCheck className="node-icon" />
                                      ) : (
                                        <span className="node-num">{idx + 1}</span>
                                      )}
                                    </div>
                                    {idx < EXCHANGE_CUSTOMER_STEPS.length - 1 && (
                                      <div
                                        className={`node-connector exchange-connector ${
                                          idx < exchCurrentIdx ? "filled" : ""
                                        }`}
                                      ></div>
                                    )}
                                  </div>

                                  <div className="step-node-content">
                                    <div className="step-node-header">
                                      <span className="step-node-label">{step.label}</span>
                                      {stepTime && (
                                        <span className="step-node-time">
                                          <FiClock className="step-clock-icon" />{" "}
                                          {formatDateTime(stepTime)}
                                        </span>
                                      )}
                                    </div>
                                    <p className="step-node-desc">{step.desc}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Exchange Replacement & Logistics Card */}
                          <div className="exchange-details-card">
                            <div className="details-card-col">
                              <h5 className="details-card-subheading">Product Details</h5>
                              <div className="details-meta-line">
                                <strong>Original Product:</strong>{" "}
                                <span>
                                  {exchangeReq?.originalItem?.title ||
                                    trackingModalOrder.orderItems?.[0]?.title ||
                                    "Decathlon Sports Gear"}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Original Size / Variant:</strong>{" "}
                                <span>{exchangeReq?.originalSize || "Standard"}</span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Replacement Size / Variant:</strong>{" "}
                                <span className="replacement-highlight-badge">
                                  {exchangeReq?.newSize || "New Variant"}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Quantity:</strong>{" "}
                                <span>{exchangeReq?.quantity || 1} unit</span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Return Pickup Address:</strong>{" "}
                                <span>
                                  {exchangeReq?.pickupAddress ||
                                    (trackingModalOrder.shippingAddress
                                      ? `${trackingModalOrder.shippingAddress.address}, ${trackingModalOrder.shippingAddress.city}`
                                      : "Customer Shipping Address")}
                                </span>
                              </div>
                            </div>

                            <div className="details-card-col">
                              <h5 className="details-card-subheading">Replacement Dispatch Logistics</h5>
                              <div className="details-meta-line">
                                <strong>Replacement Tracking Number:</strong>{" "}
                                <span className="replacement-trk-num">
                                  {exchangeReq?.replacementTrackingNumber ||
                                    (getExchangeCustomerStepIndex(exchStatus) >= 6
                                      ? `TRK-EXCH-${trackingModalOrder._id.slice(-6).toUpperCase()}`
                                      : "To be generated upon dispatch")}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Replacement Carrier:</strong>{" "}
                                <span>
                                  {exchangeReq?.replacementCarrier ||
                                    (getExchangeCustomerStepIndex(exchStatus) >= 6
                                      ? "Decathlon Express Logistics"
                                      : "To be assigned upon dispatch")}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Replacement Location:</strong>{" "}
                                <span>
                                  <FiMapPin className="mini-pin-icon" />
                                  {exchangeReq?.replacementLocation ||
                                    (getExchangeCustomerStepIndex(exchStatus) >= 6
                                      ? "Decathlon Central Fulfillment Hub"
                                      : "Decathlon Warehouse")}
                                </span>
                              </div>
                              <div className="details-meta-line">
                                <strong>Expected Delivery Date:</strong>{" "}
                                <span>
                                  {exchangeReq?.estimatedReplacementDeliveryDate
                                    ? formatDate(exchangeReq.estimatedReplacementDeliveryDate)
                                    : getExchangeCustomerStepIndex(exchStatus) >= 6
                                    ? "Within 2-3 business days"
                                    : "Calculated upon dispatch"}
                                </span>
                              </div>
                              <div className="exchange-payment-note">
                                ℹ️ No additional payment required. Original order payment status is maintained.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* 3. Detailed Tracking History Log */}
                <div className="tracking-history-container">
                  <h4 className="tracking-section-title">
                    Chronological Activity Log
                  </h4>
                  {trackingData?.history && trackingData.history.length > 0 ? (
                    <div className="history-timeline-list">
                      {[...trackingData.history]
                        .reverse()
                        .map((entry, hIdx) => (
                          <div key={hIdx} className="history-entry-item">
                            <div className="history-entry-left">
                              <span className="history-dot"></span>
                              {hIdx < trackingData.history.length - 1 && (
                                <span className="history-line"></span>
                              )}
                            </div>
                            <div className="history-entry-content">
                              <div className="history-top-row">
                                <span
                                  className={`history-status-tag ${(
                                    entry.status || ""
                                  ).toLowerCase()}`}
                                >
                                  {(entry.status || "").replace(/_/g, " ")}
                                </span>
                                <span className="history-timestamp">
                                  <FiClock className="history-clock-icon" />{" "}
                                  {formatDateTime(entry.timestamp)}
                                </span>
                              </div>
                              <p className="history-description">
                                {entry.description || "Status updated"}
                              </p>
                              {entry.location &&
                                (entry.location.city ||
                                  entry.location.latitude) && (
                                  <div className="history-location-info">
                                    <FiMapPin className="history-map-icon" />
                                    <span>
                                      {entry.location.city || "Location"}
                                      {entry.location.latitude &&
                                        ` (${entry.location.latitude.toFixed(
                                          4
                                        )}, ${entry.location.longitude.toFixed(
                                          4
                                        )})`}
                                    </span>
                                  </div>
                                )}
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="history-empty">
                      <p>Tracking history will update as your package moves.</p>
                    </div>
                  )}
                </div>

                {/* 4. Shipping Address Preview */}
                {trackingModalOrder.shippingAddress && (
                  <div className="tracking-address-card">
                    <h5 className="address-card-title">
                      <FiMapPin /> Delivery Address
                    </h5>
                    <p className="address-card-text">
                      <strong>
                        {trackingModalOrder.shippingAddress.name ||
                          trackingModalOrder.shippingAddress.fullName ||
                          "Customer"}
                      </strong>
                      <br />
                      {trackingModalOrder.shippingAddress.street ||
                        trackingModalOrder.shippingAddress.addressLine1}
                      {trackingModalOrder.shippingAddress.addressLine2
                        ? `, ${trackingModalOrder.shippingAddress.addressLine2}`
                        : ""}
                      <br />
                      {trackingModalOrder.shippingAddress.city},{" "}
                      {trackingModalOrder.shippingAddress.state} -{" "}
                      {trackingModalOrder.shippingAddress.postalCode ||
                        trackingModalOrder.shippingAddress.pincode}
                      <br />
                      Phone:{" "}
                      {trackingModalOrder.shippingAddress.phone ||
                        trackingModalOrder.shippingAddress.phoneNumber ||
                        "N/A"}
                    </p>
                  </div>
                )}
              </div>
            )}
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
