import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";

import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Users from "./pages/Users";

import AddProduct from "./components/product/AddProduct";
import EditProduct from "./components/product/EditProduct";

import Categories from "./pages/Categories";
import AddCategory from "./components/category/AddCategory";
import EditCategory from "./components/category/EditCategory";

import Orders from "./pages/Orders";
import Banners from "./pages/Banners";
import AddBanner from "./components/banners/AddBanner";
import EditBanner from "./components/banners/EditBanner";

import Pages from "./pages/Pages";
import PageBuilder from "./pages/PageBuilder";
import AiKnowledgeManager from "./pages/AiKnowledgeManager";
import SupportTickets from "./pages/SupportTickets";
import AdminProfile from "./pages/AdminProfile";
import NotificationInbox from "./pages/NotificationInbox";

import AdminLayout from "./components/AdminLayout";
import AdminProtectedRoute from "./components/AdminProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        reverseOrder={false}
        containerStyle={{
          zIndex: 9999999,
        }}
        toastOptions={{
          duration: 3000,
          style: {
            zIndex: 9999999,
          },
        }}
      />

      <Routes>
        <Route path="/" element={<AdminLogin />} />

        <Route
          path="/dashboard"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Products />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/products/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddProduct />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/products/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditProduct />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/categories"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Categories />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/categories/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/categories/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Orders />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Users />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/banners"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Banners />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/banners/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddBanner />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/banners/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditBanner />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/pages"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Pages />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/pages/builder/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <PageBuilder />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/ai-knowledge"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AiKnowledgeManager />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support-tickets"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <SupportTickets />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AdminProfile />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <NotificationInbox />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route path="/homepage-sections" element={<Navigate to="/pages" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
