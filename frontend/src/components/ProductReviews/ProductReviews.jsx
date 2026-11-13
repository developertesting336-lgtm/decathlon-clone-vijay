import React, { useState, useEffect, useCallback } from "react";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";
import {
  FiTrash2,
  FiCheckCircle,
  FiAlertCircle,
  FiMessageSquare,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api, { isTokenExpired } from "../../api/axios";
import "./ProductReviews.css";

// Dynamic Star Rating Display Helper
export const StarRating = ({ rating = 0, size = 16, className = "" }) => {
  const numeric = Math.max(0, Math.min(5, Number(rating) || 0));

  return (
    <div className={`pdp-star-rating-row ${className}`} aria-label={`${numeric} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => {
        if (numeric >= star) {
          return <FaStar key={star} size={size} className="star-icon filled" />;
        } else if (numeric >= star - 0.5) {
          return <FaStarHalfAlt key={star} size={size} className="star-icon half" />;
        } else {
          return <FaRegStar key={star} size={size} className="star-icon empty" />;
        }
      })}
    </div>
  );
};

const ProductReviews = ({ productId, product, onRatingUpdate }) => {
  // Reviews data state
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(
    Number(product?.averageRating || product?.review || 0)
  );
  const [reviewCount, setReviewCount] = useState(
    Number(product?.reviewCount || 0)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Current logged in user
  const [currentUser, setCurrentUser] = useState(null);

  // Delete modal state
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Star filter state
  const [selectedFilter, setSelectedFilter] = useState("all");

  // Load current user from localStorage & listen for auth changes
  const loadUser = useCallback(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (token && storedUser && !isTokenExpired(token)) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (err) {
        setCurrentUser(null);
      }
    } else {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    loadUser();

    const handleAuthChange = () => loadUser();
    window.addEventListener("authChanged", handleAuthChange);
    return () => window.removeEventListener("authChanged", handleAuthChange);
  }, [loadUser]);

  // Fetch reviews for current product from backend
  const fetchReviews = useCallback(async () => {
    if (!productId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await api.get(`/reviews/product/${productId}`);
      const data = response.data;

      const fetchedReviews = Array.isArray(data.reviews) ? data.reviews : [];
      const avg = Number(data.averageRating || 0);
      const count = Number(data.reviewCount || fetchedReviews.length || 0);

      setReviews(fetchedReviews);
      setAverageRating(avg);
      setReviewCount(count);

      // Notify parent component if rating changed
      if (onRatingUpdate && typeof onRatingUpdate === "function") {
        onRatingUpdate({ averageRating: avg, reviewCount: count });
      }
    } catch (err) {
      console.error("Fetch reviews error:", err);
      setError("Unable to load reviews. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [productId, onRatingUpdate]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Check if current user owns a given review
  const currentUserId = currentUser?._id || currentUser?.id;
  const isReviewOwner = useCallback(
    (review) => {
      if (!currentUserId || !review?.user) return false;
      const rUserId = review.user?._id || review.user?.id || review.user;
      return String(rUserId) === String(currentUserId);
    },
    [currentUserId]
  );

  // Delete review
  const handleConfirmDelete = async () => {
    if (!reviewToDelete) return;

    try {
      setDeleting(true);
      const res = await api.delete(`/reviews/${reviewToDelete._id}`);

      toast.success(res.data?.message || "Review deleted successfully!");
      setReviewToDelete(null);

      // Refresh reviews directly from backend
      await fetchReviews();
    } catch (err) {
      console.error("Delete review error:", err);
      toast.error(err.response?.data?.message || "Failed to delete review.");
    } finally {
      setDeleting(false);
    }
  };

  // Calculate rating distribution breakdown from reviews
  const distribution = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => Math.round(Number(r.rating)) === star).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { star, count, percentage };
  });

  const positiveReviewsCount = reviews.filter((r) => Number(r.rating) >= 4).length;
  const recommendPercent =
    reviews.length > 0
      ? Math.round((positiveReviewsCount / reviews.length) * 100)
      : Math.round(((averageRating >= 4 ? averageRating / 5 : 0.8) * 100));

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const d = new Date(dateString);
      return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Filtered reviews
  const filteredReviews =
    selectedFilter === "all"
      ? reviews
      : reviews.filter((r) => Math.round(Number(r.rating)) === Number(selectedFilter));

  return (
    <section className="pdp-reviews-section-v2" id="customer-reviews">
      {/* SECTION HEADER */}
      <div className="pdp-reviews-header-v2">
        <div className="pdp-reviews-title-wrap">
          <h3>Customer Reviews & Ratings</h3>
          <span className="pdp-reviews-count-badge">
            {reviewCount} {reviewCount === 1 ? "Review" : "Reviews"}
          </span>
        </div>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="pdp-reviews-loading">
          <div className="pdp-reviews-spinner" />
          <p>Loading verified customer reviews...</p>
        </div>
      )}

      {/* ERROR STATE */}
      {!loading && error && (
        <div className="pdp-reviews-error-box">
          <FiAlertCircle size={24} />
          <div>
            <strong>Unable to load reviews</strong>
            <p>{error}</p>
          </div>
          <button type="button" className="pdp-retry-btn" onClick={fetchReviews}>
            Try Again
          </button>
        </div>
      )}

      {/* RATING SUMMARY SCORECARD */}
      {!loading && !error && (
        <>
          <div className="pdp-reviews-scorecard-grid">
            {/* Left: Overall Score Block */}
            <div className="pdp-score-hero-card">
              <div className="pdp-score-number">
                {averageRating > 0 ? averageRating.toFixed(1) : "0.0"}
                <span className="pdp-score-max">/ 5</span>
              </div>
              <StarRating rating={averageRating} size={22} className="pdp-score-stars" />
              <div className="pdp-score-total-text">
                Based on <strong>{reviewCount}</strong> verified {reviewCount === 1 ? "rating" : "ratings"}
              </div>
              {reviewCount > 0 && (
                <div className="pdp-score-recommend-pill">
                  <FiCheckCircle />
                  <span>{recommendPercent}% of customers recommend this product</span>
                </div>
              )}
            </div>

            {/* Middle: Star Rating Breakdown Bars */}
            <div className="pdp-distribution-card">
              <h4 className="pdp-breakdown-heading">Rating Breakdown</h4>
              <div className="pdp-bars-list">
                {distribution.map(({ star, count, percentage }) => (
                  <button
                    key={star}
                    type="button"
                    className={`pdp-bar-row ${selectedFilter === String(star) ? "active" : ""}`}
                    onClick={() =>
                      setSelectedFilter(selectedFilter === String(star) ? "all" : String(star))
                    }
                    title={`Filter by ${star} star reviews (${count})`}
                  >
                    <span className="pdp-bar-label">
                      {star} <FaStar size={11} color="#ff9800" />
                    </span>
                    <div className="pdp-bar-track-bg">
                      <div
                        className="pdp-bar-fill"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="pdp-bar-count-text">
                      {count} ({percentage}%)
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Quick Highlights */}
            <div className="pdp-satisfaction-card">
              <h4 className="pdp-breakdown-heading">Decathlon Assurance</h4>
              <ul className="pdp-assurance-list">
                <li>
                  <FiCheckCircle className="assurance-icon" />
                  <span>Verified athlete & customer reviews</span>
                </li>
                <li>
                  <FiCheckCircle className="assurance-icon" />
                  <span>2-year warranty on sporting products</span>
                </li>
                <li>
                  <FiCheckCircle className="assurance-icon" />
                  <span>Easy 30-day returns & exchanges</span>
                </li>
              </ul>
            </div>
          </div>

          {/* FILTER PILLS */}
          {reviews.length > 0 && (
            <div className="pdp-review-filters-bar">
              <span className="pdp-filter-title">Filter by:</span>
              <button
                type="button"
                className={`pdp-filter-pill ${selectedFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedFilter("all")}
              >
                All ({reviews.length})
              </button>
              {[5, 4, 3, 2, 1].map((s) => {
                const count = reviews.filter((r) => Math.round(Number(r.rating)) === s).length;
                if (count === 0) return null;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`pdp-filter-pill ${selectedFilter === String(s) ? "active" : ""}`}
                    onClick={() => setSelectedFilter(String(s))}
                  >
                    {s} ★ ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* REVIEWS LIST */}
          <div className="pdp-reviews-content-wrap">
            {/* EMPTY STATE */}
            {reviews.length === 0 ? (
              <div className="pdp-reviews-empty-box">
                <div className="pdp-empty-icon-circle">
                  <FiMessageSquare size={32} />
                </div>
                <h4>No reviews yet</h4>
                <p>There are no reviews for this product yet.</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="pdp-reviews-empty-filter">
                <p>No {selectedFilter}-star reviews found.</p>
                <button
                  type="button"
                  className="pdp-clear-filter-btn"
                  onClick={() => setSelectedFilter("all")}
                >
                  Show all reviews
                </button>
              </div>
            ) : (
              <div className="pdp-review-cards-stream">
                {filteredReviews.map((rev) => {
                  const isOwner = isReviewOwner(rev);
                  const reviewerName = rev.user?.name || "Verified Customer";
                  const avatarUrl = rev.user?.avatar;

                  return (
                    <article key={rev._id} className="pdp-review-bubble-card">
                      <div className="pdp-review-card-top">
                        <div className="pdp-reviewer-meta">
                          <div className="pdp-reviewer-avatar">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={reviewerName} />
                            ) : (
                              <span>{reviewerName.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="pdp-reviewer-name-row">
                              <strong>{reviewerName}</strong>
                              {rev.isVerifiedPurchase && (
                                <span className="pdp-verified-purchase-badge" title="Verified Purchase">
                                  ✓ Verified Purchase
                                </span>
                              )}
                            </div>
                            <span className="pdp-review-date">{formatDate(rev.createdAt)}</span>
                          </div>
                        </div>

                        {/* Owner action buttons */}
                        {isOwner && (
                          <div className="pdp-review-owner-actions">
                            <button
                              type="button"
                              className="pdp-icon-action-btn delete"
                              onClick={() => setReviewToDelete(rev)}
                              title="Delete Review"
                              aria-label="Delete Review"
                            >
                              <FiTrash2 size={14} /> Delete
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Stars & Title */}
                      <div className="pdp-review-rating-line">
                        <StarRating rating={rev.rating} size={15} />
                        {rev.title && <h5 className="pdp-review-headline">{rev.title}</h5>}
                      </div>

                      {/* Review Comment */}
                      <p className="pdp-review-paragraph">{rev.comment}</p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* =======================================================
          DELETE CONFIRMATION MODAL
      ======================================================= */}
      {reviewToDelete && (
        <div
          className="pdp-review-modal-overlay"
          onClick={() => !deleting && setReviewToDelete(null)}
        >
          <div
            className="pdp-confirm-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="pdp-confirm-icon-wrap">
              <FiTrash2 size={24} color="#e53935" />
            </div>
            <h4>Delete Review?</h4>
            <p>
              Are you sure you want to permanently delete your review? This action cannot be
              undone.
            </p>

            <div className="pdp-confirm-actions">
              <button
                type="button"
                className="pdp-modal-btn cancel"
                onClick={() => setReviewToDelete(null)}
                disabled={deleting}
              >
                Keep Review
              </button>
              <button
                type="button"
                className="pdp-modal-btn delete-confirm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================================
          DELETE CONFIRMATION MODAL
      ======================================================= */}
      {reviewToDelete && (
        <div
          className="pdp-review-modal-overlay"
          onClick={() => !deleting && setReviewToDelete(null)}
        >
          <div
            className="pdp-confirm-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
          >
            <div className="pdp-confirm-icon-wrap">
              <FiTrash2 size={24} color="#e53935" />
            </div>
            <h4>Delete Review?</h4>
            <p>
              Are you sure you want to permanently delete your review? This action cannot be
              undone.
            </p>

            <div className="pdp-confirm-actions">
              <button
                type="button"
                className="pdp-modal-btn cancel"
                onClick={() => setReviewToDelete(null)}
                disabled={deleting}
              >
                Keep Review
              </button>
              <button
                type="button"
                className="pdp-modal-btn delete-confirm"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductReviews;
