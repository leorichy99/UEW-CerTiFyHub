/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { username, email, profile: { role, permissions, ... } }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          // Validate token or just fetch profile
          const { data } = await authAPI.me();
          setUser(data);
        } catch (error) {
          console.error("Auth initialization failed:", error);
          // If 401, maybe refresh? For now, just logout
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password) => {
    const response = await authAPI.login({ username, password });
    const { access, refresh } = response.data;

    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);

    // Fetch user details immediately after login
    const userResponse = await authAPI.me();
    const userData = userResponse.data;
    setUser(userData);
    return userData;
  };

  const refreshUser = async () => {
    try {
      const { data } = await authAPI.me();
      setUser(data);
      return data;
    } catch {
      return null;
    }
  };

  const hasPermission = (permKey) => {
    if (!user) return false;
    const profile = user.profile;
    if (!profile) return false;
    // Super Admins bypass all permission checks
    if (profile.role === 'SUPER_ADMIN') return true;
    return !!profile.permissions?.[permKey];
  };

  const isSuperAdmin = user?.profile?.role === 'SUPER_ADMIN';

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        refreshUser,
        hasPermission,
        isSuperAdmin,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
