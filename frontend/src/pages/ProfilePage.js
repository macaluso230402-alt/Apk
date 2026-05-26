import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Home } from 'lucide-react';
import { toast } from 'sonner';

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    name: 'Utente Demo',
    email: 'demo@plantcare.com',
    city: 'Roma',
    pets: [],
    lighting: 'Media',
    space: 'Appartamento'
  });

  const handleSave = () => {
    toast.success('Profilo aggiornato!');
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
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
          {/* Basic Info */}
          <div className="plant-card p-6">
            <h2 className="text-xl font-bold text-[#1A2E20] mb-4">Informazioni Personali</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Nome</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="input-field"
                  data-testid="profile-name"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Email</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="input-field"
                  data-testid="profile-email"
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="plant-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={20} className="text-[#3E6A4B]" />
              <h2 className="text-xl font-bold text-[#1A2E20]">Posizione</h2>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Città</label>
              <input
                type="text"
                value={profile.city}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="input-field"
                placeholder="es. Roma, Milano, Napoli"
                data-testid="profile-city"
              />
              <p className="text-xs text-[#8A9F8E] mt-2">Ci aiuta a fornire consigli climatici personalizzati</p>
            </div>
          </div>

          {/* Home Situation */}
          <div className="plant-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Home size={20} className="text-[#3E6A4B]" />
              <h2 className="text-xl font-bold text-[#1A2E20]">Situazione Casa</h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Animali Domestici</label>
                <div className="space-y-2">
                  {['Cani', 'Gatti', 'Uccelli', 'Altri'].map((pet) => (
                    <label key={pet} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.pets.includes(pet)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setProfile({ ...profile, pets: [...profile.pets, pet] });
                          } else {
                            setProfile({ ...profile, pets: profile.pets.filter(p => p !== pet) });
                          }
                        }}
                        className="w-4 h-4 text-[#3E6A4B] rounded"
                        data-testid={`pet-${pet.toLowerCase()}`}
                      />
                      <span className="text-sm text-[#1A2E20]">{pet}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Illuminazione Disponibile</label>
                <select
                  value={profile.lighting}
                  onChange={(e) => setProfile({ ...profile, lighting: e.target.value })}
                  className="input-field"
                  data-testid="profile-lighting"
                >
                  <option value="Bassa">Bassa (poche finestre)</option>
                  <option value="Media">Media (alcune finestre)</option>
                  <option value="Alta">Alta (molte finestre, luce diretta)</option>
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-[#8A9F8E] mb-2 block">Spazio</label>
                <select
                  value={profile.space}
                  onChange={(e) => setProfile({ ...profile, space: e.target.value })}
                  className="input-field"
                  data-testid="profile-space"
                >
                  <option value="Appartamento">Appartamento piccolo</option>
                  <option value="Appartamento grande">Appartamento grande</option>
                  <option value="Casa">Casa</option>
                  <option value="Con giardino">Casa con giardino</option>
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleSave} className="btn-primary w-full" data-testid="save-profile-button">
            Salva Profilo
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;