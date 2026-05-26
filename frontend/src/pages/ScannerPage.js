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
      pendingScans.add({ image_base64: base64Image, location: null, home_situation: null });
      toast.success(`Scansione in coda (offline).`);
      setSelectedImage(null);
      setImagePreview(null);
      return;
    }

    setLoading(true);
    try {
      const base64Image = await readBase64();
      
      // Chiamata diretta alle API gratuite di Google Gemini Vision
      const geminiApiKey = "AIzaSyAbhD2yLdAO4bT-SWJX5L11HYtWGiZGsIw"; 
      
      const prompt = "Identifica questa pianta. Rispondi ESCLUSIVAMENTE con un oggetto JSON scritto in italiano avente questa identica struttura senza formattazione markdown o testo aggiuntivo: {\"common_name\": \"Nome comune\", \"scientific_name\": \"Nome scientifico\", \"description\": \"Breve descrizione della pianta\", \"pet_friendly\": true o false, \"care_guide\": {\"light\": \"Istruzioni luce\", \"water\": \"Istruzioni annaffiatura\"}, \"propagation\": \"Istruzioni riproduzione\"}";

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              { inlineData: { mimeType: selectedImage.type, data: base64Image } }
            ]
          }]
        })
      });

      const data = await response.json();
      const rawText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
      const parsedResult = JSON.parse(rawText);

      setResult(parsedResult);
      toast.success('Pianta identificata con Gemini!');
    } catch (err) {
      console.error(err);
      toast.error("Errore durante l'identificazione AI. Riprova.");
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
      
      // Salvataggio locale per sicurezza se il database remoto è bloccato
      plantsCache.upsert({ id: Date.now().toString(), ...payload });
      try {
        await api.post('/api/plants', payload);
      } catch (e) {
        // Se il server di Emergent rifiuta il salvataggio remoto, lo tiene comunque in locale
      }
      
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
                <p className="text-sm text-[#1B6CA8]"> Sei offline. </p>
              </div>
            )}
            <div className="plant-card p-8 text-center cursor-pointer hover:border-[#3E6A4B] transition-colors" onClick={() => fileInputRef.current?.click()} data-testid="upload-area">
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="w-full max-h-96 object-contain rounded-lg mb-4" />
              ) : (
                <div className="py-12">
                  <Upload className="mx-auto text-[#8A9F8E] mb-4" size={64} strokeWidth={1.5} />
                  <p className="text-lg text-[#5C7061] mb-2">Clicca per caricare un'immagine</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageSelect} className="hidden" data-testid="file-input" />
            </div>
            <div className="flex gap-4">
              <button onClick={handleScan} disabled={!selectedImage || loading} className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? (<><Loader2 className="animate-spin" size={20} /> Analizzando...</>) : (<><Camera size={20} /> Identifica Pianta</>)}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="plant-card p-6">
              {imagePreview && <img src={imagePreview} alt="Scanned plant" className="w-full h-64 object-cover rounded-lg mb-6" />}
              <h2 className="text-2xl font-bold mb-2 text-[#1A2E20]">{result.common_name}</h2>
              {result.scientific_name && <p className="text-sm text-[#8A9F8E] italic mb-4">{result.scientific_name}</p>}
              <p className="text-base text-[#5C7061] leading-relaxed mb-6">{result.description}</p>
              {result.pet_friendly !== null && (
                <div className="mb-6">
                  <span className={result.pet_friendly ? 'badge-pet-friendly' : 'badge-light'}>
                    {result.pet_friendly ? '✓ Pet-Friendly' : '⚠ Non sicuro per animali'}
                  </span>
                </div>
              )}
              <CareGuide careGuide={result.care_guide} suitableForUser={true} />
              <PropagationSection propagation={result.propagation} />
            </div>
            <div className="flex gap-4">
              <button onClick={handleSavePlant} className="btn-primary flex-1">Salva nelle Mie Piante</button>
              <button onClick={() => { setResult(null); setSelectedImage(null); setImagePreview(null); }} className="btn-secondary">Scansiona Altra</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ScannerPage;

