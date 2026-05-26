import React from 'react';
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
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFBF7] px-6 text-center">
        <p className="text-xl font-bold text-[#1A2E20] mb-2">Connessione impossibile</p>
        <p className="text-sm text-[#5C7061] mb-6">Il backend non risponde. Riprova più tardi.</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
          data-testid="retry-button"
        >
          Riprova
        </button>
      </div>
    );
  }
  return children;
}
