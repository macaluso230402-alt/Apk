import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, User } from 'lucide-react';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await register(email, password, name);
      navigate('/');
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="text-[#3E6A4B]" size={32} strokeWidth={1.5} />
            <h1 className="text-3xl font-bold text-[#1A2E20]">PlantCare</h1>
          </div>
          <p className="text-sm text-[#5C7061]">Inizia a curare le tue piante</p>
        </div>

        <div className="plant-card p-8">
          <h2 className="text-2xl font-bold text-[#1A2E20] mb-6">Crea Account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Nome</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-[#8A9F8E]" size={18} />
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-10"
                  data-testid="register-name"
                  placeholder="Il tuo nome"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-[#8A9F8E]" size={18} />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  data-testid="register-email"
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-[#8A9F8E]" size={18} />
                <input
                  type="password" required minLength={6} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  data-testid="register-password"
                  placeholder="Min 6 caratteri"
                />
              </div>
            </div>
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-sm" data-testid="register-error">
                {error}
              </div>
            )}
            <button
              type="submit" disabled={submitting}
              className="btn-primary w-full disabled:opacity-50"
              data-testid="register-submit"
            >
              {submitting ? 'Registrazione...' : 'Registrati'}
            </button>
          </form>
          <p className="text-sm text-[#5C7061] text-center mt-6">
            Hai già un account?{' '}
            <Link to="/login" className="text-[#3E6A4B] font-medium hover:underline" data-testid="link-login">
              Accedi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
