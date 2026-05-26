import React, { useEffect, useState, useCallback } from 'react';
import { Filter, Sun, Shield } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { recommendationsCache } from '../lib/offlineStorage';

export default function MobileRecommendationsPage() {
  const [recs, setRecs] = useState(() => recommendationsCache.get() || []);
  const [loading, setLoading] = useState(!recommendationsCache.get());
  const [filters, setFilters] = useState({ pet_friendly: false, light: '' });

  const fetchRecs = useCallback(async () => {
    setLoading(recs.length === 0);
    try {
      const r = await api.post('/api/recommendations', {
        filters: filters.pet_friendly || filters.light ? filters : null,
      });
      setRecs(r.data.recommendations);
      if (!filters.pet_friendly && !filters.light) {
        recommendationsCache.set(r.data.recommendations);
      }
    } catch {
      const cached = recommendationsCache.get() || [];
      let filtered = cached;
      if (filters.pet_friendly) filtered = filtered.filter((r) => r.pet_friendly);
      if (filters.light) filtered = filtered.filter((r) => r.light?.includes(filters.light));
      setRecs(filtered);
      if (cached.length === 0) toast.error('Nessun dato disponibile offline');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => { fetchRecs(); }, [fetchRecs]);

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Piante Consigliate" />

      <div className="px-4 py-4 space-y-3">
        <div className="plant-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-[#3E6A4B]" />
            <span className="text-sm font-bold text-[#1A2E20]">Filtri</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilters({ ...filters, pet_friendly: !filters.pet_friendly })}
              className={`text-xs px-3 py-1.5 rounded-full transition ${filters.pet_friendly ? 'bg-[#3E6A4B] text-white' : 'bg-[#F3F5F1] text-[#1A2E20]'}`}
              data-testid="mob-filter-pet"
            >
              Pet-Friendly
            </button>
            {['Bassa', 'Media', 'Alta'].map((l) => (
              <button
                key={l}
                onClick={() => setFilters({ ...filters, light: filters.light === l ? '' : l })}
                className={`text-xs px-3 py-1.5 rounded-full transition ${filters.light === l ? 'bg-[#3E6A4B] text-white' : 'bg-[#F3F5F1] text-[#1A2E20]'}`}
                data-testid={`mob-filter-light-${l.toLowerCase()}`}
              >
                Luce {l}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-center text-[#8A9F8E] py-8">Caricamento...</p>
        ) : (
          <div className="space-y-3">
            {recs.map((plant, idx) => (
              <div key={plant.name} className="plant-card overflow-hidden" data-testid={`mob-rec-${idx}`}>
                <img src={plant.image} alt={plant.name} className="w-full h-40 object-cover" />
                <div className="p-3">
                  <h3 className="text-base font-bold text-[#1A2E20] mb-1" data-testid={`mob-rec-name-${idx}`}>{plant.name}</h3>
                  <p className="text-xs text-[#5C7061] mb-3 line-clamp-2">{plant.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {plant.pet_friendly && <span className="badge-pet-friendly text-[10px] flex items-center gap-1"><Shield size={10} />Pet</span>}
                    <span className="badge-light text-[10px] flex items-center gap-1"><Sun size={10} />{plant.light}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: '#E2E8E4', color: '#1A2E20' }}>{plant.difficulty}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
