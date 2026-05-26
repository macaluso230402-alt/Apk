import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Leaf, Bell, BookOpen, Sparkles, Shield, Sun } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [potw, setPotw] = useState(null);

  const fetchPotw = useCallback(async () => {
    try {
      const res = await api.get('/api/plant-of-the-week');
      setPotw(res.data);
    } catch {
      setPotw(null);
    }
  }, []);

  useEffect(() => { fetchPotw(); }, [fetchPotw]);

  return (
    <div className="min-h-screen">
      <header className="glassmorphism-header sticky top-0 z-50 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="text-[#3E6A4B]" size={28} strokeWidth={1.5} />
            <h1 className="text-2xl font-bold text-[#1A2E20]">PlantCare</h1>
          </div>
          <nav className="flex gap-6 items-center">
            <button onClick={() => navigate('/scanner')} className="text-[#5C7061] hover:text-[#1A2E20] transition-colors" data-testid="nav-scanner">Scanner</button>
            <button onClick={() => navigate('/dashboard')} className="text-[#5C7061] hover:text-[#1A2E20] transition-colors" data-testid="nav-dashboard">Le Mie Piante</button>
            <button onClick={() => navigate('/recommendations')} className="text-[#5C7061] hover:text-[#1A2E20] transition-colors" data-testid="nav-recommendations">Consigli</button>
            <button onClick={() => navigate('/reminders')} className="text-[#5C7061] hover:text-[#1A2E20] transition-colors" data-testid="nav-reminders">Promemoria</button>
            <button onClick={() => navigate('/profile')} className="text-[#5C7061] hover:text-[#1A2E20] transition-colors" data-testid="nav-profile">Profilo</button>
          </nav>
        </div>
      </header>

      <section className="relative py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-none mb-6 text-[#1A2E20]">
                Ciao{user?.name ? `, ${user.name}` : ''} 🌿
              </h1>
              <p className="text-base sm:text-lg text-[#5C7061] leading-relaxed mb-8">
                Riconosci qualsiasi pianta con una foto e ricevi guide personalizzate di cura, manutenzione e propagazione.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button onClick={() => navigate('/scanner')} className="btn-primary flex items-center gap-2 justify-center" data-testid="hero-scan-button">
                  <Camera size={20} /> Scansiona Pianta
                </button>
                <button onClick={() => navigate('/recommendations')} className="btn-secondary" data-testid="hero-recommendations-button">
                  Scopri Piante
                </button>
              </div>
            </div>
            <div className="relative">
              <img src="https://static.prod-images.emergentagent.com/jobs/fc22e919-67b0-4f8b-81a4-00da1c9ce78d/images/ba1323f69add86122e20bbb5820bb9e748a9f6a6040d642a5b11364f3cd01cdf.png" alt="Indoor Plant" className="w-full h-auto rounded-2xl shadow-lg" />
            </div>
          </div>
        </div>
      </section>

      {potw && potw.plant && (
        <section className="py-16 bg-[#FDFBF7]" data-testid="plant-of-the-week-section">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-2 justify-center lg:justify-start">
              <Sparkles className="text-[#E07A5F]" size={20} strokeWidth={1.5} />
              <span className="text-xs uppercase tracking-[0.2em] text-[#8A9F8E]">Pianta della Settimana</span>
            </div>
            <div className="plant-card overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-0 card-hover">
              <div className="h-64 lg:h-auto bg-[#F3F5F1] overflow-hidden">
                <img src={potw.plant.image} alt={potw.plant.name} className="w-full h-full object-cover" data-testid="potw-image" />
              </div>
              <div className="p-8 lg:p-12 flex flex-col justify-center">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight mb-3 text-[#1A2E20]" data-testid="potw-name">{potw.plant.name}</h2>
                <p className="text-base text-[#5C7061] leading-relaxed mb-4" data-testid="potw-description">{potw.plant.description}</p>
                {potw.plant.fun_fact && (
                  <div className="bg-[#F3F5F1] rounded-xl p-4 mb-4 border-l-4 border-[#E07A5F]" data-testid="potw-fun-fact">
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Lo sapevi?</p>
                    <p className="text-sm text-[#1A2E20] italic">{potw.plant.fun_fact}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mb-6">
                  {potw.plant.pet_friendly && <span className="badge-pet-friendly flex items-center gap-1"><Shield size={12} /> Pet-Friendly</span>}
                  <span className="badge-light flex items-center gap-1"><Sun size={12} /> {potw.plant.light}</span>
                  <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#E2E8E4', color: '#1A2E20' }}>{potw.plant.difficulty}</span>
                </div>
                <button onClick={() => navigate('/recommendations')} className="btn-primary self-start" data-testid="potw-explore-button">
                  Esplora Altre Piante
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-[#F3F5F1]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-center mb-12 text-[#1A2E20]">Funzionalità Principali</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="plant-card p-6 card-hover" data-testid="feature-identify">
              <div className="w-12 h-12 rounded-full bg-[#E6F4EA] flex items-center justify-center mb-4">
                <Camera className="text-[#3E6A4B]" size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#1A2E20]">Riconoscimento AI</h3>
              <p className="text-base text-[#5C7061] leading-relaxed">Identifica piante istantaneamente con Gemini Vision. Precisione garantita.</p>
            </div>
            <div className="plant-card p-6 card-hover" data-testid="feature-guides">
              <div className="w-12 h-12 rounded-full bg-[#FFF8E7] flex items-center justify-center mb-4">
                <BookOpen className="text-[#B58500]" size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#1A2E20]">Guide e Propagazione</h3>
              <p className="text-base text-[#5C7061] leading-relaxed">Cura personalizzata + istruzioni di propagazione e talee per ogni pianta.</p>
            </div>
            <div className="plant-card p-6 card-hover" data-testid="feature-reminders">
              <div className="w-12 h-12 rounded-full bg-[#E8F1F2] flex items-center justify-center mb-4">
                <Bell className="text-[#1B6CA8]" size={24} strokeWidth={1.5} />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-[#1A2E20]">Promemoria Stagionali</h3>
              <p className="text-base text-[#5C7061] leading-relaxed">Notifiche per annaffiatura e per la stagione ideale di propagazione.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default HomePage;
