// Lightweight offline storage layer using localStorage.
// Cache-first reads, optimistic writes, pending mutation queue.

const KEYS = {
  PLANTS: 'pc_plants',
  PLANT_PREFIX: 'pc_plant_',
  RECOMMENDATIONS: 'pc_recommendations',
  POTW: 'pc_potw',
  PROFILE: 'pc_profile',
  REMINDERS: 'pc_reminders',
  PENDING_QUEUE: 'pc_pending_ops',
  PENDING_SCANS: 'pc_pending_scans',
};

const safe = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Quota exceeded — clear old caches first
    }
  },
  del(key) {
    try { localStorage.removeItem(key); } catch { /* noop */ }
  },
};

// ============ PLANTS ============
export const plantsCache = {
  getAll: () => safe.get(KEYS.PLANTS, []),
  setAll: (plants) => safe.set(KEYS.PLANTS, plants),
  upsert: (plant) => {
    const all = plantsCache.getAll();
    const idx = all.findIndex((p) => p.id === plant.id);
    if (idx >= 0) all[idx] = plant; else all.unshift(plant);
    plantsCache.setAll(all);
    safe.set(KEYS.PLANT_PREFIX + plant.id, plant);
  },
  remove: (plantId) => {
    plantsCache.setAll(plantsCache.getAll().filter((p) => p.id !== plantId));
    safe.del(KEYS.PLANT_PREFIX + plantId);
  },
  getById: (id) => safe.get(KEYS.PLANT_PREFIX + id) || plantsCache.getAll().find((p) => p.id === id) || null,
};

// ============ REMINDERS ============
export const remindersCache = {
  getAll: () => safe.get(KEYS.REMINDERS, []),
  setAll: (list) => safe.set(KEYS.REMINDERS, list),
  toggle: (id, enabled) => {
    const all = remindersCache.getAll().map((r) => (r.id === id ? { ...r, enabled } : r));
    remindersCache.setAll(all);
  },
};

// ============ POTW / RECOMMENDATIONS / PROFILE ============
export const potwCache = {
  get: () => safe.get(KEYS.POTW, null),
  set: (data) => safe.set(KEYS.POTW, data),
};
export const recommendationsCache = {
  get: () => safe.get(KEYS.RECOMMENDATIONS, null),
  set: (data) => safe.set(KEYS.RECOMMENDATIONS, data),
};
export const profileCache = {
  get: () => safe.get(KEYS.PROFILE, null),
  set: (data) => safe.set(KEYS.PROFILE, data),
};

// ============ PENDING OPS QUEUE ============
// Each op: { id, kind: 'delete-plant'|'toggle-reminder'|'save-plant'|'update-profile', payload, ts }
export const pendingOps = {
  getAll: () => safe.get(KEYS.PENDING_QUEUE, []),
  add: (op) => {
    const all = pendingOps.getAll();
    all.push({ ...op, id: op.id || `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() });
    safe.set(KEYS.PENDING_QUEUE, all);
  },
  remove: (opId) => safe.set(KEYS.PENDING_QUEUE, pendingOps.getAll().filter((o) => o.id !== opId)),
  count: () => pendingOps.getAll().length,
};

// ============ PENDING SCANS ============
// Each scan: { id, image_base64, location, home_situation, ts }
export const pendingScans = {
  getAll: () => safe.get(KEYS.PENDING_SCANS, []),
  add: (scan) => {
    const all = pendingScans.getAll();
    const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    all.push({ ...scan, id, ts: Date.now() });
    safe.set(KEYS.PENDING_SCANS, all);
    return id;
  },
  remove: (id) => safe.set(KEYS.PENDING_SCANS, pendingScans.getAll().filter((s) => s.id !== id)),
  count: () => pendingScans.getAll().length,
};

export const offlineStorage = {
  KEYS,
  clearAll: () => Object.values(KEYS).forEach(safe.del),
};
