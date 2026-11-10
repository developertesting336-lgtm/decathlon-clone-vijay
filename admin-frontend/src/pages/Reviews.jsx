import React, { useCallback, useEffect, useState } from "react";
import { MdDelete, MdRefresh, MdStar } from "react-icons/md";
import toast from "react-hot-toast";
import api from "../api/axios";
import "../styles/AdminExtras.css";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (ratingFilter) params.set("rating", ratingFilter);
      const res = await api.get(`/reviews?${params.toString()}`);
      setReviews(res.data?.reviews || []);
      setTotal(res.data?.total || 0);
      setTotalPages(res.data?.pages || 1);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  }, [page, ratingFilter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleDelete = async (reviewId) => {
    try {
      await api.delete(`/reviews/${reviewId}`);
      toast.success("Review deleted");
      fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete review");
    }
  };

  return (
    <div className="admin-extras-page">
      <div className="extras-header">
        <div>
          <h1>Product Reviews</h1>
          <p>{total} total customer reviews across the catalog</p>
        </div>
        <button type="button" className="extras-btn-secondary" onClick={fetchReviews}>
          <MdRefresh /> Refresh
        </button>
      </div>

      <div className="extras-toolbar">
        <select
          className="extras-select"
          value={ratingFilter}
          onChange={(e) => {
            setRatingFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      <div className="extras-card">
        <div className="extras-table-wrap">
          {loading ? (
            <div className="extras-empty">Loading reviews...</div>
          ) : reviews.length === 0 ? (
            <div className="extras-empty">No reviews found.</div>
          ) : (
            <table className="extras-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Customer</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Verified</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((rev) => (
                  <tr key={rev._id}>
                    <td>{rev.product?.name || "Unknown Product"}</td>
                    <td>
                      <div>{rev.user?.name || "Customer"}</div>
                      <small style={{ color: "#64748b" }}>{rev.user?.email || ""}</small>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
                        <MdStar style={{ color: "#f59e0b" }} /> {rev.rating}
                      </span>
                    </td>
                    <td style={{ maxWidth: 360 }}>{rev.comment}</td>
                    <td>
                      <span className={`extras-badge ${rev.isVerifiedPurchase ? "green" : "gray"}`}>
                        {rev.isVerifiedPurchase ? "Verified" : "Unverified"}
                      </span>
                    </td>
                    <td>{new Date(rev.createdAt).toLocaleDateString("en-IN")}</td>
                    <td>
                      <button
                        type="button"
                        className="extras-btn-danger"
                        onClick={() => handleDelete(rev._id)}
                      >
                        <MdDelete /> Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="extras-toolbar">
          <button
            type="button"
            className="extras-btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </button>
          <span>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="extras-btn-secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Reviews;
