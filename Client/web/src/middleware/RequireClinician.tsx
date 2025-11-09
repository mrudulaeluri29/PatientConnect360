import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

// RequireClinician Middleware
// Route guard that ensures only CLINICIAN users can access clinician routes
// Redirects non-clinician users to regular dashboard

export default function RequireClinician({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page pad">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "CLINICIAN") {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

