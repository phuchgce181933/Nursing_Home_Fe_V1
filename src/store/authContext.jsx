import { createContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/auth.service';
import { getAuthToken, removeAuthToken } from '../utils/auth';
import socketService from '../services/socket.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getAuthToken());

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const profile = await authService.fetchProfile();
        setUser(profile);
      } catch {
        setToken(null);
        removeAuthToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    if (token && !user) {
      loadProfile();
    } else {
      setLoading(false);
    }
  }, [token, user]);

  // connect socket and join role room for admin users
  useEffect(() => {
    if (!user) return;
    try {
      socketService.connect();
      if (user.role === 'admin') {
        socketService.joinRoom('role:admin');
      }
    } catch (e) {
      console.warn('Socket connect/join failed', e.message || e);
    }

    return () => {
      try {
        if (user && user.role === 'admin') {
          socketService.leaveRoom('role:admin');
        }
        socketService.disconnect();
      } catch (e) {}
    };
  }, [user]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setToken(data.token);

    try {
      const profile = await authService.fetchProfile();
      setUser(profile);
      return profile;
    } catch {
      setUser(data.user);
      return data;
    }
  };

  const refreshUser = async () => {
    if (!token) {
      return null;
    }

    const profile = await authService.fetchProfile();
    setUser(profile);
    return profile;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
    setLoading(false);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, logout, refreshUser }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
