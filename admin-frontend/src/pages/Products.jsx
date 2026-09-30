import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

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
  MdVisibility,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../api/axios";
import socket from "../socket/socket";
import { getPaginationRange } from "../utils/pagination";
import "../styles/Products.css";

const PRODUCTS_PER_PAGE = 20;

const Products = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("all");
  const [subcategoryFilter, setSubcategoryFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  const [currentPage, setCurrentPage] =
    useState(1);

  const [deleteModal, setDeleteModal] =
    useState({
      open: false,
      id: null,
      name: "",
    });

  const handleViewProduct = (product) => {
    const productId = product?._id || product?.id;

    if (!productId) {
      console.error("Product ID missing:", product);
      toast.error("Product ID is missing");
      return;
    }

    navigate(`/products/${productId}`);
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/products?admin=true&limit=1000"
      );

      setProducts(
        response.data.products || []
      );

      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const handleProductRealtime = () => {
      fetchProducts();
    };

    socket.on("product_created", handleProductRealtime);
    socket.on("product_updated", handleProductRealtime);
    socket.on("product_deleted", handleProductRealtime);
    socket.on("products_updated", handleProductRealtime);

    return () => {
      socket.off("product_created", handleProductRealtime);
      socket.off("product_updated", handleProductRealtime);
      socket.off("product_deleted", handleProductRealtime);
      socket.off("products_updated", handleProductRealtime);
    };
  }, []);

  const categoryOptions = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      if (Array.isArray(product.categories)) {
        product.categories.forEach((cat) => {
          if (cat?._id) {
            map.set(cat._id, cat.name);
          }
        });
      }
      if (product.category?._id) {
        map.set(
          product.category._id,
          product.category.name
        );
      }
    });

    return Array.from(
      map,
      ([id, name]) => ({
        id,
        name,
      })
    ).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [products]);

  const subcategoryOptions = useMemo(() => {
    const map = new Map();

    products.forEach((product) => {
      // If a category filter is active, only show subcategories belonging to that category
      if (categoryFilter !== "all") {
        const belongsToCat =
          (Array.isArray(product.categories) &&
            product.categories.some(
              (c) => (c?._id || c) === categoryFilter
            )) ||
          product.category?._id === categoryFilter ||
          product.category === categoryFilter;

        if (!belongsToCat) return;
      }

      if (
        product.subcategory &&
        typeof product.subcategory === "string" &&
        product.subcategory.trim()
      ) {
        const sub = product.subcategory.trim();
        map.set(sub.toLowerCase(), sub);
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "accent" })
    );
  }, [products, categoryFilter]);

  const handleCategoryFilterChange = (val) => {
    setCategoryFilter(val);
    setSubcategoryFilter("all");
  };

  const filteredProducts = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const name =
        product.name?.toLowerCase() || "";

      const brand =
        product.brand?.toLowerCase() || "";

      const subcategory =
        product.subcategory?.toLowerCase() || "";

      const category =
        product.category?.name?.toLowerCase() ||
        "";

      const allCategories = Array.isArray(product.categories)
        ? product.categories
            .map((c) => (c?.name || "").toLowerCase())
            .join(" ")
        : "";

      const matchesSearch =
        !value ||
        name.includes(value) ||
        brand.includes(value) ||
        subcategory.includes(value) ||
        category.includes(value) ||
        allCategories.includes(value);

      const matchesCategory =
        categoryFilter === "all" ||
        (Array.isArray(product.categories) &&
          product.categories.some(
            (c) => (c._id || c) === categoryFilter
          )) ||
        product.category?._id ===
          categoryFilter ||
        product.category === categoryFilter;

      const matchesSubcategory =
        subcategoryFilter === "all" ||
        (product.subcategory &&
          product.subcategory.trim().toLowerCase() ===
            subcategoryFilter.trim().toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? product.isActive === true
          : product.isActive === false);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSubcategory &&
        matchesStatus
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    categoryFilter,
    subcategoryFilter,
    statusFilter,
  ]);

  const totalPages = Math.ceil(
    filteredProducts.length /
      PRODUCTS_PER_PAGE
  );

  const paginatedProducts = useMemo(() => {
    const start =
      (currentPage - 1) *
      PRODUCTS_PER_PAGE;

    const end =
      start + PRODUCTS_PER_PAGE;

    return filteredProducts.slice(
      start,
      end
    );
  }, [
    filteredProducts,
    currentPage,
  ]);

  const handlePageChange = (page) => {
    if (
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const openDeleteModal = (
    id,
    name
  ) => {
    setDeleteModal({
      open: true,
      id,
      name,
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
      await api.delete(
        `/products/${deleteModal.id}`
      );

      setProducts((prev) =>
        prev.filter(
          (product) =>
            product._id !==
            deleteModal.id
        )
      );

      closeDeleteModal();

      toast.success(
        "Product deleted successfully"
      );
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to delete product"
      );
    }
  };

  const getProductImageUrl = (image) => {
  if (!image) {
    return "";
  }

  // Cloudinary / external URL
  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  // Backend URL from Axios configuration
  const apiBaseUrl =
    api.defaults.baseURL || "";

  const backendUrl = apiBaseUrl.replace(
    /\/api\/?$/,
    "",
  );

  // Local uploaded image
  if (image.startsWith("/uploads/")) {
    return `${backendUrl}${image}`;
  }

  // Handle uploads/ without leading slash
  if (image.startsWith("uploads/")) {
    return `${backendUrl}/${image}`;
  }

  return image;
};

  return (
    <>
      <div className="products-page">

        <div className="products-header">

          <div>
            <h1>Products</h1>

            <p>
              Manage all your products
            </p>
          </div>

          <div className="products-header-actions">

            <button
              type="button"
              className="refresh-btn"
              onClick={fetchProducts}
            >
              <MdRefresh />
              Refresh
            </button>

            <button
              type="button"
              className="add-product-btn"
              onClick={() =>
                navigate(
                  "/products/add"
                )
              }
            >
              <MdAdd />
              Add Product
            </button>

          </div>

        </div>

        <div className="products-toolbar">

          <div className="products-search">

            <MdSearch />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search products..."
            />

            {search && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() =>
                  setSearch("")
                }
              >
                <MdClose />
              </button>
            )}

          </div>

          <select
            className="products-filter"
            value={categoryFilter}
            onChange={(e) =>
              handleCategoryFilterChange(
                e.target.value
              )
            }
          >
            <option value="all">
              All Categories
            </option>

            {categoryOptions.map(
              (category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              )
            )}
          </select>

          <select
            className="products-filter"
            value={subcategoryFilter}
            onChange={(e) =>
              setSubcategoryFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All Subcategories
            </option>

            {subcategoryOptions.map(
              (subcat) => (
                <option
                  key={subcat}
                  value={subcat}
                >
                  {subcat}
                </option>
              )
            )}
          </select>

          <select
            className="products-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(
                e.target.value
              )
            }
          >
            <option value="all">
              All Status
            </option>

            <option value="active">
              Active
            </option>

            <option value="inactive">
              Inactive
            </option>
          </select>

          {(search ||
            categoryFilter !== "all" ||
            subcategoryFilter !== "all" ||
            statusFilter !== "all") && (
            <button
              type="button"
              className="clear-product-filters"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}

          <span className="products-count">
            {filteredProducts.length} product
            {filteredProducts.length !== 1
              ? "s"
              : ""}
          </span>

        </div>

        {loading ? (
          <div className="products-loading">
            Loading products...
          </div>
        ) : (
          <div className="products-table-container">

            <table className="products-table">

              <thead>
                <tr>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {paginatedProducts.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="empty-products"
                    >
                      {search ||
                      categoryFilter !==
                        "all" ||
                      subcategoryFilter !==
                        "all" ||
                      statusFilter !==
                        "all"
                        ? "No products match your filters"
                        : "No products found"}
                    </td>
                  </tr>
                ) : (
                  paginatedProducts.map(
                    (product) => (
                      <tr
                        key={
                          product._id
                        }
                      >

                        <td>
                          {product.images
                            ?.length >
                          0 ? (
                            <img
                              className="product-image"
                              src={getProductImageUrl(
                                product.images[0]
                              )}
                              alt={
                                product.name
                              }
                            />
                          ) : (
                            <div className="no-image">
                              No Image
                            </div>
                          )}
                        </td>

                        <td>
                          <div className="product-name-cell">

                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            <span>
                              {product.brand ||
                                "Decathlon"}
                            </span>

                          </div>
                        </td>

                        <td>
                          <div>
                            {Array.isArray(product.categories) &&
                            product.categories.length > 0
                              ? product.categories
                                  .map((c) => c.name || c)
                                  .join(", ")
                              : product.category?.name || "-"}
                          </div>
                          {product.subcategory && (
                            <small style={{ color: "#777", display: "block", fontSize: "11px", marginTop: "2px" }}>
                              {product.subcategory}
                            </small>
                          )}
                        </td>

                        <td>
                          <div className="price-cell">

                            {product.discountPrice >
                            0 ? (
                              <>
                                <strong>
                                  ₹
                                  {
                                    product.discountPrice
                                  }
                                </strong>

                                <span>
                                  ₹
                                  {
                                    product.price
                                  }
                                </span>
                              </>
                            ) : (
                              <strong>
                                ₹
                                {
                                  product.price
                                }
                              </strong>
                            )}

                          </div>
                        </td>

                        <td>
                          <span
                            className={
                              product.stock >
                              0
                                ? "stock-available"
                                : "stock-out"
                            }
                          >
                            {
                              product.stock
                            }
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              product.isActive
                                ? "status-active"
                                : "status-inactive"
                            }
                          >
                            {product.isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          <div className="product-actions">

                            <button
                              type="button"
                              className="view-product-btn"
                              title="View Product"
                              aria-label="View Product"
                              disabled={!product?._id && !product?.id}
                              onClick={() =>
                                handleViewProduct(
                                  product
                                )
                              }
                            >
                              <MdVisibility />
                            </button>

                            <button
                              type="button"
                              className="edit-btn"
                              title="Edit Product"
                              onClick={() =>
                                navigate(
                                  `/products/edit/${product._id}`
                                )
                              }
                            >
                              <MdEdit />
                            </button>

                            <button
                              type="button"
                              className="delete-btn"
                              title="Delete Product"
                              onClick={() =>
                                openDeleteModal(
                                  product._id,
                                  product.name
                                )
                              }
                            >
                              <MdDelete />
                            </button>

                          </div>
                        </td>

                      </tr>
                    )
                  )
                )}

              </tbody>

            </table>

            {totalPages > 1 && (
              <div className="products-pagination">
                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={currentPage === 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  title="Previous Page"
                  aria-label="Previous Page"
                >
                  <MdChevronLeft />
                </button>

                <div className="pagination-pages">
                  {getPaginationRange(currentPage, totalPages).map(
                    (item, index) => {
                      if (typeof item === "string") {
                        return (
                          <span
                            key={`dots-${index}`}
                            className="pagination-ellipsis"
                          >
                            ...
                          </span>
                        );
                      }
                      return (
                        <button
                          type="button"
                          key={item}
                          className={
                            currentPage === item
                              ? "pagination-page active"
                              : "pagination-page"
                          }
                          onClick={() => handlePageChange(item)}
                          aria-label={`Page ${item}`}
                          aria-current={
                            currentPage === item ? "page" : undefined
                          }
                        >
                          {item}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={currentPage === totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  title="Next Page"
                  aria-label="Next Page"
                >
                  <MdChevronRight />
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {deleteModal.open && (
        <div
          className="delete-modal-overlay"
          onClick={
            closeDeleteModal
          }
        >
          <div
            className="delete-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="delete-modal-close"
              onClick={
                closeDeleteModal
              }
            >
              <MdClose />
            </button>

            <div className="delete-modal-icon">
              <MdDelete />
            </div>

            <h2>
              Delete Product?
            </h2>

            <p>
              Are you sure you want to
              delete
              <strong>
                {" "}
                {
                  deleteModal.name
                }
              </strong>
              ?
            </p>

            <span className="delete-modal-warning">
              This action cannot be undone.
            </span>

            <div className="delete-modal-actions">

              <button
                type="button"
                className="modal-cancel-btn"
                onClick={
                  closeDeleteModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="modal-delete-btn"
                onClick={
                  handleDelete
                }
              >
                Delete Product
              </button>

            </div>

          </div>
        </div>
      )}

    </>
  );
};

export default Products;