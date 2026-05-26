import React, { useState, useEffect } from 'react';
import { MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, formatApiErrorDetail } from '../contexts/AuthContext';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';

const PET_OPTIONS = ['Cani', 'Gatti', 'Uccelli', 'Altri'];

export default function MobileProfilePage() {
  const { user, updateProfile } = useAuth();
  const [profile, setProfile] = useState({ name: '', city: '', pets: [], lighting: 'Media', space: 'Appartamento' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        city: user.location?.city || '',
        pets: user.home_situation?.pets || [],
        lighting: user.home_situation?.lighting || 'Media',
        space: user.home_situation?.space || 'Appartamento',
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        name: profile.name,
        location: { city: profile.city },
        home_situation: { pets: profile.pets, lighting: profile.lighting, space: profile.space },
      });
      toast.success('Profilo aggiornato!');
    } catch (err) {
      toast.error(formatApiErrorDetail(err.response?.data?.detail) || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const togglePet = (pet) => {
    setProfile((p) => ({ ...p, pets: p.pets.includes(pet) ? p.pets.filter(x => x !== pet) : [...p.pets, pet] }));
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Profilo" />

      <div className="px-4 py-4 space-y-4">
        <div className="plant-card p-4">
          <h2 className="text-base font-bold text-[#1A2E20] mb-3">Informazioni</h2>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-1 block">Nome</label>
              <input type="text" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} className="input-field" data-testid="mob-profile-name" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-1 block">Email</label>
              <input type="email" value={user?.email || ''} disabled className="input-field opacity-60" />
            </div>
          </div>
        </div>

        <div className="plant-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={18} className="text-[#3E6A4B]" />
            <h2 className="text-base font-bold text-[#1A2E20]">Posizione</h2>
          </div>
          <input type="text" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} className="input-field" placeholder="es. Roma" data-testid="mob-profile-city" />
        </div>

        <div className="plant-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Home size={18} className="text-[#3E6A4B]" />
            <h2 className="text-base font-bold text-[#1A2E20]">Casa</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-2 block">Animali</label>
              <div className="flex flex-wrap gap-2">
                {PET_OPTIONS.map((pet) => (
                  <button key={pet} onClick={() => togglePet(pet)} className={`text-xs px-3 py-1.5 rounded-full transition ${profile.pets.includes(pet) ? 'bg-[#3E6A4B] text-white' : 'bg-[#F3F5F1] text-[#1A2E20]'}`} data-testid={`mob-pet-${pet.toLowerCase()}`}>
                    {pet}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-1 block">Luce</label>
              <select value={profile.lighting} onChange={(e) => setProfile({ ...profile, lighting: e.target.value })} className="input-field" data-testid="mob-profile-lighting">
                <option>Bassa</option><option>Media</option><option>Alta</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-[#8A9F8E] mb-1 block">Spazio</label>
              <select value={profile.space} onChange={(e) => setProfile({ ...profile, space: e.target.value })} className="input-field" data-testid="mob-profile-space">
                <option>Appartamento</option><option>Appartamento grande</option><option>Casa</option><option>Con giardino</option>
              </select>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving} className="btn-primary w-full py-4 disabled:opacity-50" data-testid="mob-save-profile">
          {saving ? 'Salvataggio...' : 'Salva'}
        </button>
      </div>

      <MobileBottomNav />
    </div>
  );
}
