import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Droplets, Sun, Scissors } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

function EmptyReminders({ onGoToPlants }) {
  return (
    <div className="text-center py-20" data-testid="empty-reminders">
      <Bell size={64} className="mx-auto text-[#8A9F8E] mb-4" strokeWidth={1.5} />
      <h2 className="text-2xl font-bold text-[#1A2E20] mb-4">Nessun Promemoria</h2>
      <p className="text-base text-[#5C7061] mb-8">I promemoria ti aiutano a non dimenticare di prenderti cura delle tue piante.</p>
      <button onClick={onGoToPlants} className="btn-primary" data-testid="go-to-plants">
        Vai alle Mie Piante
      </button>
    </div>
  );
}

function RemindersPage() {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reminders/demo-user`);
      setReminders(response.data);
    } catch {
      toast.error('Errore nel caricamento dei promemoria');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReminders();
  }, [fetchReminders]);

  const toggleReminder = async (reminderId, enabled) => {
    try {
      await axios.put(
        `${API_URL}/api/reminders/${reminderId}?user_id=demo-user`,
        { enabled: !enabled }
      );
      toast.success(enabled ? 'Promemoria disattivato' : 'Promemoria attivato');
      fetchReminders();
    } catch {
      toast.error('Errore nell\'aggiornamento');
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'water':
        return <Droplets size={20} className="text-[#1B6CA8]" />;
      case 'fertilizer':
        return <Sun size={20} className="text-[#B58500]" />;
      case 'pruning':
        return <Scissors size={20} className="text-[#3E6A4B]" />;
      default:
        return <Bell size={20} className="text-[#3E6A4B]" />;
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'water':
        return 'Annaffiatura';
      case 'fertilizer':
        return 'Fertilizzante';
      case 'pruning':
        return 'Potatura';
      default:
        return type;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12">
          <p className="text-[#8A9F8E]">Caricamento...</p>
        </div>
      );
    }
    if (reminders.length === 0) {
      return <EmptyReminders onGoToPlants={() => navigate('/dashboard')} />;
    }
    return (
      <div className="space-y-4">
        {reminders.map((reminder, index) => (
          <div
            key={reminder.id}
            className="plant-card p-4 flex items-center justify-between"
            data-testid={`reminder-${index}`}
          >
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 rounded-full bg-[#F3F5F1] flex items-center justify-center flex-shrink-0">
                {getIcon(reminder.type)}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#1A2E20]" data-testid={`reminder-plant-${index}`}>{reminder.plant_name}</h3>
                <p className="text-sm text-[#5C7061]">{getTypeLabel(reminder.type)} - {reminder.frequency}</p>
                <p className="text-xs text-[#8A9F8E] mt-1">Prossima: {new Date(reminder.next_due).toLocaleDateString('it-IT')}</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={reminder.enabled}
                onChange={() => toggleReminder(reminder.id, reminder.enabled)}
                className="sr-only peer"
                data-testid={`toggle-reminder-${index}`}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#3E6A4B] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3E6A4B]"></div>
            </label>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7]">
      {/* Header */}
      <header className="glassmorphism-header py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-[#F3F5F1] rounded-full transition-colors" data-testid="back-button">
            <ArrowLeft className="text-[#1A2E20]" size={24} />
          </button>
          <h1 className="text-2xl font-bold text-[#1A2E20]">Promemoria</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {renderContent()}
      </div>
    </div>
  );
}

export default RemindersPage;
