import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Upload, Loader2, CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import CareGuide from '../components/CareGuide';
import PropagationSection from '../components/PropagationSection';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { plantsCache, pendingScans } from '../lib/offlineStorage';

const SAVE_REDIRECT_DELAY_MS = 1200;

export default function MobileScannerPage() {
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result);
    reader.readAsDataURL(file);
  };

  const readBase64 = () =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(selectedImage);
    });

  const handleScan = async () => {
    if (!selectedImage) { toast.error("Seleziona un'immagine"); return; }

    if (!isOnline) {
      const base64Image = await readBase64();
      pendingScans.add({ image_base64: base64Image, location: null, home_situation: null });
      toast.success('Scansione in coda (offline). Verrà elaborata quando torni online.');
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    setLoading(true);
    try {
      const base64Image = await readBase64();
      const r = await api.post('/api/identify', { image_base64: base64Image });
      setResult(r.data);
      toast.success('Pianta identificata!');
    } catch {
      toast.error("Errore durante l'identificazione");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    try {
      const base64Image = await readBase64();
      const { data } = await api.post('/api/plants', {
        common_name: result.common_name,
        scientific_name: result.scientific_name,
        description: result.description,
        image_base64: base64Image,
        light_requirement: result.care_guide?.light || null,
        water_requirement: result.care_guide?.water || null,
        pet_friendly: result.pet_friendly,
        propagation: result.propagation || null,
      });
      plantsCache.upsert(data);
      toast.success('Pianta salvata!');
      setTimeout(() => navigate('/dashboard'), SAVE_REDIRECT_DELAY_MS);
    } catch {
      toast.error('Errore salvataggio');
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Scansiona Pianta" showBack />

      <div className="px-4 py-4 space-y-4">
        {!result ? (
          <>
            {!isOnline && (
              <div className="plant-card p-3 flex items-center gap-2 bg-[#E8F1F2]" data-testid="mob-offline-scanner-notice">
                <CloudOff className="text-[#1B6CA8]" size={18} />
                <p className="text-xs text-[#1B6CA8]">Offline — le scansioni vengono accodate.</p>
              </div>
            )}
            <div className="plant-card overflow-hidden cursor-pointer" onClick={() => fileInputRef.current?.click()} data-testid="mob-upload-area">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-contain" />
              ) : (
                <div className="py-16 text-center">
                  <Upload className="mx-auto text-[#8A9F8E] mb-3" size={48} strokeWidth={1.5} />
                  <p className="text-base font-medium text-[#1A2E20]">Tocca per scattare</p>
                  <p className="text-sm text-[#8A9F8E] mt-1">o scegli dalla galleria</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" data-testid="mob-file-input" />
            </div>
            <button onClick={handleScan} disabled={!selectedImage || loading} className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 py-4 text-base" data-testid="mob-scan-button">
              {loading ? (<><Loader2 className="animate-spin" size={20} /> Analisi AI...</>) : (<><Camera size={20} /> {isOnline ? 'Identifica' : 'Metti in coda'}</>)}
            </button>
          </>
        ) : (
          <div className="space-y-4 animate-fade-in-up">
            <div className="plant-card p-4">
              {imagePreview && <img src={imagePreview} alt="" className="w-full h-56 object-cover rounded-lg mb-4" />}
              <h2 className="text-xl font-bold text-[#1A2E20] mb-1" data-testid="mob-plant-name">{result.common_name}</h2>
              {result.scientific_name && <p className="text-xs text-[#8A9F8E] italic mb-3">{result.scientific_name}</p>}
              <p className="text-sm text-[#5C7061] leading-relaxed mb-4">{result.description}</p>
              {result.pet_friendly !== null && (
                <div className="mb-4">
                  <span className={result.pet_friendly ? 'badge-pet-friendly' : 'badge-light'}>
                    {result.pet_friendly ? '✓ Pet-Friendly' : '⚠ Non sicuro per animali'}
                  </span>
                </div>
              )}
              <CareGuide careGuide={result.care_guide} suitableForUser={result.suitable_for_user} />
              <PropagationSection propagation={result.propagation} />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={handleSave} className="btn-primary w-full py-4" data-testid="mob-save-plant">Salva nelle Mie Piante</button>
              <button onClick={() => { setResult(null); setSelectedImage(null); setImagePreview(null); }} className="btn-secondary w-full py-4" data-testid="mob-scan-another">Scansiona Altra</button>
            </div>
          </div>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
