import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Homepage from "./pages/Homepage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import SignupClinician from "./pages/SignupClinician";
import SignupCaregiver from "./pages/SignupCaregiver";
import Dashboard from "./pages/Dashboard";
import AdminSignup from "./pages/admin/AdminSignup";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import RequireAdmin from "./middleware/RequireAdmin";
import ClinicianLogin from "./pages/clinician/ClinicianLogin";
import ClinicianDashboard from "./pages/clinician/ClinicianDashboard";
import RequireClinician from "./middleware/RequireClinician";
import PatientDashboard from "./pages/patient/PatientDashboard";
import RequirePatient from "./middleware/RequirePatient";

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page pad">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Homepage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Signup />} />
          <Route path="/register/clinician" element={<SignupClinician />} />
          <Route path="/register/caregiver" element={<SignupCaregiver />} />
          <Route path="/admin/signup" element={<AdminSignup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            }
          />
          <Route path="/clinician/login" element={<ClinicianLogin />} />
          <Route
            path="/clinician/dashboard"
            element={
              <RequireClinician>
                <ClinicianDashboard />
              </RequireClinician>
            }
          />
          <Route
            path="/patient/dashboard"
            element={
              <RequirePatient>
                <PatientDashboard />
              </RequirePatient>
            }
          />
          <Route path="/forgot-password" element={<div className="page pad">Forgot Password (coming up)</div>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
