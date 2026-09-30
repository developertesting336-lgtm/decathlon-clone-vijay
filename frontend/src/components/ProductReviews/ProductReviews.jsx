import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaStar,
  FaStarHalfAlt,
  FaRegStar,
} from "react-icons/fa";
import {
  FiEdit2,
  FiTrash2,
  FiX,
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

const RATING_LABELS = {
  1: "Poor",
  2: "Fair",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

const ProductReviews = ({ productId, product, onRatingUpdate }) => {
  const navigate = useNavigate();

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

  // Modal states for Create/Edit Review
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [formRating, setFormRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [formTitle, setFormTitle] = useState("");
  const [formComment, setFormComment] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  // Check if user already submitted a review for this product
  const userExistingReview = reviews.find(isReviewOwner);

  // Open modal for new review or editing existing
  const handleOpenWriteReview = () => {
    if (!currentUser) {
      toast("Please login to write a review.", { icon: "🔒" });
      navigate("/login", {
        state: { from: `/product/${productId}` },
      });
      return;
    }

    if (userExistingReview) {
      // User already reviewed: open in edit mode
      handleOpenEditReview(userExistingReview);
      return;
    }

    setEditingReview(null);
    setFormRating(5);
    setHoverRating(0);
    setFormTitle("");
    setFormComment("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditReview = (review) => {
    setEditingReview(review);
    setFormRating(Number(review.rating) || 5);
    setHoverRating(0);
    setFormTitle(review.title || "");
    setFormComment(review.comment || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setEditingReview(null);
    setFormError("");
  };

  // Submit create or update review
  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!formRating || formRating < 1 || formRating > 5) {
      setFormError("Please select a rating between 1 and 5 stars.");
      return;
    }

    if (!formComment.trim()) {
      setFormError("Please write a comment for your review.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");

      if (editingReview) {
        // UPDATE review (PUT /api/reviews/:reviewId)
        const res = await api.put(`/reviews/${editingReview._id}`, {
          rating: Number(formRating),
          title: formTitle.trim(),
          comment: formComment.trim(),
        });

        toast.success(res.data?.message || "Review updated successfully!");
      } else {
        // CREATE review (POST /api/reviews)
        const res = await api.post("/reviews", {
          productId,
          rating: Number(formRating),
          title: formTitle.trim(),
          comment: formComment.trim(),
        });

        toast.success(res.data?.message || "Review submitted successfully!");
      }

      setIsModalOpen(false);
      setEditingReview(null);

      // Refresh reviews directly from backend
      await fetchReviews();
    } catch (err) {
      console.error("Submit review error:", err);

      const status = err.response?.status;
      const message =
        err.response?.data?.message || "Failed to submit review. Please try again.";

      if (status === 400 && message.toLowerCase().includes("already reviewed")) {
        setFormError("You have already reviewed this product. Please edit your existing review.");
      } else if (status === 401) {
        setFormError("Your session has expired. Please login again.");
        setTimeout(() => navigate("/login"), 1500);
      } else {
        setFormError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

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

        <div className="pdp-reviews-actions-wrap">
          {currentUser ? (
            <button
              type="button"
              className="pdp-write-review-btn primary"
              onClick={handleOpenWriteReview}
            >
              {userExistingReview ? (
                <>
                  <FiEdit2 /> Edit Your Review
                </>
              ) : (
                <>
                  <FiMessageSquare /> Write a Review
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="pdp-write-review-btn outline"
              onClick={handleOpenWriteReview}
            >
              Login to Review
            </button>
          )}
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

              {userExistingReview && (
                <div className="pdp-user-has-reviewed-banner">
                  <span>You reviewed this product ({userExistingReview.rating}★)</span>
                  <button
                    type="button"
                    className="pdp-link-btn"
                    onClick={() => handleOpenEditReview(userExistingReview)}
                  >
                    Edit
                  </button>
                </div>
              )}
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
                <p>Be the first athlete to review this product and share your experience!</p>
                <button
                  type="button"
                  className="pdp-write-review-btn primary"
                  onClick={handleOpenWriteReview}
                >
                  {currentUser ? "Write a Review" : "Login to Review"}
                </button>
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
                              className="pdp-icon-action-btn edit"
                              onClick={() => handleOpenEditReview(rev)}
                              title="Edit Review"
                              aria-label="Edit Review"
                            >
                              <FiEdit2 size={14} /> Edit
                            </button>
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
          WRITE / EDIT REVIEW MODAL
      ======================================================= */}
      {isModalOpen && (
        <div className="pdp-review-modal-overlay" onClick={handleCloseModal}>
          <div
            className="pdp-review-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="review-modal-title"
          >
            <button
              type="button"
              className="pdp-review-modal-close"
              onClick={handleCloseModal}
              disabled={submitting}
              aria-label="Close modal"
            >
              <FiX size={20} />
            </button>

            <div className="pdp-modal-header-content">
              <h3 id="review-modal-title">
                {editingReview ? "Edit Your Review" : "Write a Customer Review"}
              </h3>
              <p className="pdp-modal-subtitle">
                {product?.name ? `for ${product.name}` : "Share your feedback with fellow athletes"}
              </p>
            </div>

            {formError && (
              <div className="pdp-modal-error-alert">
                <FiAlertCircle size={18} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitReview} className="pdp-review-form">
              {/* Star Rating Picker */}
              <div className="pdp-form-group">
                <label className="pdp-form-label">
                  Overall Rating <span className="req">*</span>
                </label>
                <div className="pdp-interactive-star-picker">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating || formRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        className="pdp-star-select-btn"
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setFormRating(star)}
                        aria-label={`Select ${star} star`}
                      >
                        {isFilled ? (
                          <FaStar size={30} color="#ff9800" />
                        ) : (
                          <FaRegStar size={30} color="#d1d5db" />
                        )}
                      </button>
                    );
                  })}
                  <span className="pdp-rating-selected-tag">
                    {RATING_LABELS[hoverRating || formRating] || ""}
                  </span>
                </div>
              </div>

              {/* Title input (optional) */}
              <div className="pdp-form-group">
                <label className="pdp-form-label" htmlFor="review-title-input">
                  Review Headline <span className="optional">(optional)</span>
                </label>
                <input
                  id="review-title-input"
                  type="text"
                  className="pdp-form-input"
                  placeholder="e.g. Excellent fit, perfect for regular workouts"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  maxLength={100}
                  disabled={submitting}
                />
              </div>

              {/* Comment textarea (required) */}
              <div className="pdp-form-group">
                <label className="pdp-form-label" htmlFor="review-comment-textarea">
                  Detailed Review <span className="req">*</span>
                </label>
                <textarea
                  id="review-comment-textarea"
                  className="pdp-form-textarea"
                  placeholder="What did you like or dislike? How was the fit, material quality, and comfort during exercise?"
                  rows={5}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  maxLength={1000}
                  required
                  disabled={submitting}
                />
                <span className="pdp-char-counter">{formComment.length} / 1000 characters</span>
              </div>

              {/* Modal Actions */}
              <div className="pdp-modal-actions-row">
                <button
                  type="button"
                  className="pdp-modal-btn cancel"
                  onClick={handleCloseModal}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pdp-modal-btn submit"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : editingReview
                    ? "Update Review"
                    : "Submit Review"}
                </button>
              </div>
            </form>
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
