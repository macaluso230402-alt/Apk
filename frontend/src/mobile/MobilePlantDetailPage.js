import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Droplets, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import PropagationSection from '../components/PropagationSection';
import JournalSection from '../components/JournalSection';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { plantsCache, pendingOps } from '../lib/offlineStorage';

export default function MobilePlantDetailPage() {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const [plant, setPlant] = useState(() => plantsCache.getById(plantId));
  const [loading, setLoading] = useState(!plantsCache.getById(plantId));

  const fetchPlant = useCallback(async () => {
    try {
      const r = await api.get(`/api/plants/${plantId}`);
      setPlant(r.data);
      plantsCache.upsert(r.data);
    } catch {
      if (!plantsCache.getById(plantId)) {
        toast.error('Pianta non trovata');
        navigate('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [plantId, navigate]);

  useEffect(() => { fetchPlant(); }, [fetchPlant]);

  const handleDelete = async () => {
    plantsCache.remove(plantId);
    try {
      await api.delete(`/api/plants/${plantId}`);
      toast.success('Pianta eliminata');
    } catch {
      pendingOps.add({ kind: 'delete-plant', payload: { plantId } });
      toast.success('Eliminata (sync offline)');
    }
    navigate('/dashboard');
  };

  if (loading || !plant) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <p className="text-[#8A9F8E]">Caricamento...</p>
      </div>
    );
  }

  const deleteBtn = (
    <button onClick={handleDelete} className="p-2 rounded-full hover:bg-red-50 text-red-600" data-testid="mob-delete-plant">
      <Trash2 size={20} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Dettagli" showBack right={deleteBtn} />
      <div className="px-4 py-4 space-y-4">
        <div className="plant-card overflow-hidden">
          {plant.image_url && plant.image_url.startsWith('data:') && (
            <img src={plant.image_url} alt="" className="w-full h-56 object-cover" />
          )}
          <div className="p-4">
            <h2 className="text-2xl font-bold text-[#1A2E20] mb-1" data-testid="mob-detail-name">{plant.common_name}</h2>
            {plant.scientific_name && <p className="text-xs text-[#8A9F8E] italic mb-3">{plant.scientific_name}</p>}
            {plant.description && <p className="text-sm text-[#5C7061] leading-relaxed mb-4">{plant.description}</p>}

            <div className="flex flex-wrap gap-2 mb-4">
              {plant.pet_friendly && <span className="badge-pet-friendly">Pet-Friendly</span>}
            </div>

            <div className="bg-[#F3F5F1] rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-[#1A2E20] mb-2">Esigenze</h3>
              {plant.water_requirement && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#E8F1F2] flex items-center justify-center flex-shrink-0">
                    <Droplets className="text-[#1B6CA8]" size={16} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E]">Annaffiatura</p>
                    <p className="text-sm text-[#1A2E20]">{plant.water_requirement}</p>
                  </div>
                </div>
              )}
              {plant.light_requirement && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#FFF8E7] flex items-center justify-center flex-shrink-0">
                    <Sun className="text-[#B58500]" size={16} />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E]">Luce</p>
                    <p className="text-sm text-[#1A2E20]">{plant.light_requirement}</p>
                  </div>
                </div>
              )}
            </div>

            <PropagationSection propagation={plant.propagation} />
            <JournalSection plantId={plant.id} />
          </div>
        </div>
      </div>
      <MobileBottomNav />
    </div>
  );
}
