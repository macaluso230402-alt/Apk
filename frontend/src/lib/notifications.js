// Unified local-notifications layer for PlantCare.
// - On native Android (Capacitor): schedules persistent OS notifications via @capacitor/local-notifications.
// - On web: uses the browser Notification API + setTimeout for reminders due within 24h.
//   Long-horizon web reminders re-schedule on every app load (offline-safe).

import { Capacitor } from '@capacitor/core';

const SCHEDULED_KEY = 'pc_scheduled_notifs';
const PERMISSION_KEY = 'pc_notif_permission';
const isNative = Capacitor.isNativePlatform?.() || false;

// Lazy import to keep web bundle small
async function getLN() {
  if (!isNative) return null;
  const mod = await import('@capacitor/local-notifications');
  return mod.LocalNotifications;
}

// Map UUID string -> stable 32-bit int id (Capacitor requires int IDs)
function intId(uuid) {
  let h = 0;
  for (let i = 0; i < uuid.length; i++) h = ((h << 5) - h + uuid.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647;
}

function labelFor(type) {
  return ({ water: '💧 Annaffia', fertilizer: '🌱 Fertilizza', propagation: '✂️ Propaga', pruning: '✂️ Pota' }[type]) || '🔔 Promemoria';
}

function bodyFor(rem) {
  return `${rem.plant_name} — ${rem.frequency || ''}`.trim();
}

// ===================== PERMISSION =====================
export async function getPermissionState() {
  if (isNative) {
    const LN = await getLN();
    const { display } = await LN.checkPermissions();
    return display; // 'granted' | 'denied' | 'prompt'
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

export async function requestPermission() {
  if (isNative) {
    const LN = await getLN();
    const { display } = await LN.requestPermissions();
    localStorage.setItem(PERMISSION_KEY, display);
    return display;
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  const res = await Notification.requestPermission();
  localStorage.setItem(PERMISSION_KEY, res);
  return res;
}

export function isPermissionGranted() {
  if (isNative) return localStorage.getItem(PERMISSION_KEY) === 'granted';
  if (typeof Notification === 'undefined') return false;
  return Notification.permission === 'granted';
}

// ===================== SCHEDULING =====================
const webTimers = new Map(); // reminderId -> timeout handle

async function cancelNative(reminderIds) {
  const LN = await getLN();
  if (!LN || !reminderIds.length) return;
  try {
    await LN.cancel({ notifications: reminderIds.map((id) => ({ id: intId(id) })) });
  } catch { /* noop */ }
}

function cancelWeb(reminderId) {
  const t = webTimers.get(reminderId);
  if (t) { clearTimeout(t); webTimers.delete(reminderId); }
}

function showWebNotification(rem) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(labelFor(rem.type), {
      body: bodyFor(rem),
      tag: `pc-rem-${rem.id}`,
      icon: '/favicon.ico',
    });
  } catch { /* SW-only in some browsers; ignore */ }
}

function scheduleWeb(rem) {
  cancelWeb(rem.id);
  const due = new Date(rem.next_due).getTime();
  const delay = due - Date.now();
  // Schedule only if due within next 24h to bound memory; otherwise rescheduled on next app load.
  if (delay <= 0) {
    showWebNotification(rem);
    return;
  }
  if (delay > 24 * 60 * 60 * 1000) return;
  const handle = setTimeout(() => {
    showWebNotification(rem);
    webTimers.delete(rem.id);
  }, delay);
  webTimers.set(rem.id, handle);
}

async function scheduleNative(rem) {
  const LN = await getLN();
  if (!LN) return;
  const at = new Date(rem.next_due);
  if (at.getTime() <= Date.now() - 60_000) return; // skip far-past
  try {
    await LN.schedule({
      notifications: [{
        id: intId(rem.id),
        title: labelFor(rem.type),
        body: bodyFor(rem),
        schedule: { at: at.getTime() < Date.now() ? new Date(Date.now() + 5_000) : at },
        smallIcon: 'ic_stat_icon_config_sample',
        extra: { reminderId: rem.id, plantId: rem.plant_id },
      }],
    });
  } catch { /* noop */ }
}

// ===================== PUBLIC API =====================
// Reconciles scheduled notifications with the current enabled-reminder set.
export async function syncReminders(reminders) {
  if (!isPermissionGranted()) return;

  const enabled = (reminders || []).filter((r) => r.enabled && r.next_due);
  const prevIds = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || '[]');

  if (isNative) {
    // Cancel all previously-scheduled, then re-schedule current enabled set.
    await cancelNative(prevIds);
    for (const rem of enabled) {
      await scheduleNative(rem);
    }
  } else {
    // Web: clear timers, re-arm those due within 24h
    prevIds.forEach(cancelWeb);
    enabled.forEach(scheduleWeb);
  }

  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(enabled.map((r) => r.id)));
}

export async function cancelReminder(reminderId) {
  if (isNative) await cancelNative([reminderId]);
  else cancelWeb(reminderId);
  const prev = JSON.parse(localStorage.getItem(SCHEDULED_KEY) || '[]').filter((id) => id !== reminderId);
  localStorage.setItem(SCHEDULED_KEY, JSON.stringify(prev));
}

export const platformInfo = { isNative };
