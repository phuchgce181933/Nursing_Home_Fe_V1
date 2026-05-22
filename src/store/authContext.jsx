import { createContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/auth.service';
import { getAuthToken, removeAuthToken } from '../utils/auth';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const profile = await authService.fetchProfile();
        setUser(profile);
      } catch {
        setToken(null);
        removeAuthToken();
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [token]);

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const updateProfile = async (profileData) => {
    const updatedUser = await authService.updateProfile(profileData);
    setUser((prev) => ({ ...prev, ...updatedUser }));
    return updatedUser;
  };

  const logout = () => {
    authService.logout();
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ token, user, loading, login, logout, updateProfile }),
    [token, user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
