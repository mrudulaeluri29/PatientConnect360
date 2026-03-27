import React from "react";
import { Navigate } from "react-router";
import { useAuth } from "../auth/AuthContext";

export default function RequireCaregiver({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page pad">Loading…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== "CAREGIVER") {
    if (user.role === "ADMIN") return <Navigate to="/admin/dashboard" replace />;
    if (user.role === "CLINICIAN") return <Navigate to="/clinician/dashboard" replace />;
    if (user.role === "PATIENT") return <Navigate to="/patient/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
