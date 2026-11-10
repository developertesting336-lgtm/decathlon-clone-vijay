import React, { useCallback, useEffect, useState } from "react";
import { MdNotificationsActive, MdRefresh } from "react-icons/md";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/AdminExtras.css";

const StockAlerts = () => {
  const [notifications, setNotifications] = useState([]);
  const [productSummary, setProductSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifiedFilter, setNotifiedFilter] = useState("");
  const [total, setTotal] = useState(0);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: "50" });
      if (notifiedFilter !== "") params.set("notified", notifiedFilter);
      const res = await api.get(`/stock-notifications/admin/all?${params.toString()}`);
      setNotifications(res.data?.notifications || []);
      setProductSummary(res.data?.productSummary || []);
      setTotal(res.data?.total || 0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load stock alerts");
    } finally {
      setLoading(false);
    }
  }, [notifiedFilter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  return (
    <div className="admin-extras-page">
      <div className="extras-header">
        <div>
          <h1>Restock Subscriptions</h1>
          <p>{total} total customer back-in-stock alerts</p>
        </div>
        <button type="button" className="extras-btn-secondary" onClick={fetchAlerts}>
          <MdRefresh /> Refresh
        </button>
      </div>

      {productSummary.length > 0 && (
        <div className="extras-card">
          <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", fontWeight: 700 }}>
            <MdNotificationsActive style={{ verticalAlign: "middle", marginRight: 6 }} />
            Pending Demand by Product
          </div>
          <div className="extras-table-wrap">
            <table className="extras-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Current Stock</th>
                  <th>Price</th>
                  <th>Waiting Subscribers</th>
                </tr>
              </thead>
              <tbody>
                {productSummary.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.name}</td>
                    <td>{item.stock}</td>
                    <td>₹{Number(item.price || 0).toLocaleString("en-IN")}</td>
                    <td>
                      <span className="extras-badge amber">{item.pendingSubscribers} waiting</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="extras-toolbar">
        <select
          className="extras-select"
          value={notifiedFilter}
          onChange={(e) => setNotifiedFilter(e.target.value)}
        >
          <option value="">All Subscriptions</option>
          <option value="false">Pending Alert</option>
          <option value="true">Notified</option>
        </select>
      </div>

      <div className="extras-card">
        <div className="extras-table-wrap">
          {loading ? (
            <div className="extras-empty">Loading stock alerts...</div>
          ) : notifications.length === 0 ? (
            <div className="extras-empty">No restock subscriptions found.</div>
          ) : (
            <table className="extras-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Subscriber Email</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Requested</th>
                </tr>
              </thead>
              <tbody>
                {notifications.map((sub) => (
                  <tr key={sub._id}>
                    <td>{sub.product?.name || "Deleted Product"}</td>
                    <td>{sub.email}</td>
                    <td>{sub.user?.name || "Guest"}</td>
                    <td>
                      <span className={`extras-badge ${sub.notified ? "green" : "amber"}`}>
                        {sub.notified ? "Notified" : "Waiting"}
                      </span>
                    </td>
                    <td>{new Date(sub.createdAt).toLocaleDateString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockAlerts;
