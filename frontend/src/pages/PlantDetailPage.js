import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Droplets, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import PropagationSection from '../components/PropagationSection';

function PlantDetailPage() {
  const navigate = useNavigate();
  const { plantId } = useParams();
  const [plant, setPlant] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchPlant = useCallback(async () => {
    try {
      const response = await api.get(`/api/plants/${plantId}`);
      setPlant(response.data);
    } catch {
      toast.error('Pianta non trovata');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [plantId, navigate]);

  useEffect(() => { fetchPlant(); }, [fetchPlant]);

  const handleDelete = async () => {
    try {
      await api.delete(`/api/plants/${plantId}`);
      toast.success('Pianta eliminata');
      navigate('/dashboard');
    } catch {
      toast.error("Errore durante l'eliminazione");
    }
  };

  if (loading || !plant) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <p className="text-[#8A9F8E]">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
              <ArrowLeft className="text-[#1A2E20]" size={24} />
            </button>
            <h1 className="text-2xl font-bold text-[#1A2E20]">Dettagli Pianta</h1>
          </div>
          <button onClick={handleDelete} className="p-2 hover:bg-red-50 rounded-full text-red-600 transition-colors" data-testid="delete-plant-btn">
            <Trash2 size={20} />
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="plant-card p-6 mb-6">
          {plant.image_url && plant.image_url.startsWith('data:') && (
            <img src={plant.image_url} alt={plant.common_name} className="w-full h-64 object-cover rounded-lg mb-6" />
          )}
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#1A2E20]" data-testid="plant-detail-name">{plant.common_name}</h2>
          {plant.scientific_name && <p className="text-sm text-[#8A9F8E] italic mb-4">{plant.scientific_name}</p>}
          {plant.description && <p className="text-base text-[#5C7061] leading-relaxed mb-6">{plant.description}</p>}

          <div className="flex flex-wrap gap-2 mb-6">
            {plant.pet_friendly && <span className="badge-pet-friendly">Pet-Friendly</span>}
          </div>

          <div className="bg-[#F3F5F1] rounded-xl p-4 space-y-3">
            <h3 className="text-lg font-bold text-[#1A2E20] mb-3">Esigenze</h3>
            {plant.water_requirement && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#E8F1F2] flex items-center justify-center flex-shrink-0">
                  <Droplets className="text-[#1B6CA8]" size={20} />
                </div>
                <div>
                  <p className="font-medium text-[#1A2E20]">Annaffiatura</p>
                  <p className="text-sm text-[#5C7061]">{plant.water_requirement}</p>
                </div>
              </div>
            )}
            {plant.light_requirement && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFF8E7] flex items-center justify-center flex-shrink-0">
                  <Sun className="text-[#B58500]" size={20} />
                </div>
                <div>
                  <p className="font-medium text-[#1A2E20]">Luce</p>
                  <p className="text-sm text-[#5C7061]">{plant.light_requirement}</p>
                </div>
              </div>
            )}
          </div>

          <PropagationSection propagation={plant.propagation} />
        </div>
      </div>
    </div>
  );
}

export default PlantDetailPage;
