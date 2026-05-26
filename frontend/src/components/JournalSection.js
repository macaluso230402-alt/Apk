import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Trash2, Loader2, BookImage } from 'lucide-react';
import { toast } from 'sonner';
import api from '../lib/api';
import { journalCache, pendingOps } from '../lib/offlineStorage';

const dateFmt = new Intl.DateTimeFormat('it-IT', {
  day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function readFileBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Self-contained "Plant Journal" section used on both desktop and mobile detail pages.
// Cache-first, optimistic add + delete with offline queue.
export default function JournalSection({ plantId }) {
  const fileRef = useRef(null);
  const [entries, setEntries] = useState(() => journalCache.getByPlant(plantId));
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/plants/${plantId}/journal`);
      journalCache.setByPlant(plantId, data);
      setEntries(data);
    } catch { /* offline → keep cache */ }
  }, [plantId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handlePick = () => fileRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await readFileBase64(file);
      const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // Optimistic local entry
      const optimistic = {
        id: tempId,
        plant_id: plantId,
        user_id: 'default-user',
        image_url: `data:image/jpeg;base64,${base64}`,
        note: note || null,
        created_at: new Date().toISOString(),
      };
      journalCache.upsert(plantId, optimistic);
      setEntries(journalCache.getByPlant(plantId));
      setNote('');

      try {
        const { data } = await api.post(`/api/plants/${plantId}/journal`, {
          client_id: tempId,
          image_base64: base64,
          note: optimistic.note,
        });
        // Replace optimistic with server-confirmed
        const list = journalCache.getByPlant(plantId).map((x) => (x.id === tempId ? data : x));
        journalCache.setByPlant(plantId, list);
        setEntries(list);
        toast.success('Foto aggiunta al diario');
      } catch {
        pendingOps.add({
          kind: 'add-journal',
          payload: { plantId, image_base64: base64, note: optimistic.note, _tempId: tempId },
        });
        toast.success('Foto salvata (sync offline)');
      }
    } catch {
      toast.error('Errore caricamento foto');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (entryId) => {
    journalCache.remove(plantId, entryId);
    setEntries(journalCache.getByPlant(plantId));
    try {
      await api.delete(`/api/plants/${plantId}/journal/${entryId}`);
    } catch {
      pendingOps.add({ kind: 'delete-journal', payload: { plantId, entryId } });
    }
  };

  return (
    <section className="mt-6" data-testid="journal-section">
      <div className="flex items-center gap-2 mb-3">
        <BookImage size={18} className="text-[#3E6A4B]" />
        <h3 className="text-lg font-bold text-[#1A2E20]">Diario pianta</h3>
        <span className="text-xs text-[#8A9F8E] ml-auto" data-testid="journal-count">{entries.length} foto</span>
      </div>

      <div className="plant-card p-4 mb-3">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Nota (opzionale): es. 'spuntata nuova foglia'"
          rows={2}
          className="input-field w-full mb-3 resize-none"
          data-testid="journal-note"
        />
        <button
          onClick={handlePick}
          disabled={uploading}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
          data-testid="journal-add-photo"
        >
          {uploading ? (
            <><Loader2 className="animate-spin" size={18} /> Caricamento...</>
          ) : (
            <><Camera size={18} /> Aggiungi foto al diario</>
          )}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFile}
          className="hidden"
          data-testid="journal-file-input"
        />
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[#8A9F8E] text-center py-6" data-testid="journal-empty">
          Nessuna foto ancora. Fotografa la pianta periodicamente per vederne la crescita 🌱
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" data-testid="journal-grid">
          {entries.map((entry, idx) => (
            <div key={entry.id} className="plant-card overflow-hidden relative group" data-testid={`journal-entry-${idx}`}>
              {entry.image_url && (
                <img
                  src={entry.image_url}
                  alt=""
                  className="w-full h-32 sm:h-40 object-cover"
                />
              )}
              <div className="p-2">
                <p className="text-[10px] uppercase tracking-wider text-[#8A9F8E]">
                  {dateFmt.format(new Date(entry.created_at))}
                </p>
                {entry.note && (
                  <p className="text-xs text-[#1A2E20] mt-1 line-clamp-2" data-testid={`journal-note-${idx}`}>
                    {entry.note}
                  </p>
                )}
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`journal-delete-${idx}`}
                aria-label="Elimina foto"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
