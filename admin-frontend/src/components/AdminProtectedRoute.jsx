import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const isAdminSessionValid = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    if (payload.exp && payload.exp * 1000 <= Date.now()) {
      return false;
    }
    if (payload.role && payload.role !== "admin") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

const AdminProtectedRoute = ({ children }) => {
  const location = useLocation();

  if (!isAdminSessionValid()) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  return children;
};

export default AdminProtectedRoute;
