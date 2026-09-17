import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdRefresh,
  MdClose,
  MdSearch,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../api/axios";
import socket from "../socket/socket";
import "../styles/Categories.css";

const CATEGORIES_PER_PAGE = 20;

const Categories = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });

  const getImageUrl = (image) => {
    if (!image) {
      return "";
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
      return image;
    }

    const apiBaseUrl = api.defaults.baseURL || "";
    const backendUrl = apiBaseUrl.replace(/\/api\/?$/, "");

    if (image.startsWith("/uploads/")) {
      return `${backendUrl}${image}`;
    }

    if (image.startsWith("uploads/")) {
      return `${backendUrl}/${image}`;
    }

    return image;
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);

      const response = await api.get("/categories");

      setCategories(response.data.categories || []);

      setCurrentPage(1);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    const handleCategoryRealtime = () => {
      fetchCategories();
    };

    socket.on("category_created", handleCategoryRealtime);
    socket.on("category_updated", handleCategoryRealtime);
    socket.on("category_deleted", handleCategoryRealtime);
    socket.on("category_reordered", handleCategoryRealtime);
    socket.on("categories_updated", handleCategoryRealtime);

    return () => {
      socket.off("category_created", handleCategoryRealtime);
      socket.off("category_updated", handleCategoryRealtime);
      socket.off("category_deleted", handleCategoryRealtime);
      socket.off("category_reordered", handleCategoryRealtime);
      socket.off("categories_updated", handleCategoryRealtime);
    };
  }, []);

  const filteredCategories = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) {
      return categories;
    }

    return categories.filter((category) =>
      category.name?.toLowerCase().includes(value),
    );
  }, [categories, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(filteredCategories.length / CATEGORIES_PER_PAGE);

  const paginatedCategories = useMemo(() => {
    const start = (currentPage - 1) * CATEGORIES_PER_PAGE;

    const end = start + CATEGORIES_PER_PAGE;

    return filteredCategories.slice(start, end);
  }, [filteredCategories, currentPage]);

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) {
      return;
    }

    setCurrentPage(page);
  };


  const openDeleteModal = (category) => {
    setDeleteModal({
      open: true,
      id: category._id,
      name: category.name,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      open: false,
      id: null,
      name: "",
    });
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/categories/${deleteModal.id}`);

      setCategories((prev) =>
        prev.filter((category) => category._id !== deleteModal.id),
      );

      closeDeleteModal();

      toast.success("Category deleted successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete category");
    }
  };

  if (loading) {
    return (
      <div className="categories-page">
        <div className="categories-loading">Loading categories...</div>
      </div>
    );
  }

  return (
    <>
      <div className="categories-page">
        <div className="categories-header">
          <div>
            <h1>Categories</h1>

            <p>Manage your product categories</p>
          </div>

          <div className="categories-header-actions">
            <button
              type="button"
              className="refresh-category-btn"
              onClick={fetchCategories}
            >
              <MdRefresh />
              Refresh
            </button>

            <button
              type="button"
              className="add-category-btn"
              onClick={() => navigate("/categories/add")}
            >
              <MdAdd />
              Add Category
            </button>
          </div>
        </div>

        <div className="categories-toolbar">
          <div className="categories-search">
            <MdSearch />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
            />

            {search && (
              <button
                type="button"
                className="clear-category-search"
                onClick={() => setSearch("")}
              >
                <MdClose />
              </button>
            )}
          </div>

          <span className="categories-count">
            {filteredCategories.length} categor
            {filteredCategories.length === 1 ? "y" : "ies"}
          </span>
        </div>

        <div className="categories-list-wrapper">
          <table className="categories-table">
            <thead>
              <tr>
                <th className="category-sr-header">Sr. No.</th>

                <th>Image</th>

                <th>Category Name</th>

                <th>Products Count</th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginatedCategories.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-category">
                    {search
                      ? "No categories match your search"
                      : "No categories found"}
                  </td>
                </tr>
              ) : (
                paginatedCategories.map((category, index) => {
                  const imageUrl = getImageUrl(category.image);
                  const serialNumber =
                    (currentPage - 1) * CATEGORIES_PER_PAGE + index + 1;

                  return (
                    <tr key={category._id}>
                      <td className="category-sr-cell">
                        <span className="category-sr-number">
                          {serialNumber}
                        </span>
                      </td>

                      <td>
                        <div className="category-list-image">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={category.name}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";

                                const fallback =
                                  e.currentTarget.parentElement?.querySelector(
                                    ".category-list-no-image",
                                  );

                                if (fallback) {
                                  fallback.style.display = "flex";
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className="category-list-no-image"
                            style={{
                              display: imageUrl ? "none" : "flex",
                            }}
                          >
                            No Image
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="category-name-cell">
                          <strong>{category.name}</strong>

                          <span>Category</span>
                        </div>
                      </td>

                      <td>
                        <span className="products-count-badge">
                          {category.productsCount || 0}
                        </span>
                      </td>

                      <td>
                        <div className="category-actions">
                          <button
                            type="button"
                            className="category-edit-btn"
                            title="Edit Category"
                            onClick={() =>
                              navigate(`/categories/edit/${category._id}`)
                            }
                          >
                            <MdEdit />
                          </button>

                          <button
                            type="button"
                            className="category-delete-btn"
                            title="Delete Category"
                            onClick={() => openDeleteModal(category)}
                          >
                            <MdDelete />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalPages > 1 && (
            <div className="categories-pagination">
              <button
                type="button"
                className="pagination-arrow"
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
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
              >
                <MdChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteModal.open && (
        <div
          className="category-delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="category-delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="category-delete-modal-close"
              onClick={closeDeleteModal}
            >
              <MdClose />
            </button>

            <div className="category-delete-modal-icon">
              <MdDelete />
            </div>

            <h2>Delete Category?</h2>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deleteModal.name}</strong>?
            </p>

            <span className="category-delete-warning">
              This action cannot be undone.
            </span>

            <div className="category-delete-modal-actions">
              <button
                type="button"
                className="category-modal-cancel"
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="category-modal-delete"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Categories;
