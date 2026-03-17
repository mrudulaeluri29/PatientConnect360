import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

// RequirePatient Middleware
// Route guard that ensures only PATIENT or CAREGIVER users can access patient routes
// Redirects non-patient users to appropriate dashboards

export default function RequirePatient({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page pad">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow PATIENT and CAREGIVER roles to access patient dashboard
  if (user.role !== "PATIENT" && user.role !== "CAREGIVER") {
    if (user.role === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (user.role === "CLINICIAN") {
      return <Navigate to="/clinician/dashboard" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

