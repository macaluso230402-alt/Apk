import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null = checking, false = anonymous, object = logged in
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch (err) {
      // Not authenticated or session expired — expected on first load.
      if (err?.response && err.response.status !== 401 && process.env.NODE_ENV !== 'production') {
        console.error('Auth refresh failed:', err);
      }
      setUser(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setUser(data);
    return data;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const { data } = await api.post('/api/auth/register', { email, password, name });
    setUser(data);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Logout request failed:', err);
      }
    }
    setUser(false);
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/api/auth/me', payload);
    setUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile, refresh }),
    [user, loading, login, register, logout, updateProfile, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export function formatApiErrorDetail(detail) {
  if (detail == null) return 'Si è verificato un errore. Riprova.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}
