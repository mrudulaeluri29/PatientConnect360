// Admin Routes
// Defines all admin-only routes
// All routes are protected by RequireAdmin middleware

import { Routes, Route } from "react-router-dom";
import RequireAdmin from "../middleware/RequireAdmin";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminDashboard from "../pages/admin/AdminDashboard";
import UserManagement from "../pages/admin/UserManagement";
import SystemSettings from "../pages/admin/SystemSettings";
import Analytics from "../pages/admin/Analytics";

export default function AdminRoutes() {
  return (
    <Routes>
      {/* Admin login - public route (no auth required) */}
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Admin dashboard and sub-pages - protected routes */}
      <Route
        path="/admin/dashboard"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <UserManagement />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <RequireAdmin>
            <SystemSettings />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <RequireAdmin>
            <Analytics />
          </RequireAdmin>
        }
      />
      
      {/* Default redirect */}
      <Route path="/admin" element={<AdminLogin />} />
    </Routes>
  );
}

