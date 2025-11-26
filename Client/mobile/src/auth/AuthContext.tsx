import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  login: (emailOrUsername: string, password: string) => Promise<User>;
  register: (email: string, username: string, password: string, role?: string, profileData?: any) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
  }, []);

  const refreshUser = async () => {
    try {
      const response = await api.get("/api/auth/me");
      setUser(response.data.user);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(response.data.user));
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  };

  const login = async (emailOrUsername: string, password: string) => {
    setLoading(true);
    try {
      const response = await api.post("/api/auth/login", {
        emailOrUsername,
        password,
      });

      const userData = response.data.user;
      setUser(userData);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return userData;
    } catch (error: any) {
      console.error("Login failed:", error);
      throw new Error(error.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    username: string,
    password: string,
    role: string = "PATIENT",
    profileData?: any
  ) => {
    setLoading(true);
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
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      return userData;
    } catch (error: any) {
      console.error("Registration failed:", error);
      throw new Error(error.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
