import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Droplets, Sun, AlertCircle } from 'lucide-react';

function PlantDetailPage() {
  const navigate = useNavigate();
  const { plantId } = useParams();

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate('/dashboard')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
            <ArrowLeft className="text-[#1A2E20]" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-[#1A2E20]">Dettagli Pianta</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="plant-card p-6 mb-6">
          <div className="h-64 bg-[#F3F5F1] rounded-lg mb-6 flex items-center justify-center">
            <p className="text-[#8A9F8E]">Immagine pianta</p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#1A2E20]" data-testid="plant-detail-name">Nome Pianta</h2>
          <p className="text-sm text-[#8A9F8E] italic mb-4">Nome scientifico</p>
          <p className="text-base text-[#5C7061] leading-relaxed mb-6">
            Descrizione della pianta...
          </p>
        </div>

        <div className="plant-card p-6 mb-6">
          <h3 className="text-xl font-bold text-[#1A2E20] mb-4">Calendario di Cura</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E8F1F2] flex items-center justify-center flex-shrink-0">
                <Droplets className="text-[#1B6CA8]" size={20} />
              </div>
              <div>
                <p className="font-medium text-[#1A2E20]">Annaffiatura</p>
                <p className="text-sm text-[#5C7061]">Ogni 7 giorni</p>
                <p className="text-xs text-[#8A9F8E] mt-1">Prossima: 25 Gen 2026</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFF8E7] flex items-center justify-center flex-shrink-0">
                <Sun className="text-[#B58500]" size={20} />
              </div>
              <div>
                <p className="font-medium text-[#1A2E20]">Luce</p>
                <p className="text-sm text-[#5C7061]">Luce indiretta brillante</p>
              </div>
            </div>
          </div>
        </div>

        <div className="plant-card p-6">
          <h3 className="text-xl font-bold text-[#1A2E20] mb-4">Note</h3>
          <textarea
            className="input-field resize-none h-32"
            placeholder="Aggiungi note personali sulla tua pianta..."
            data-testid="plant-notes"
          />
          <button className="btn-primary mt-4" data-testid="save-notes-button">
            Salva Note
          </button>
        </div>
      </div>
    </div>
  );
}

export default PlantDetailPage;