# PlantCare - Product Requirements Document

## Original Problem Statement
Applicazione per riconoscere le piante tramite fotocamera con guide personalizzate di cura e manutenzione. Focus su piante da interno con consigli su nuove piante da acquistare, considerando la posizione e la situazione domestica (animali, illuminazione, spazio).

## Architecture
- **Frontend**: React + Tailwind CSS + shadcn/ui + lucide-react
- **Backend**: FastAPI + MongoDB (motor async)
- **AI**: Google Gemini 2.5 Flash (vision) via emergentintegrations library
- **Routing**: React Router v7

## User Personas
- **Indoor plant enthusiasts**: Vogliono identificare e curare piante da interno
- **Beginner plant parents**: Cercano guide semplici e personalizzate
- **Pet owners**: Hanno bisogno di info sicurezza per animali

## Core Requirements (static)
1. Plant recognition tramite foto upload (camera/file)
2. Care guides personalizzate basate su contesto utente
3. Dashboard "Le Mie Piante" con CRUD
4. Sistema di promemoria per cura piante
5. Raccomandazioni nuove piante con filtri (pet-friendly, luce)
6. Profilo utente con localizzazione e situazione casa

## What's Been Implemented (2026-02-26)
### Backend (`/app/backend/server.py`)
- `POST /api/identify` - Identificazione pianta con Gemini Vision + guida personalizzata
- `POST/GET/PUT /api/users` - Profilo utente (uuid4 IDs)
- `POST/GET/DELETE /api/plants` - CRUD piante salvate
- `POST/GET/PUT /api/reminders` - Sistema promemoria (PUT con JSON body)
- `POST /api/recommendations` - Suggerimenti piante con filtri

### Frontend (`/app/frontend/src/pages/`)
- `HomePage.js` - Landing con hero, features e CTA
- `ScannerPage.js` - Upload foto + identificazione AI + salvataggio
- `DashboardPage.js` - Lista piante salvate
- `PlantDetailPage.js` - Dettaglio singola pianta
- `RecommendationsPage.js` - Suggerimenti con filtri (shadcn Select)
- `ProfilePage.js` - Impostazioni utente (posizione, animali, luce)
- `RemindersPage.js` - Lista promemoria con toggle

### Integrations
- Google Gemini 2.5 Flash con Vision (chiave utente personale)
- emergentintegrations library per LLM calls

### Design System
- Cabinet Grotesk (headings) + Manrope (body)
- Palette organica: #3E6A4B (primary), #FDFBF7 (bg), #E07A5F (accent)
- Cards rounded-2xl con soft shadows
- Glassmorphism header
- Pill-shaped buttons

## Testing Status
- Backend: 15/15 pytest pass (100%)
- Frontend: All flows verified working (100%)
- E2E plant identification verified with real images

## Prioritized Backlog

### P1 - High Priority
- [ ] Aggiungere data-testid mancanti su elementi HomePage hero
- [ ] Implementare object storage per image_url (invece di base64 inline)
- [ ] Splitting di server.py in routers/models/services
- [ ] Login/auth system (attualmente demo-user hardcoded)

### P2 - Medium Priority
- [ ] Multi-language support (oltre italiano)
- [ ] Notifiche push browser per promemoria
- [ ] Storico identificazioni
- [ ] Condivisione piante con community
- [ ] Calendario integrato per cure

### P3 - Nice to Have
- [ ] Identificazione malattie pianta
- [ ] Mappa piante in casa
- [ ] Export dati piante (PDF/CSV)
- [ ] Dark mode
- [ ] Statistiche cura piante
