/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // { username, email, profile: { role, ... } }
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
    setUser(userResponse.data);
    return userResponse.data;
  };

  const register = async (formData) => {
    return await authAPI.register(formData);
  };

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
        register,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
