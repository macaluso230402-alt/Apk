import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, ArrowLeft, Loader2, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import CareGuide from '../components/CareGuide';
import PropagationSection from '../components/PropagationSection';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { plantsCache, pendingScans } from '../lib/offlineStorage';

const SAVE_REDIRECT_DELAY_MS = 1500;

function ScannerPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
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
      reader.onloadend = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const readBase64 = () =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(selectedImage);
    });

  const handleScan = async () => {
    if (!selectedImage) { toast.error("Seleziona un'immagine prima"); return; }

    if (!isOnline) {
      const base64Image = await readBase64();
      const id = pendingScans.add({ image_base64: base64Image, location: null, home_situation: null });
      toast.success(`Scansione in coda (offline). Verrà elaborata quando torni online.`);
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    setLoading(true);
    try {
      const base64Image = await readBase64();
      const response = await api.post('/api/identify', {
        image_base64: base64Image,
        location: null,
        home_situation: null,
      });
      setResult(response.data);
      toast.success('Pianta identificata!');
    } catch {
      toast.error("Errore durante l'identificazione. Riprova.");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlant = async () => {
    if (!result) return;
    try {
      const base64Image = await readBase64();
      const payload = {
        common_name: result.common_name,
        scientific_name: result.scientific_name,
        description: result.description,
        image_base64: base64Image,
        light_requirement: result.care_guide?.light || null,
        water_requirement: result.care_guide?.water || null,
        pet_friendly: result.pet_friendly,
        propagation: result.propagation || null,
      };
      const { data } = await api.post('/api/plants', payload);
      plantsCache.upsert(data);
      toast.success('Pianta salvata!');
      setTimeout(() => navigate('/dashboard'), SAVE_REDIRECT_DELAY_MS);
    } catch {
      toast.error('Errore durante il salvataggio.');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
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
            {!isOnline && (
              <div className="plant-card p-4 flex items-center gap-3 bg-[#E8F1F2]" data-testid="offline-scanner-notice">
                <CloudOff className="text-[#1B6CA8]" size={20} />
                <p className="text-sm text-[#1B6CA8]">
                  Sei offline. Le scansioni vengono accodate e processate quando torni online.
                </p>
              </div>
            )}
            <div className="plant-card p-8 text-center cursor-pointer hover:border-[#3E6A4B] transition-colors" onClick={() => fileInputRef.current?.click()} data-testid="upload-area">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full max-h-96 object-contain rounded-lg mb-4" />
              ) : (
                <div className="py-12">
                  <Upload className="mx-auto text-[#8A9F8E] mb-4" size={64} strokeWidth={1.5} />
                  <p className="text-lg text-[#5C7061] mb-2">Clicca per caricare un'immagine</p>
                  <p className="text-sm text-[#8A9F8E]">oppure trascina qui</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" data-testid="file-input" />
            </div>
            <div className="flex gap-4">
              <button onClick={handleScan} disabled={!selectedImage || loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" data-testid="scan-button">
                {loading ? (<><Loader2 className="animate-spin" size={20} /> Analizzando...</>) : (<><Camera size={20} /> {isOnline ? 'Identifica Pianta' : 'Metti in coda'}</>)}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <div className="plant-card p-6">
              {imagePreview && <img src={imagePreview} alt="Scanned plant" className="w-full h-64 object-cover rounded-lg mb-6" />}
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-[#1A2E20]" data-testid="plant-name">{result.common_name}</h2>
              {result.scientific_name && <p className="text-sm text-[#8A9F8E] italic mb-4" data-testid="plant-scientific-name">{result.scientific_name}</p>}
              <p className="text-base text-[#5C7061] leading-relaxed mb-6" data-testid="plant-description">{result.description}</p>
              {result.pet_friendly !== null && (
                <div className="mb-6">
                  <span className={result.pet_friendly ? 'badge-pet-friendly' : 'badge-light'} data-testid="pet-friendly-badge">
                    {result.pet_friendly ? '✓ Pet-Friendly' : '⚠ Non sicuro per animali'}
                  </span>
                </div>
              )}
              <CareGuide careGuide={result.care_guide} suitableForUser={result.suitable_for_user} />
              <PropagationSection propagation={result.propagation} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleSavePlant} className="btn-primary flex-1" data-testid="save-plant-button">Salva nelle Mie Piante</button>
              <button onClick={() => { setResult(null); setSelectedImage(null); setImagePreview(null); }} className="btn-secondary" data-testid="scan-another-button">Scansiona Altra</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScannerPage;
