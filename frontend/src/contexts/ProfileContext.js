import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import api from '../lib/api';
import { profileCache, pendingOps } from '../lib/offlineStorage';
import { flushQueue } from '../lib/syncQueue';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  // Cache-first initial state
  const [profile, setProfile] = useState(() => profileCache.get());
  const [loading, setLoading] = useState(!profileCache.get());

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/api/profile');
      setProfile(data);
      profileCache.set(data);
    } catch {
      // Offline: keep cached profile
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    flushQueue();
  }, [refresh]);

  const updateProfile = useCallback(async (payload) => {
    // Optimistic local update
    const next = { ...(profile || {}), ...payload };
    setProfile(next);
    profileCache.set(next);
    try {
      const { data } = await api.put('/api/profile', payload);
      setProfile(data);
      profileCache.set(data);
      return data;
    } catch {
      // Queue for sync when back online
      pendingOps.add({ kind: 'update-profile', payload });
      return next;
    }
  }, [profile]);

  const value = useMemo(() => ({ profile, loading, refresh, updateProfile }), [profile, loading, refresh, updateProfile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export const useProfile = () => useContext(ProfileContext);

export function formatApiErrorDetail(detail) {
  if (detail == null) return 'Si è verificato un errore. Riprova.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e))).filter(Boolean).join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
}
