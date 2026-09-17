import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MdRefresh,
  MdSearch,
  MdClose,
  MdVisibility,
  MdChevronLeft,
  MdChevronRight,
} from "react-icons/md";

import toast from "react-hot-toast";

import api from "../api/axios";
import "../styles/Users.css";

const USERS_PER_PAGE = 20;

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] =
    useState(1);

  const [selectedUser, setSelectedUser] =
    useState(null);

  const [modalOpen, setModalOpen] =
    useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/auth/admin/users"
      );

      setUsers(response.data.users || []);
      setCurrentPage(1);
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const value = search
      .trim()
      .toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((user) => {
      const name =
        user.name?.toLowerCase() || "";

      const email =
        user.email?.toLowerCase() || "";

      const phone =
        user.phone?.toLowerCase() || "";

      return (
        name.includes(value) ||
        email.includes(value) ||
        phone.includes(value)
      );
    });
  }, [users, search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  const totalPages = Math.ceil(
    filteredUsers.length /
      USERS_PER_PAGE
  );

  const paginatedUsers = useMemo(() => {
    const start =
      (currentPage - 1) *
      USERS_PER_PAGE;

    const end =
      start + USERS_PER_PAGE;

    return filteredUsers.slice(
      start,
      end
    );
  }, [filteredUsers, currentPage]);

  const handlePageChange = (page) => {
    if (
      page < 1 ||
      page > totalPages
    ) {
      return;
    }

    setCurrentPage(page);
  };

  const clearSearch = () => {
    setSearch("");
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setModalOpen(false);
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(
      date
    ).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="users-page">

        <div className="users-header">

          <div>
            <h1>Users</h1>

            <p>
              Manage registered users
            </p>
          </div>

          <button
            type="button"
            className="refresh-users-btn"
            onClick={fetchUsers}
          >
            <MdRefresh />
            Refresh
          </button>

        </div>

        <div className="users-toolbar">

          <div className="users-search">

            <MdSearch />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              placeholder="Search users..."
            />

            {search && (
              <button
                type="button"
                className="clear-users-search"
                onClick={clearSearch}
              >
                <MdClose />
              </button>
            )}

          </div>

          <span className="users-count">
            {filteredUsers.length} user
            {filteredUsers.length !== 1
              ? "s"
              : ""}
          </span>

        </div>

        {loading ? (

          <div className="users-loading">
            Loading users...
          </div>

        ) : (

          <div className="users-table-container">

            <table className="users-table">

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Mobile</th>
                  <th>Joined Date</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {paginatedUsers.length === 0 ? (

                  <tr>
                    <td
                      colSpan="5"
                      className="empty-users"
                    >
                      {search
                        ? "No users match your search"
                        : "No users found"}
                    </td>
                  </tr>

                ) : (

                  paginatedUsers.map(
                    (user) => (
                      <tr key={user._id}>

                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                            <div className="user-name-cell">
                              <strong>{user.name || "Customer"}</strong>
                              <span className="user-badge">Customer</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {user.email || "-"}
                        </td>

                        <td>
                          {user.phone || "-"}
                        </td>

                        <td>
                          {formatDate(
                            user.createdAt
                          )}
                        </td>

                        <td>

                          <button
                            type="button"
                            className="view-user-btn"
                            title="View User"
                            onClick={() =>
                              openUserModal(
                                user
                              )
                            }
                          >
                            <MdVisibility />
                          </button>

                        </td>

                      </tr>
                    )
                  )

                )}

              </tbody>

            </table>

            {totalPages > 1 && (

              <div className="users-pagination">

                <button
                  type="button"
                  className="pagination-arrow"
                  disabled={
                    currentPage === 1
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
                      length: totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map((page) => (

                    <button
                      type="button"
                      key={page}
                      className={
                        currentPage === page
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

      {modalOpen && selectedUser && (
  <div
    className="user-modal-overlay"
    onClick={closeUserModal}
  >
    <div
      className="user-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        className="user-modal-close"
        onClick={closeUserModal}
      >
        <MdClose />
      </button>

      <div className="user-modal-avatar">
        {selectedUser.name
          ?.charAt(0)
          ?.toUpperCase()}
      </div>

      <h2>{selectedUser.name}</h2>

      <span className="user-role">
        {selectedUser.role || "user"}
      </span>

      <div className="user-details">

        <div className="user-detail-row">
          <span>User ID</span>

          <strong>
            {selectedUser._id || "-"}
          </strong>
        </div>

        <div className="user-detail-row">
          <span>Email</span>

          <strong>
            {selectedUser.email || "-"}
          </strong>
        </div>

        <div className="user-detail-row">
          <span>Mobile</span>

          <strong>
            {selectedUser.phone || "-"}
          </strong>
        </div>

        <div className="user-detail-row">
          <span>Role</span>

          <strong className="user-role-value">
            {selectedUser.role || "user"}
          </strong>
        </div>

        <div className="user-detail-row">
          <span>Joined Date</span>

          <strong>
            {formatDate(
              selectedUser.createdAt
            )}
          </strong>
        </div>

      </div>

      <button
        type="button"
        className="user-modal-done"
        onClick={closeUserModal}
      >
        Close
      </button>
    </div>
  </div>
)}
    </>
  );
};

export default Users;