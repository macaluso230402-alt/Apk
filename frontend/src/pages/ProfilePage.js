import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useProfile, formatApiErrorDetail } from '../contexts/ProfileContext';
import NotificationsToggle from '../components/NotificationsToggle';

const PET_OPTIONS = ['Cani', 'Gatti', 'Uccelli', 'Altri'];

function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();
  const [form, setForm] = useState({ name: '', city: '', pets: [], lighting: 'Media', space: 'Appartamento' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name || '',
        city: profile.location?.city || '',
        pets: profile.home_situation?.pets || [],
        lighting: profile.home_situation?.lighting || 'Media',
        space: profile.home_situation?.space || 'Appartamento',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: form.name,
        location: { city: form.city },
        home_situation: { pets: form.pets, lighting: form.lighting, space: form.space },
      });
      toast.success('Profilo aggiornato!');
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
            <ArrowLeft className="text-[#1A2E20]" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-[#1A2E20]">Profilo</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-6">
          <div className="plant-card p-6">
            <h2 className="text-xl font-bold text-[#1A2E20] mb-4">Informazioni Personali</h2>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Nome</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" data-testid="profile-name" />
            </div>
          </div>

          <div className="plant-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={20} className="text-[#3E6A4B]" />
              <h2 className="text-xl font-bold text-[#1A2E20]">Posizione</h2>
            </div>
            <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Città</label>
            <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="input-field" placeholder="es. Roma, Milano, Napoli" data-testid="profile-city" />
          </div>

          <div className="plant-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Home size={20} className="text-[#3E6A4B]" />
              <h2 className="text-xl font-bold text-[#1A2E20]">Situazione Casa</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Animali Domestici</label>
                <div className="space-y-2">
                  {PET_OPTIONS.map((pet) => (
                    <label key={pet} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={form.pets.includes(pet)} onChange={() => {
                        setForm((p) => ({ ...p, pets: p.pets.includes(pet) ? p.pets.filter(x => x !== pet) : [...p.pets, pet] }));
                      }} className="w-4 h-4 text-[#3E6A4B] rounded" data-testid={`pet-${pet.toLowerCase()}`} />
                      <span className="text-sm text-[#1A2E20]">{pet}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Illuminazione</label>
                <select value={form.lighting} onChange={(e) => setForm({ ...form, lighting: e.target.value })} className="input-field" data-testid="profile-lighting">
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Spazio</label>
                <select value={form.space} onChange={(e) => setForm({ ...form, space: e.target.value })} className="input-field" data-testid="profile-space">
                  <option value="Appartamento">Appartamento</option>
                  <option value="Appartamento grande">Appartamento grande</option>
                  <option value="Casa">Casa</option>
                  <option value="Con giardino">Casa con giardino</option>
                </select>
              </div>
            </div>
          </div>

          <NotificationsToggle />

          <button onClick={handleSave} disabled={saving} className="btn-primary w-full disabled:opacity-50" data-testid="save-profile-button">
            {saving ? 'Salvataggio...' : 'Salva Profilo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
