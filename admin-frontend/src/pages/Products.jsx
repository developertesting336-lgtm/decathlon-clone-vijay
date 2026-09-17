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
import "../styles/Products.css";

const PRODUCTS_PER_PAGE = 20;

const Products = () => {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
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

  const [viewProduct, setViewProduct] =
    useState(null);

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

  const filteredProducts = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    return products.filter((product) => {
      const name =
        product.name?.toLowerCase() || "";

      const brand =
        product.brand?.toLowerCase() || "";

      const category =
        product.category?.name?.toLowerCase() ||
        "";

      const matchesSearch =
        !value ||
        name.includes(value) ||
        brand.includes(value) ||
        category.includes(value);

      const matchesCategory =
        categoryFilter === "all" ||
        (Array.isArray(product.categories) &&
          product.categories.some(
            (c) => (c._id || c) === categoryFilter
          )) ||
        product.category?._id ===
          categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active"
          ? product.isActive === true
          : product.isActive === false);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [
    products,
    search,
    categoryFilter,
    statusFilter,
  ]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    categoryFilter,
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
              setCategoryFilter(
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
                          {Array.isArray(product.categories) &&
                          product.categories.length > 0
                            ? product.categories
                                .map((c) => c.name || c)
                                .join(", ")
                            : product.category?.name || "-"}
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
                              onClick={() =>
                                setViewProduct(
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
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    handlePageChange(
                      currentPage - 1
                    )
                  }
                >
                  <MdChevronLeft />
                </button>

                <div className="pagination-pages">

                  {Array.from(
                    {
                      length:
                        totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((page) => (
                    <button
                      type="button"
                      key={page}
                      className={
                        currentPage ===
                        page
                          ? "pagination-page active"
                          : "pagination-page"
                      }
                      onClick={() =>
                        handlePageChange(
                          page
                        )
                      }
                    >
                      {page}
                    </button>
                  ))}

                </div>

                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={
                    currentPage ===
                    totalPages
                  }
                  onClick={() =>
                    handlePageChange(
                      currentPage + 1
                    )
                  }
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

      {viewProduct && (
        <div
          className="product-view-modal-overlay"
          onClick={() =>
            setViewProduct(null)
          }
        >
          <div
            className="product-view-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              type="button"
              className="product-view-modal-close"
              onClick={() =>
                setViewProduct(null)
              }
            >
              <MdClose />
            </button>

            <div className="product-view-modal-header">

              <div>
                <h2>
                  {viewProduct.name}
                </h2>

                <span>
                  {viewProduct.brand ||
                    "Decathlon"}
                </span>
              </div>

              <span
                className={
                  viewProduct.isActive
                    ? "status-active"
                    : "status-inactive"
                }
              >
                {viewProduct.isActive
                  ? "Active"
                  : "Inactive"}
              </span>

            </div>

            <div className="product-view-modal-body">

              <div className="product-view-images">

                {viewProduct.images?.length >
                0 ? (

                  viewProduct.images.map(
                    (image, index) => (
                      <div
                        className="product-view-image"
                        key={`${image}-${index}`}
                      >
                        <img
                          src={getProductImageUrl(
                            image
                          )}
                          alt={`${viewProduct.name} ${
                            index + 1
                          }`}
                        />
                      </div>
                    )
                  )

                ) : (

                  <div className="product-view-no-image">
                    No Image
                  </div>

                )}

              </div>

              <div className="product-view-info">

                <div className="product-view-price">

                  {viewProduct.discountPrice >
                  0 ? (
                    <>
                      <strong>
                        ₹
                        {
                          viewProduct.discountPrice
                        }
                      </strong>

                      <span>
                        ₹
                        {
                          viewProduct.price
                        }
                      </span>
                    </>
                  ) : (
                    <strong>
                      ₹
                      {
                        viewProduct.price
                      }
                    </strong>
                  )}

                </div>

                <div className="product-view-description">

                  <h3>
                    Description
                  </h3>

                  <p>
                    {viewProduct.description ||
                      "No description available."}
                  </p>

                </div>

                <div className="product-view-details">

                  <div>
                    <span>
                      Categories
                    </span>

                    <strong>
                      {Array.isArray(viewProduct.categories) &&
                      viewProduct.categories.length > 0
                        ? viewProduct.categories
                            .map((c) => c.name || c)
                            .join(", ")
                        : viewProduct.category?.name || "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Stock
                    </span>

                    <strong>
                      {
                        viewProduct.stock ??
                        0
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Size
                    </span>

                    <strong>
                      {Array.isArray(
                        viewProduct.size
                      )
                        ? viewProduct.size.join(
                            ", "
                          )
                        : viewProduct.size ||
                          "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Color
                    </span>

                    <strong>
                      {Array.isArray(
                        viewProduct.color
                      )
                        ? viewProduct.color.join(
                            ", "
                          )
                        : viewProduct.color ||
                          "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Discount (%)
                    </span>

                    <strong>
                      {viewProduct.discountPercent != null && viewProduct.discountPercent !== ""
                        ? `${viewProduct.discountPercent}%`
                        : "0%"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      Review (Rating)
                    </span>

                    <strong>
                      {viewProduct.review != null && viewProduct.review !== ""
                        ? `★ ${viewProduct.review}`
                        : "-"}
                    </strong>
                  </div>

                  <div>
                    <span>
                      On Sale
                    </span>

                    <strong
                      style={{
                        color: viewProduct.onSale
                          ? "#16a34a"
                          : "#64748b",
                      }}
                    >
                      {viewProduct.onSale
                        ? "Yes"
                        : "No"}
                    </strong>
                  </div>

                </div>

              </div>

            </div>

            <div className="product-view-modal-footer">

              <button
                type="button"
                className="product-view-modal-edit"
                onClick={() => {
                  setViewProduct(null);

                  navigate(
                    `/products/edit/${viewProduct._id}`
                  );
                }}
              >
                <MdEdit />
                Edit Product
              </button>

              <button
                type="button"
                className="product-view-modal-done"
                onClick={() =>
                  setViewProduct(null)
                }
              >
                Close
              </button>

            </div>

          </div>
        </div>
      )}

    </>
  );
};

export default Products;