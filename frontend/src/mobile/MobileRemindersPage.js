import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Droplets, Sun, Scissors } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import MobileHeader from './MobileHeader';
import MobileBottomNav from './MobileBottomNav';
import { remindersCache, pendingOps } from '../lib/offlineStorage';

export default function MobileRemindersPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState(() => remindersCache.getAll());
  const [loading, setLoading] = useState(remindersCache.getAll().length === 0);

  const fetchReminders = useCallback(async () => {
    try {
      const r = await api.get('/api/reminders');
      setReminders(r.data);
      remindersCache.setAll(r.data);
    } catch {
      // Offline: keep cached
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReminders(); }, [fetchReminders]);

  const toggle = async (id, enabled) => {
    remindersCache.toggle(id, !enabled);
    setReminders(remindersCache.getAll());
    try {
      await api.put(`/api/reminders/${id}`, { enabled: !enabled });
    } catch {
      pendingOps.add({ kind: 'toggle-reminder', payload: { reminderId: id, enabled: !enabled } });
      toast.message('Modifica salvata, sync offline');
    }
  };

  const iconFor = (type) => {
    switch (type) {
      case 'water': return <Droplets size={18} className="text-[#1B6CA8]" />;
      case 'fertilizer': return <Sun size={18} className="text-[#B58500]" />;
      case 'propagation': return <Scissors size={18} className="text-[#E07A5F]" />;
      default: return <Bell size={18} className="text-[#3E6A4B]" />;
    }
  };

  const labelFor = (type) => ({
    water: 'Annaffiatura', fertilizer: 'Fertilizzante', propagation: 'Propagazione', pruning: 'Potatura'
  }[type] || type);

  const renderContent = () => {
    if (loading) return <p className="text-center text-[#8A9F8E] py-8">Caricamento...</p>;
    if (reminders.length === 0) {
      return (
        <div className="text-center py-16">
          <Bell size={48} className="mx-auto text-[#8A9F8E] mb-3" strokeWidth={1.5} />
          <p className="text-base font-bold text-[#1A2E20] mb-2">Nessun promemoria</p>
          <p className="text-sm text-[#5C7061] mb-6 px-4">I promemoria stagionali di propagazione appariranno qui automaticamente</p>
          <button onClick={() => navigate('/dashboard')} className="btn-primary" data-testid="mob-go-plants">Le Mie Piante</button>
        </div>
      );
    }
    return (
      <div className="space-y-2">
        {reminders.map((rem, idx) => (
          <div key={rem.id} className="plant-card p-3 flex items-center gap-3" data-testid={`mob-reminder-${idx}`}>
            <div className="w-10 h-10 rounded-full bg-[#F3F5F1] flex items-center justify-center flex-shrink-0">
              {iconFor(rem.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-[#1A2E20] truncate" data-testid={`mob-rem-name-${idx}`}>{rem.plant_name}</h3>
              <p className="text-xs text-[#5C7061] truncate">{labelFor(rem.type)} — {rem.frequency}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" checked={rem.enabled} onChange={() => toggle(rem.id, rem.enabled)} className="sr-only peer" data-testid={`mob-toggle-${idx}`} />
              <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#3E6A4B]"></div>
            </label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] pb-24">
      <MobileHeader title="Promemoria" />
      <div className="px-4 py-4">{renderContent()}</div>
      <MobileBottomNav />
    </div>
  );
}
