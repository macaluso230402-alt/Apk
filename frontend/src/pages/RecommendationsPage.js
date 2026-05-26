import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Filter, Sun, Droplets, Shield } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function RecommendationsPage() {
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    pet_friendly: false,
    light: ''
  });

  useEffect(() => {
    fetchRecommendations();
  }, [filters]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/recommendations`, {
        user_id: 'demo-user',
        filters: filters.pet_friendly || filters.light ? filters : null
      });
      setRecommendations(response.data.recommendations);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      toast.error('Errore nel caricamento dei suggerimenti');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
            <ArrowLeft className="text-[#1A2E20]" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-[#1A2E20]">Piante Consigliate</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Filters */}
        <div className="plant-card p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-[#3E6A4B]" />
            <h2 className="text-lg font-bold text-[#1A2E20]">Filtri</h2>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.pet_friendly}
                onChange={(e) => setFilters({ ...filters, pet_friendly: e.target.checked })}
                className="w-4 h-4 text-[#3E6A4B] rounded"
                data-testid="filter-pet-friendly"
              />
              <span className="text-sm text-[#1A2E20]">Solo Pet-Friendly</span>
            </label>
            <Select
              value={filters.light || 'all'}
              onValueChange={(val) => setFilters({ ...filters, light: val === 'all' ? '' : val })}
            >
              <SelectTrigger
                className="w-48 bg-[#F3F5F1] border-none rounded-xl py-3 px-4 text-[#1A2E20] focus:ring-2 focus:ring-[#3E6A4B]/30"
                data-testid="filter-light"
              >
                <SelectValue placeholder="Tutte le luci" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" data-testid="filter-light-all">Tutte le luci</SelectItem>
                <SelectItem value="Bassa" data-testid="filter-light-bassa">Luce Bassa</SelectItem>
                <SelectItem value="Media" data-testid="filter-light-media">Luce Media</SelectItem>
                <SelectItem value="Alta" data-testid="filter-light-alta">Luce Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Recommendations Grid */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-[#8A9F8E]">Caricamento...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recommendations.map((plant, index) => (
              <div
                key={index}
                className="plant-card card-hover overflow-hidden"
                data-testid={`recommendation-card-${index}`}
              >
                <div className="h-48 bg-[#F3F5F1] overflow-hidden">
                  <img
                    src={plant.image}
                    alt={plant.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1614594975525-e45190c55d0b?w=400';
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="text-xl font-bold text-[#1A2E20] mb-2" data-testid={`recommendation-name-${index}`}>{plant.name}</h3>
                  <p className="text-sm text-[#5C7061] mb-4 line-clamp-2">{plant.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {plant.pet_friendly && (
                      <span className="badge-pet-friendly flex items-center gap-1">
                        <Shield size={12} />
                        Pet-Friendly
                      </span>
                    )}
                    <span className="badge-light flex items-center gap-1">
                      <Sun size={12} />
                      {plant.light}
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full" style={{ background: '#E2E8E4', color: '#1A2E20' }}>
                      {plant.difficulty}
                    </span>
                  </div>

                  <button className="btn-secondary w-full" data-testid={`learn-more-${index}`}>
                    Scopri di Più
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RecommendationsPage;