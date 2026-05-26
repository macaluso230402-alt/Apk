import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading || user === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFBF7]">
        <p className="text-[#8A9F8E]">Caricamento...</p>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
