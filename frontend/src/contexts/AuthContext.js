import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);

// Auto-login credentials (single-user private app).
const AUTO_LOGIN_EMAIL = 'admin@plantcare.com';
const AUTO_LOGIN_PASSWORD = 'admin123';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/auth/me');
      setUser(data);
    } catch {
      // Not authenticated → try silent auto-login
      try {
        const { data } = await api.post('/api/auth/login', {
          email: AUTO_LOGIN_EMAIL,
          password: AUTO_LOGIN_PASSWORD,
        });
        setUser(data);
      } catch (loginErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.error('Auto-login failed:', loginErr);
        }
        setUser(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (payload) => {
    const { data } = await api.put('/api/auth/me', payload);
    setUser(data);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, loading, updateProfile, refresh }),
    [user, loading, updateProfile, refresh]
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
