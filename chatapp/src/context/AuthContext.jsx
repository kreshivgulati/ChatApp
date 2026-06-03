import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const API = import.meta.env.VITE_API_URL;
console.log("VITE_API_URL =", import.meta.env.VITE_API_URL);
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    axios.get(`${API}/auth/me`, { withCredentials: true })
      .then(res => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    window.location.href = `${API}/auth/logout`;
  };

  const login = () => {
    setShowLoader(true);
    window.location.href = `${API}/auth/google`;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, showLoader, setShowLoader }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);