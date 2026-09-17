import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const AdminProtectedRoute = ({
  children,
}) => {
  const location = useLocation();

  const adminToken =
    localStorage.getItem("adminToken");

  if (!adminToken) {
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