import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Sparkles, Shield, Sun, Leaf } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import MobileBottomNav from './MobileBottomNav';

export default function MobileHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [potw, setPotw] = useState(null);

  const fetchPotw = useCallback(async () => {
    try {
      const r = await api.get('/api/plant-of-the-week');
      setPotw(r.data);
    } catch (err) {
      console.error('Failed to load plant of the week:', err);
    }
  }, []);

  useEffect(() => { fetchPotw(); }, [fetchPotw]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-lg border-b border-[#E2E8E4]">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Leaf className="text-[#3E6A4B]" size={22} strokeWidth={1.5} />
            <span className="text-lg font-bold text-[#1A2E20]">PlantCare</span>
          </div>
          <span className="text-xs text-[#8A9F8E]">Ciao {user?.name?.split(' ')[0] || ''}</span>
        </div>
      </header>

      <div className="px-4 py-6">
        <h1 className="text-3xl font-bold tracking-tight text-[#1A2E20] mb-2 leading-tight">
          Cura le tue piante con l'AI 🌿
        </h1>
        <p className="text-sm text-[#5C7061] leading-relaxed mb-6">
          Riconosci, cura e propaga le tue piante in pochi tap.
        </p>

        <button
          onClick={() => navigate('/scanner')}
          className="w-full bg-[#3E6A4B] hover:bg-[#2C4C35] text-white rounded-2xl p-5 flex items-center justify-between transition-colors mb-6"
          data-testid="mob-hero-scan"
        >
          <div className="text-left">
            <p className="text-xs uppercase tracking-wider opacity-80">Inizia ora</p>
            <p className="text-lg font-bold">Scansiona una pianta</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Camera size={22} />
          </div>
        </button>

        {potw && potw.plant && (
          <section data-testid="mob-potw">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[#E07A5F]" />
              <span className="text-xs uppercase tracking-[0.2em] text-[#8A9F8E]">Pianta della Settimana</span>
            </div>
            <div className="plant-card overflow-hidden">
              <div className="h-48 bg-[#F3F5F1] overflow-hidden">
                <img src={potw.plant.image} alt={potw.plant.name} className="w-full h-full object-cover" data-testid="mob-potw-image" />
              </div>
              <div className="p-4">
                <h2 className="text-xl font-bold text-[#1A2E20] mb-1" data-testid="mob-potw-name">{potw.plant.name}</h2>
                <p className="text-sm text-[#5C7061] mb-3 leading-relaxed">{potw.plant.description}</p>
                {potw.plant.fun_fact && (
                  <div className="bg-[#F3F5F1] rounded-xl p-3 mb-3 border-l-4 border-[#E07A5F]">
                    <p className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-1">Lo sapevi?</p>
                    <p className="text-xs text-[#1A2E20] italic">{potw.plant.fun_fact}</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  {potw.plant.pet_friendly && <span className="badge-pet-friendly flex items-center gap-1"><Shield size={10} /> Pet</span>}
                  <span className="badge-light flex items-center gap-1"><Sun size={10} /> {potw.plant.light}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="grid grid-cols-2 gap-3 mt-6">
          <button onClick={() => navigate('/recommendations')} className="plant-card p-4 text-left card-hover" data-testid="mob-quick-recommendations">
            <div className="w-10 h-10 rounded-full bg-[#FFF8E7] flex items-center justify-center mb-3">
              <Sparkles size={18} className="text-[#B58500]" />
            </div>
            <p className="text-sm font-bold text-[#1A2E20]">Consigli</p>
            <p className="text-xs text-[#5C7061]">Scopri nuove piante</p>
          </button>
          <button onClick={() => navigate('/dashboard')} className="plant-card p-4 text-left card-hover" data-testid="mob-quick-plants">
            <div className="w-10 h-10 rounded-full bg-[#E6F4EA] flex items-center justify-center mb-3">
              <Leaf size={18} className="text-[#3E6A4B]" />
            </div>
            <p className="text-sm font-bold text-[#1A2E20]">Le Mie Piante</p>
            <p className="text-xs text-[#5C7061]">Cura quotidiana</p>
          </button>
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
