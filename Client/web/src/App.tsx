import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";

function Protected({ children }: { children: JSX.Element }) {
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
          <Route path="/login" element={<SignIn />} />
          {/* stubs for next steps */}
          <Route path="/register" element={<div className="page pad">Register (coming up)</div>} />
          <Route path="/forgot" element={<div className="page pad">Forgot Password (coming up)</div>} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

//app routes and a guard that only lets signed-in users access /dashboard so can redirect to /login when not authenticated.