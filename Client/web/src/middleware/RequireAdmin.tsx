import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

// RequireAdmin Middleware
// Route guard that ensures only ADMIN users can access admin routes
// Redirects non-admin users to regular dashboard

export default function RequireAdmin({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page pad">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role !== "ADMIN") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
