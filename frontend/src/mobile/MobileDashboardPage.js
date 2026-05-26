import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Sun, Droplets } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

export default function MobileDashboardPage() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlants = useCallback(async () => {
    try {
      const r = await api.get('/api/plants');
      setPlants(r.data);
    } catch {
      toast.error('Errore caricamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlants(); }, [fetchPlants]);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/api/plants/${id}`);
      toast.success('Pianta eliminata');
      fetchPlants();
    } catch {
      toast.error("Errore eliminazione");
    }
  };

  const renderContent = () => {
    if (loading) return <p className="text-center text-[#8A9F8E] py-8">Caricamento...</p>;
    if (plants.length === 0) {
      return (
        <div className="text-center py-16">
          <p className="text-base font-bold text-[#1A2E20] mb-2">Nessuna pianta ancora</p>
          <p className="text-sm text-[#5C7061] mb-6">Inizia scansionando la tua prima pianta</p>
          <button onClick={() => navigate('/scanner')} className="btn-primary" data-testid="mob-empty-scan">Scansiona</button>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {plants.map((plant, idx) => (
          <div
            key={plant.id}
            onClick={() => navigate(`/plant/${plant.id}`)}
            className="plant-card overflow-hidden flex cursor-pointer card-hover"
            data-testid={`mob-plant-card-${idx}`}
          >
            {plant.image_url && plant.image_url.startsWith('data:') ? (
              <img src={plant.image_url} alt="" className="w-24 h-24 object-cover flex-shrink-0" />
            ) : (
              <div className="w-24 h-24 bg-[#F3F5F1] flex-shrink-0" />
            )}
            <div className="flex-1 p-3 min-w-0">
              <h3 className="text-base font-bold text-[#1A2E20] truncate" data-testid={`mob-plant-name-${idx}`}>{plant.common_name}</h3>
              {plant.scientific_name && <p className="text-xs text-[#8A9F8E] italic truncate mb-2">{plant.scientific_name}</p>}
              <div className="flex flex-wrap gap-1">
                {plant.pet_friendly && <span className="badge-pet-friendly text-[10px]">Pet</span>}
                {plant.light_requirement && (
                  <span className="badge-light text-[10px] flex items-center gap-1">
                    <Sun size={10} />{plant.light_requirement.substring(0, 12)}
                  </span>
                )}
                {plant.water_requirement && (
                  <span className="badge-water text-[10px] flex items-center gap-1">
                    <Droplets size={10} />{plant.water_requirement.substring(0, 12)}
                  </span>
                )}
              </div>
            </div>
            <button onClick={(e) => handleDelete(plant.id, e)} className="px-3 text-red-600 active:bg-red-50" data-testid={`mob-delete-${idx}`}>
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const addButton = (
    <button onClick={() => navigate('/scanner')} className="p-2 rounded-full hover:bg-[#F3F5F1]" data-testid="mob-add-plant">
      <Plus size={22} className="text-[#3E6A4B]" />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Le Mie Piante" right={addButton} />
      <div className="px-4 py-4">{renderContent()}</div>
      <MobileBottomNav />
    </div>
  );
}
