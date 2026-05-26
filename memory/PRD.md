# PlantCare — PRD

## Original Problem Statement (Italian)
> Vorrei un'applicazione che mi aiuti a riconoscere le piante tramite fotocamera e che crei delle guide personalizzate con cure e manutenzione in base ad ogni possibile evenienza, incentrato sulle piante da interno ma che ti dia consigli anche su nuove piante da acquistare e che consideri anche la tua posizione o la tua situazione in casa (es. Animali ecc).

## User Persona
- **Single user, private**: la app non ha più login né registrazione. Profilo unico locale (DEFAULT_USER_ID = `default-user`).
- Lingua: italiano.
- Piattaforme: web responsive (Desktop ≥768px + Mobile <768px) + Android APK via Capacitor.

## Core Requirements (achieved unless noted)
- ✅ Riconoscimento piante via fotocamera (Gemini 2.5 Flash Vision)
- ✅ Guide di cura personalizzate (luce, animali, città)
- ✅ Catalogo "piante consigliate" + Pianta della settimana
- ✅ Promemoria stagionali con propagazione auto-creata
- ✅ Layout desktop + mobile separati (`/pages/*` e `/mobile/*`)
- ✅ NO autenticazione — single-user, privato
- ✅ Offline-first (cache localStorage + coda sync `pendingOps` / `pendingScans`)
- ✅ PWA service worker + manifest per asset statici cacheati offline
- ✅ Notifiche locali per promemoria (Capacitor LocalNotifications + Web Notification API)
- ✅ Diario pianta: foto periodiche + nota + timestamp, offline-first, cascade-delete
- ✅ Capacitor + GitHub Action `build-android-apk.yml` per APK Android

## Architecture
```
/app/
├── backend/
│   ├── server.py            # FastAPI single-user, no auth (~490 lines)
│   ├── tests/test_api.py    # 20 pytest no-auth regression tests
│   └── .env                 # MONGO_URL, DB_NAME, GEMINI_API_KEY
├── frontend/
│   ├── android/             # Capacitor Android project
│   ├── public/
│   │   ├── service-worker.js   # PWA static cache (cache-first + SWR)
│   │   └── manifest.json
│   ├── src/
│   │   ├── App.js              # ProfileProvider + Router (no auth wall)
│   │   ├── contexts/ProfileContext.js
│   │   ├── hooks/{useIsMobile,useOnlineStatus}.js
│   │   ├── lib/{api,offlineStorage,syncQueue}.js
│   │   ├── components/OfflineBanner.js
│   │   ├── pages/         # Desktop (HomePage, ScannerPage, DashboardPage, PlantDetailPage, RemindersPage, RecommendationsPage, ProfilePage)
│   │   └── mobile/        # Mobile (Mobile*Page.js + MobileBottomNav, MobileHeader)
│   └── package.json
└── .github/workflows/build-android-apk.yml
```

## API Endpoints (all PUBLIC, no auth)
- `GET /api/health`
- `GET/PUT /api/profile`
- `GET/POST /api/plants`, `GET/DELETE /api/plants/{id}` — `client_id` idempotent, cascade-deletes reminders
- `GET/POST /api/reminders`, `PUT/DELETE /api/reminders/{id}`
- `POST /api/identify` (Gemini Vision; ritorna fallback IdentifyResponse su errore)
- `GET /api/plant-of-the-week` (ISO-week based, filtra pet-safe se utente ha animali)
- `POST /api/recommendations` (filtri: pet_friendly, light)

## CHANGELOG
- **2026-02 (this session — iter 6)**: Aggiunto sistema **notifiche locali** unificato. `@capacitor/local-notifications@7` per Android nativo + Web Notification API per browser (lazy import, no Firebase). Una notifica per ogni promemoria al `next_due` esatto. Card "Notifiche" in `ProfilePage` + `MobileProfilePage` per richiedere permesso. Auto-schedule al boot dell'app, dopo flush queue, e su ogni toggle reminder. localStorage `pc_scheduled_notifs` + `pc_notif_permission`. Test: 100% frontend (Web Notification fires verified via setTimeout) + backend smoke (iteration_6.json).
- **2026-02 (iter 5)**: Auth completamente rimosso. Migrazione offline-first completata su tutte le pagine mobile. PWA service worker + manifest. `/api/identify` graceful fallback. Z-index nav mobile fix. Test: 20/20 backend + 100% frontend.
- **prior**: setup iniziale FastAPI+React+Mongo, integrazione Gemini, mobile layout, Capacitor + workflow APK, JWT auth (poi rimosso).

## Backlog
### P2
- `/api/identify`: ora ha fallback ma ancora cattura `Exception` generico; può essere ristretto a `BadRequestError`/`json.JSONDecodeError` per logging più chiaro.
- Migrare Pydantic `.dict()` → `.model_dump()` (deprecation warning v2).

### P3 — Refactor / Quality
- Split `server.py` (490 righe, complessità in `identify_plant`) in `routes/`, `services/`, `models/`.
- Cleanup `frontend/.env`: rimuovere `REACT_APP_AUTO_LOGIN_*` dead vars.
- Ridurre complessità ciclomatica in `MobileScannerPage` (FileReader doppio).

### P3 — Feature ideas
- IndexedDB invece di localStorage per pianta-immagini grandi (limite ~5MB).
- Notifiche push native via Capacitor per promemoria stagionali.
- Sezione "diario pianta" con foto periodiche e note.
- Esportazione/backup profilo + piante in JSON (Share Sheet su mobile).
- Verifica build APK Android effettivo tramite il workflow GitHub.

## Test Credentials
N/A — autenticazione completamente rimossa (app single-user privata).
