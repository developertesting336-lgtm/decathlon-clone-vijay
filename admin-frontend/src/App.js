import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./App.css";

import AdminLogin from "./pages/AdminLogin";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Users from "./pages/Users";

import AddProduct from "./components/product/AddProduct";
import EditProduct from "./components/product/EditProduct";
import ViewProduct from "./components/product/ViewProduct";

import Categories from "./pages/Categories";
import AddCategory from "./components/category/AddCategory";
import EditCategory from "./components/category/EditCategory";

import Orders from "./pages/Orders";
import Coupons from "./pages/Coupons";
import AddCoupon from "./components/coupon/AddCoupon";
import EditCoupon from "./components/coupon/EditCoupon";
import Banners from "./pages/Banners";
import AddBanner from "./components/banners/AddBanner";
import EditBanner from "./components/banners/EditBanner";

import AiKnowledgeManager from "./pages/AiKnowledgeManager";
import AdminProfile from "./pages/AdminProfile";
import NotificationInbox from "./pages/NotificationInbox";
import SupportManagement from "./pages/Support/SupportManagement";
import AddSupportCategory from "./pages/Support/AddCategory";
import EditSupportCategory from "./pages/Support/EditCategory";
import AddFAQ from "./pages/Support/AddFAQ";
import EditFAQ from "./pages/Support/EditFAQ";
import AdminSupportTicketDetails from "./pages/Support/AdminSupportTicketDetails";

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
          path="/products/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <ViewProduct />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/products/view/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <ViewProduct />
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
          path="/coupons"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <Coupons />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/coupons/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddCoupon />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/coupons/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditCoupon />
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
                <AdminSupportTickets />
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

        {/* SUPPORT & FAQ MANAGEMENT */}
        <Route
          path="/admin/support"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <SupportManagement />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/support/categories/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddSupportCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/support/categories/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditSupportCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/support/faqs/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddFAQ />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/support/faqs/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditFAQ />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/admin/support/tickets"
          element={<Navigate to="/admin/support?tab=tickets" replace />}
        />

        <Route
          path="/admin/support/tickets/:ticketId"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AdminSupportTicketDetails />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        {/* Alias routes for /support */}
        <Route
          path="/support"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <SupportManagement />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support/categories/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddSupportCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support/categories/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditSupportCategory />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support/faqs/add"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AddFAQ />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support/faqs/edit/:id"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <EditFAQ />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route
          path="/support/tickets"
          element={<Navigate to="/admin/support?tab=tickets" replace />}
        />

        <Route
          path="/support/tickets/:ticketId"
          element={
            <AdminProtectedRoute>
              <AdminLayout>
                <AdminSupportTicketDetails />
              </AdminLayout>
            </AdminProtectedRoute>
          }
        />

        <Route path="/homepage-sections" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
