import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Droplets, Sun } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;
const REQUIREMENT_LABEL_MAX_CHARS = 30;

function EmptyState({ onScan }) {
  return (
    <div className="text-center py-20" data-testid="empty-state">
      <img
        src="https://static.prod-images.emergentagent.com/jobs/fc22e919-67b0-4f8b-81a4-00da1c9ce78d/images/5ab278cc4504608db7b7b7a83584ffc1038bdeaadde0a0e09fe6d15dd9b8d84b.png"
        alt="Empty collection"
        className="w-64 h-64 object-contain mx-auto mb-6 opacity-60"
      />
      <h2 className="text-2xl font-bold text-[#1A2E20] mb-4">Nessuna Pianta Ancora</h2>
      <p className="text-base text-[#5C7061] mb-8">Inizia scansionando la tua prima pianta!</p>
      <button onClick={onScan} className="btn-primary" data-testid="empty-scan-button">
        Scansiona Pianta
      </button>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPlants = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/plants/demo-user`);
      setPlants(response.data);
    } catch {
      toast.error('Errore nel caricamento delle piante');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlants();
  }, [fetchPlants]);

  const handleDelete = async (plantId) => {
    try {
      await axios.delete(`${API_URL}/api/plants/${plantId}?user_id=demo-user`);
      toast.success('Pianta eliminata');
      fetchPlants();
    } catch {
      toast.error('Errore durante l\'eliminazione');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <p className="text-[#8A9F8E]">Caricamento...</p>
        </div>
      );
    }
    if (plants.length === 0) {
      return <EmptyState onScan={() => navigate('/scanner')} />;
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plants.map((plant, index) => (
          <div
            key={plant.id}
            className="plant-card card-hover cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${index * 0.1}s` }}
            data-testid={`plant-card-${index}`}
          >
            {plant.image_url && (
              <div className="h-48 bg-[#F3F5F1] flex items-center justify-center">
                <div className="w-full h-full flex items-center justify-center text-[#8A9F8E]">
                  Immagine pianta
                </div>
              </div>
            )}
            <div className="p-4">
              <h3 className="text-xl font-bold text-[#1A2E20] mb-1" data-testid={`plant-name-${index}`}>{plant.common_name}</h3>
              {plant.scientific_name && (
                <p className="text-sm text-[#8A9F8E] italic mb-3">{plant.scientific_name}</p>
              )}
              <div className="flex flex-wrap gap-2 mb-4">
                {plant.pet_friendly && (
                  <span className="badge-pet-friendly">Pet-Friendly</span>
                )}
                {plant.light_requirement && (
                  <span className="badge-light flex items-center gap-1">
                    <Sun size={12} />
                    {plant.light_requirement.substring(0, REQUIREMENT_LABEL_MAX_CHARS)}
                  </span>
                )}
                {plant.water_requirement && (
                  <span className="badge-water flex items-center gap-1">
                    <Droplets size={12} />
                    {plant.water_requirement.substring(0, REQUIREMENT_LABEL_MAX_CHARS)}
                  </span>
                )}
              </div>
              {plant.description && (
                <p className="text-sm text-[#5C7061] mb-4 line-clamp-2">{plant.description}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/plant/${plant.id}`)}
                  className="btn-secondary flex-1"
                  data-testid={`view-plant-${index}`}
                >
                  Dettagli
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(plant.id);
                  }}
                  className="p-3 hover:bg-red-50 rounded-full text-red-600 transition-colors"
                  data-testid={`delete-plant-${index}`}
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
              <ArrowLeft className="text-[#1A2E20]" size={24} />
            </button>
            <h1 className="text-2xl font-bold text-[#1A2E20]">Le Mie Piante</h1>
          </div>
          <button
            onClick={() => navigate('/scanner')}
            className="btn-primary flex items-center gap-2"
            data-testid="add-plant-button"
          >
            <Plus size={20} />
            Aggiungi
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </div>
    </div>
  );
}

export default DashboardPage;
