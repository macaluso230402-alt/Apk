import api from './api';
import { pendingOps, pendingScans, plantsCache, remindersCache, journalCache } from './offlineStorage';
import { syncReminders } from './notifications';

let syncing = false;
const listeners = new Set();

export function onSyncChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
function notify() { listeners.forEach((cb) => cb()); }

async function processOp(op) {
  switch (op.kind) {
    case 'delete-plant':
      await api.delete(`/api/plants/${op.payload.plantId}`);
      return;
    case 'toggle-reminder':
      await api.put(`/api/reminders/${op.payload.reminderId}`, { enabled: op.payload.enabled });
      return;
    case 'save-plant': {
      const { data } = await api.post('/api/plants', op.payload);
      // Replace optimistic temp plant with server-confirmed
      const all = plantsCache.getAll();
      const idx = all.findIndex((p) => p.id === op.payload._tempId);
      if (idx >= 0) {
        all[idx] = data;
        plantsCache.setAll(all);
      }
      return;
    }
    case 'update-profile':
      await api.put('/api/profile', op.payload);
      return;
    case 'add-journal': {
      const { plantId, image_base64, note, _tempId } = op.payload;
      const { data } = await api.post(`/api/plants/${plantId}/journal`, {
        client_id: _tempId,
        image_base64,
        note,
      });
      const all = journalCache.getByPlant(plantId);
      const idx = all.findIndex((e) => e.id === _tempId);
      if (idx >= 0) {
        all[idx] = data;
        journalCache.setByPlant(plantId, all);
      } else {
        journalCache.upsert(plantId, data);
      }
      return;
    }
    case 'delete-journal':
      await api.delete(`/api/plants/${op.payload.plantId}/journal/${op.payload.entryId}`);
      return;
    default:
      throw new Error(`Unknown op kind: ${op.kind}`);
  }
}

export async function flushQueue() {
  if (syncing) return;
  syncing = true;
  notify();
  try {
    const ops = pendingOps.getAll();
    for (const op of ops) {
      try {
        await processOp(op);
        pendingOps.remove(op.id);
        notify();
      } catch (err) {
        // Stop on first failure (likely offline again); retry later
        break;
      }
    }
    // Process pending scans
    const scans = pendingScans.getAll();
    for (const scan of scans) {
      try {
        const { data } = await api.post('/api/identify', {
          image_base64: scan.image_base64,
          location: scan.location,
          home_situation: scan.home_situation,
        });
        // Auto-save the identified plant
        if (data && data.common_name && data.common_name !== 'Pianta non identificata') {
          await api.post('/api/plants', {
            client_id: scan.id,
            common_name: data.common_name,
            scientific_name: data.scientific_name,
            description: data.description,
            image_base64: scan.image_base64,
            light_requirement: data.care_guide?.light || null,
            water_requirement: data.care_guide?.water || null,
            pet_friendly: data.pet_friendly,
            propagation: data.propagation || null,
          });
        }
        pendingScans.remove(scan.id);
        notify();
      } catch {
        break;
      }
    }
  } finally {
    syncing = false;
    notify();
    // Refresh notifications: backend may have auto-created propagation reminders.
    try {
      const { data } = await api.get('/api/reminders');
      remindersCache.setAll(data);
      syncReminders(data);
    } catch { /* offline */ }
  }
}

// Auto-flush whenever the network comes back
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushQueue(); });
}
