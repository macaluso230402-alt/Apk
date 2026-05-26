import React, { useEffect, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPermissionState,
  requestPermission,
  syncReminders,
  platformInfo,
} from '../lib/notifications';
import { remindersCache } from '../lib/offlineStorage';

// Reusable card to enable/disable local notifications.
// Used on both desktop ProfilePage and mobile MobileProfilePage.
export default function NotificationsToggle() {
  const [state, setState] = useState('prompt');

  const refresh = async () => setState(await getPermissionState());

  useEffect(() => { refresh(); }, []);

  const handleEnable = async () => {
    const res = await requestPermission();
    setState(res);
    if (res === 'granted') {
      await syncReminders(remindersCache.getAll());
      toast.success('Notifiche attivate');
    } else if (res === 'denied') {
      toast.error('Permesso negato. Abilita le notifiche dalle impostazioni del dispositivo.');
    } else if (res === 'unsupported') {
      toast.error('Notifiche non supportate da questo browser');
    }
  };

  const granted = state === 'granted';
  const denied = state === 'denied';
  const unsupported = state === 'unsupported';

  return (
    <div className="plant-card p-4 sm:p-6" data-testid="notifications-toggle-card">
      <div className="flex items-center gap-2 mb-3">
        {granted ? (
          <Bell size={18} className="text-[#3E6A4B]" />
        ) : (
          <BellOff size={18} className="text-[#8A9F8E]" />
        )}
        <h2 className="text-base sm:text-xl font-bold text-[#1A2E20]">Notifiche</h2>
      </div>

      <p className="text-xs sm:text-sm text-[#5C7061] mb-4 leading-relaxed">
        Ricevi un avviso al momento esatto di ogni promemoria (annaffiatura, propagazione, ecc.).
        {' '}{platformInfo.isNative ? 'Funziona anche con app chiusa.' : 'Su browser funziona quando l\'app è aperta o installata come PWA.'}
      </p>

      {granted && (
        <div className="text-xs sm:text-sm bg-[#E6F4EA] text-[#3E6A4B] rounded-lg px-3 py-2 inline-flex items-center gap-2" data-testid="notif-status-granted">
          <Bell size={14} /> Attive
        </div>
      )}

      {!granted && !denied && !unsupported && (
        <button
          onClick={handleEnable}
          className="btn-primary text-sm sm:text-base"
          data-testid="enable-notifications-btn"
        >
          Attiva notifiche
        </button>
      )}

      {denied && (
        <p className="text-xs sm:text-sm text-[#B58500] bg-[#FFF8E7] rounded-lg px-3 py-2" data-testid="notif-status-denied">
          Permesso negato. Per attivarle vai nelle impostazioni del dispositivo/browser.
        </p>
      )}

      {unsupported && (
        <p className="text-xs sm:text-sm text-[#8A9F8E]" data-testid="notif-status-unsupported">
          Questo browser non supporta le notifiche.
        </p>
      )}
    </div>
  );
}
