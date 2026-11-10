import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

const renderWithRoutes = (initialPath = "/dashboard") =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<div>Admin Login</div>} />
        <Route
          path="/dashboard"
          element={
            <AdminProtectedRoute>
              <div>Secret Admin Content</div>
            </AdminProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("AdminProtectedRoute", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test("redirects to login when no adminToken is present", () => {
    renderWithRoutes("/dashboard");
    expect(screen.getByText("Admin Login")).toBeInTheDocument();
    expect(screen.queryByText("Secret Admin Content")).not.toBeInTheDocument();
  });

  test("redirects to login when token is expired or non-admin", () => {
    const expiredPayload = btoa(JSON.stringify({ id: "1", role: "user", exp: 1000 }));
    localStorage.setItem("adminToken", `hdr.${expiredPayload}.sig`);
    renderWithRoutes("/dashboard");
    expect(screen.getByText("Admin Login")).toBeInTheDocument();
    expect(screen.queryByText("Secret Admin Content")).not.toBeInTheDocument();
  });

  test("allows access with valid non-expired admin JWT", () => {
    const validPayload = btoa(
      JSON.stringify({ id: "1", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 })
    );
    localStorage.setItem("adminToken", `hdr.${validPayload}.sig`);
    renderWithRoutes("/dashboard");
    expect(screen.getByText("Secret Admin Content")).toBeInTheDocument();
  });
});
