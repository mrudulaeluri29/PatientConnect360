import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { api } from "../lib/axios";

interface User {
  id: string;
  email: string;
  username: string;
  role: "ADMIN" | "PATIENT" | "CAREGIVER" | "CLINICIAN";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<User>;
  register: (
    email: string,
    username: string,
    password: string,
    role?: string,
    profileData?: Record<string, unknown>
  ) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Development mode: controlled via Vite env var VITE_DEV_AUTH (set to "true" to use mock auth)
// Default is false so the app will use the real backend when deployed.
const DEV_MODE = import.meta.env.VITE_DEV_AUTH === "true";

// Mock storage for development (stores in localStorage)
const STORAGE_KEY = "dev_auth_user";

// Mock users for development (not used currently)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Load user from localStorage on mount (dev mode)
  useEffect(() => {
    if (DEV_MODE) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setUser(userData);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      setLoading(false);
    } else {
      refreshUser();
    }
  }, []);

  const refreshUser = async () => {
    if (DEV_MODE) {
      // In dev mode, just check localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const userData = JSON.parse(stored);
          setUser(userData);
        } catch {
          localStorage.removeItem(STORAGE_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    // Real API call
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Feature 2 (B7): added rememberMe parameter
  const login = async (emailOrUsername: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    
    if (DEV_MODE) {
      // Mock login - accept any credentials for development
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if user exists in mock storage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const userData = JSON.parse(stored);
        // If stored user matches credentials (email or username), use it
        if (userData.email === emailOrUsername || userData.username === emailOrUsername || 
            userData.email.toLowerCase() === emailOrUsername.toLowerCase() || 
            userData.username.toLowerCase() === emailOrUsername.toLowerCase()) {
          setUser(userData);
          setLoading(false);
          return userData;
        }
      }
      
      // Determine role based on current route in dev mode
      let defaultRole: "ADMIN" | "PATIENT" | "CAREGIVER" | "CLINICIAN" = "PATIENT";
      const path = window.location.pathname;
      if (path.includes("/admin/login")) {
        defaultRole = "ADMIN";
      } else if (path.includes("/clinician/login")) {
        defaultRole = "CLINICIAN";
      }
      
      // Create a mock user with appropriate role
      const userData: User = {
        id: `dev-${defaultRole.toLowerCase()}-${Date.now()}`,
        email: emailOrUsername.includes("@") ? emailOrUsername : `${emailOrUsername}@example.com`,
        username: emailOrUsername.includes("@") ? emailOrUsername.split("@")[0] : emailOrUsername,
        role: defaultRole,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      setLoading(false);
      return userData;
    }

    // Real API call — Feature 2: pass rememberMe to backend
    try {
      const response = await api.post("/api/auth/login", {
        emailOrUsername,
        password,
        rememberMe,
      });
      const userData = response.data.user;
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (error: unknown) {
      setUser(null);
      setLoading(false);
      let message = "Login failed";
      if (error && typeof error === "object" && "response" in error) {
        const raw = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (typeof raw === "string" && raw) message = raw;
      }
      throw new Error(message);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    role?: string,
    profileData?: Record<string, unknown>
  ) => {
    setLoading(true);
    
    if (DEV_MODE) {
      // Mock registration - create user and store in localStorage
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const userData: User = {
        id: `dev-${role?.toLowerCase() || "user"}-${Date.now()}`,
        email,
        username,
        role:
          role === "ADMIN" || role === "PATIENT" || role === "CAREGIVER" || role === "CLINICIAN"
            ? role
            : "PATIENT",
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      setUser(userData);
      setLoading(false);
      return userData;
    }

    // Real API call
    try {
      const response = await api.post("/api/auth/register", {
        email,
        username,
        password,
        role,
        profileData,
      });
      const userData = response.data.user;
      setUser(userData);
      setLoading(false);
      return userData;
    } catch (error: unknown) {
      setUser(null);
      setLoading(false);
      let message = "Registration failed";
      if (error && typeof error === "object" && "response" in error) {
        const raw = (error as { response?: { data?: { error?: string } } }).response?.data?.error;
        if (typeof raw === "string" && raw) message = raw;
      }
      throw new Error(message);
    }
  };

  const logout = async () => {
    setLoading(true);
    
    if (DEV_MODE) {
      // Mock logout - clear localStorage
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setLoading(false);
      return;
    }

    // Real API call
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
