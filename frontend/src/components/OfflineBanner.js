import React, { useEffect, useState } from 'react';
import { WifiOff, Cloud, CloudOff } from 'lucide-react';
import useOnlineStatus from '../hooks/useOnlineStatus';
import { pendingOps, pendingScans } from '../lib/offlineStorage';
import { onSyncChange } from '../lib/syncQueue';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [pending, setPending] = useState(0);

  const refresh = () => setPending(pendingOps.count() + pendingScans.count());

  useEffect(() => {
    refresh();
    const unsub = onSyncChange(refresh);
    const interval = setInterval(refresh, 5000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  if (isOnline && pending === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium shadow-md ${
        isOnline ? 'bg-[#FFF8E7] text-[#B58500]' : 'bg-[#E8F1F2] text-[#1B6CA8]'
      }`}
      data-testid="offline-banner"
    >
      {isOnline ? (
        <>
          <Cloud size={14} />
          <span>Sincronizzazione in corso — {pending} {pending === 1 ? 'modifica' : 'modifiche'} da inviare</span>
        </>
      ) : (
        <>
          {pending > 0 ? <CloudOff size={14} /> : <WifiOff size={14} />}
          <span>
            Offline {pending > 0 ? `— ${pending} ${pending === 1 ? 'modifica' : 'modifiche'} in attesa` : '— le modifiche verranno sincronizzate quando torni online'}
          </span>
        </>
      )}
    </div>
  );
}
