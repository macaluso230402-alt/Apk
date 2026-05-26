import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import PlantCard from '../components/PlantCard';
import { plantsCache, pendingOps } from '../lib/offlineStorage';

function DashboardPage() {
  const navigate = useNavigate();
  const [plants, setPlants] = useState(() => plantsCache.getAll());
  const [loading, setLoading] = useState(plantsCache.getAll().length === 0);

  const fetchPlants = useCallback(async () => {
    try {
      const response = await api.get('/api/plants');
      setPlants(response.data);
      plantsCache.setAll(response.data);
    } catch {
      // Offline: keep cached
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlants(); }, [fetchPlants]);

  const handleDelete = async (plantId) => {
    // Optimistic local delete
    plantsCache.remove(plantId);
    setPlants(plantsCache.getAll());
    try {
      await api.delete(`/api/plants/${plantId}`);
      toast.success('Pianta eliminata');
    } catch {
      pendingOps.add({ kind: 'delete-plant', payload: { plantId } });
      toast.success('Pianta eliminata (sync quando torni online)');
    }
  };

  const renderContent = () => {
    if (loading) return <div className="text-center py-12"><p className="text-[#8A9F8E]">Caricamento...</p></div>;
    if (plants.length === 0) {
      return (
        <div className="text-center py-20" data-testid="empty-state">
          <img src="https://static.prod-images.emergentagent.com/jobs/fc22e919-67b0-4f8b-81a4-00da1c9ce78d/images/5ab278cc4504608db7b7b7a83584ffc1038bdeaadde0a0e09fe6d15dd9b8d84b.png" alt="Empty collection" className="w-64 h-64 object-contain mx-auto mb-6 opacity-60" />
          <h2 className="text-2xl font-bold text-[#1A2E20] mb-4">Nessuna Pianta Ancora</h2>
          <p className="text-base text-[#5C7061] mb-8">Inizia scansionando la tua prima pianta!</p>
          <button onClick={() => navigate('/scanner')} className="btn-primary" data-testid="empty-scan-button">Scansiona Pianta</button>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plants.map((plant, index) => (
          <PlantCard key={plant.id} plant={plant} index={index} onView={(id) => navigate(`/plant/${id}`)} onDelete={handleDelete} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
              <ArrowLeft className="text-[#1A2E20]" size={24} />
            </button>
            <h1 className="text-2xl font-bold text-[#1A2E20]">Le Mie Piante</h1>
          </div>
          <button onClick={() => navigate('/scanner')} className="btn-primary flex items-center gap-2" data-testid="add-plant-button">
            <Plus size={20} /> Aggiungi
          </button>
        </div>
      </header>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">{renderContent()}</div>
    </div>
  );
}

export default DashboardPage;
