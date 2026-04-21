import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { FeedbackProvider } from "./contexts/FeedbackContext";
import RequireAdmin from "./middleware/RequireAdmin";
import RequireClinician from "./middleware/RequireClinician";
import RequirePatient from "./middleware/RequirePatient";
import RequireCaregiver from "./middleware/RequireCaregiver";

const Homepage = lazy(() => import("./pages/Homepage"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const SignupClinician = lazy(() => import("./pages/SignupClinician"));
const SignupCaregiver = lazy(() => import("./pages/SignupCaregiver"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminSignup = lazy(() => import("./pages/admin/AdminSignup"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const InvitationsManagement = lazy(() => import("./pages/admin/InvitationsManagement"));
const ClinicianLogin = lazy(() => import("./pages/clinician/ClinicianLogin"));
const ClinicianDashboard = lazy(() => import("./pages/clinician/ClinicianDashboard"));
const PatientDashboard = lazy(() => import("./pages/patient/PatientDashboard"));
const CaregiverDashboard = lazy(() => import("./pages/caregiver/CaregiverDashboard"));

function RouteFallback() {
  return <div className="page pad">Loading…</div>;
}

function LazyRoute({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page pad">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <FeedbackProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LazyRoute><Homepage /></LazyRoute>} />
          <Route path="/login" element={<LazyRoute><Login /></LazyRoute>} />
          <Route path="/register" element={<LazyRoute><Signup /></LazyRoute>} />
          <Route path="/register/clinician" element={<LazyRoute><SignupClinician /></LazyRoute>} />
          <Route path="/register/caregiver" element={<LazyRoute><SignupCaregiver /></LazyRoute>} />
          <Route path="/verify-email" element={<LazyRoute><VerifyEmail /></LazyRoute>} />
          <Route path="/admin/signup" element={<LazyRoute><AdminSignup /></LazyRoute>} />
          <Route path="/admin/login" element={<LazyRoute><AdminLogin /></LazyRoute>} />
          <Route
            path="/admin/dashboard"
            element={
              <RequireAdmin>
                <LazyRoute>
                  <AdminDashboard />
                </LazyRoute>
              </RequireAdmin>
            }
          />
          <Route
            path="/admin/invitations"
            element={
              <RequireAdmin>
                <LazyRoute>
                  <InvitationsManagement />
                </LazyRoute>
              </RequireAdmin>
            }
          />
          <Route path="/clinician/login" element={<LazyRoute><ClinicianLogin /></LazyRoute>} />
          <Route
            path="/clinician/dashboard"
            element={
              <RequireClinician>
                <LazyRoute>
                  <ClinicianDashboard />
                </LazyRoute>
              </RequireClinician>
            }
          />
          <Route
            path="/patient/dashboard"
            element={
              <RequirePatient>
                <LazyRoute>
                  <PatientDashboard />
                </LazyRoute>
              </RequirePatient>
            }
          />
          <Route
            path="/caregiver/dashboard"
            element={
              <RequireCaregiver>
                <LazyRoute>
                  <CaregiverDashboard />
                </LazyRoute>
              </RequireCaregiver>
            }
          />
          <Route path="/forgot-password" element={<LazyRoute><ForgotPassword /></LazyRoute>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <LazyRoute>
                  <Dashboard />
                </LazyRoute>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      </FeedbackProvider>
    </AuthProvider>
  );
}
