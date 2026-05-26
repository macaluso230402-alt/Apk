import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowLeft, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function ScannerPage() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedImage) {
      toast.error('Seleziona un\'immagine prima');
      return;
    }

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        
        const response = await axios.post(`${API_URL}/api/identify`, {
          image_base64: base64Image,
          user_id: 'demo-user',
          location: null,
          home_situation: null
        });

        setResult(response.data);
        toast.success('Pianta identificata!');
      };
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('Error identifying plant:', error);
      toast.error('Errore durante l\'identificazione. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlant = async () => {
    if (!result) return;

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];
        
        await axios.post(`${API_URL}/api/plants`, {
          user_id: 'demo-user',
          common_name: result.common_name,
          scientific_name: result.scientific_name,
          description: result.description,
          image_base64: base64Image,
          care_schedule: null,
          light_requirement: result.care_guide?.light || null,
          water_requirement: result.care_guide?.water || null,
          pet_friendly: result.pet_friendly,
          notes: null
        });

        toast.success('Pianta salvata!');
        setTimeout(() => navigate('/dashboard'), 1500);
      };
      reader.readAsDataURL(selectedImage);
    } catch (error) {
      console.error('Error saving plant:', error);
      toast.error('Errore durante il salvataggio.');
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
          <h1 className="text-2xl font-bold text-[#1A2E20]">Scansiona Pianta</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {!result ? (
          <div className="space-y-8">
            {/* Upload Area */}
            <div 
              className="plant-card p-8 text-center cursor-pointer hover:border-[#3E6A4B] transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="upload-area"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full max-h-96 object-contain rounded-lg mb-4" />
              ) : (
                <div className="py-12">
                  <Upload className="mx-auto text-[#8A9F8E] mb-4" size={64} strokeWidth={1.5} />
                  <p className="text-lg text-[#5C7061] mb-2">Clicca per caricare un'immagine</p>
                  <p className="text-sm text-[#8A9F8E]">oppure trascina qui</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                className="hidden"
                data-testid="file-input"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleScan}
                disabled={!selectedImage || loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="scan-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Analizzando...
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Identifica Pianta
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Results */
          <div className="space-y-6 animate-fade-in-up">
            <div className="plant-card p-6">
              {imagePreview && (
                <img src={imagePreview} alt="Scanned plant" className="w-full h-64 object-cover rounded-lg mb-6" />
              )}
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#1A2E20]" data-testid="plant-name">{result.common_name}</h2>
              {result.scientific_name && (
                <p className="text-sm text-[#8A9F8E] italic mb-4" data-testid="plant-scientific-name">{result.scientific_name}</p>
              )}
              <p className="text-base text-[#5C7061] leading-relaxed mb-6" data-testid="plant-description">{result.description}</p>
              
              {result.pet_friendly !== null && (
                <div className="mb-6">
                  <span className={result.pet_friendly ? 'badge-pet-friendly' : 'badge-light'} data-testid="pet-friendly-badge">
                    {result.pet_friendly ? '✓ Pet-Friendly' : '⚠ Non sicuro per animali'}
                  </span>
                </div>
              )}

              <div className="bg-[#F3F5F1] rounded-xl p-4 space-y-3">
                <h3 className="text-lg font-bold text-[#1A2E20] mb-3">Guida di Cura</h3>
                {result.care_guide?.water && (
                  <div data-testid="care-water">
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Annaffiatura</p>
                    <p className="text-base text-[#1A2E20]">{result.care_guide.water}</p>
                  </div>
                )}
                {result.care_guide?.light && (
                  <div data-testid="care-light">
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Luce</p>
                    <p className="text-base text-[#1A2E20]">{result.care_guide.light}</p>
                  </div>
                )}
                {result.care_guide?.fertilizer && (
                  <div data-testid="care-fertilizer">
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Fertilizzante</p>
                    <p className="text-base text-[#1A2E20]">{result.care_guide.fertilizer}</p>
                  </div>
                )}
                {result.care_guide?.temperature && (
                  <div data-testid="care-temperature">
                    <p className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-1">Temperatura</p>
                    <p className="text-base text-[#1A2E20]">{result.care_guide.temperature}</p>
                  </div>
                )}
              </div>

              {result.suitable_for_user && (
                <div className="mt-6">
                  <h3 className="text-lg font-bold text-[#1A2E20] mb-3">Adatta per Te</h3>
                  <p className="text-base text-[#5C7061] mb-2">Punteggio: {result.suitable_for_user.score}/10</p>
                  {result.suitable_for_user.reasons && (
                    <ul className="list-disc list-inside space-y-1">
                      {result.suitable_for_user.reasons.map((reason, idx) => (
                        <li key={idx} className="text-sm text-[#5C7061]">{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSavePlant}
                className="btn-primary flex-1"
                data-testid="save-plant-button"
              >
                Salva nelle Mie Piante
              </button>
              <button
                onClick={() => {
                  setResult(null);
                  setSelectedImage(null);
                  setImagePreview(null);
                }}
                className="btn-secondary"
                data-testid="scan-another-button"
              >
                Scansiona Altra
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScannerPage;