# PlantCare - Product Requirements Document

## Original Problem Statement
App per riconoscere le piante via foto, con guide personalizzate di cura, manutenzione e propagazione. Focus piante da interno, consigli su nuove piante da acquistare, considerando posizione e situazione casa (animali, ecc).

## Architecture
- **Frontend**: React + Tailwind + shadcn/ui + lucide-react, AuthContext + ProtectedRoute, useIsMobile hook (breakpoint 768px) per switch mobile/desktop
- **Backend**: FastAPI + MongoDB (motor async), JWT auth con bcrypt, httpOnly cookies (access 15min + refresh 7d), CORS con credentials per FRONTEND_URL
- **AI**: Google Gemini 2.5 Flash Vision via emergentintegrations (single call: identify + care + propagation + suitability)

## Core Features Implemented
1. **Auth JWT**: register/login/logout/refresh/me, bcrypt password hash, brute force protection (5 fail = 15min lockout per ip+email)
2. **Plant Recognition**: Gemini Vision con propagation completa (methods, difficulty, best_season, rooting_time, steps, tips)
3. **My Plants CRUD**: lista, dettaglio, eliminazione (cascade su reminders)
4. **Plant Detail Page**: visualizza care + PropagationSection completa
5. **Recommendations**: catalogo 7 piante + filtri pet-friendly e luce
6. **Plant of the Week**: rotazione settimanale ISO, filtro automatico pet-safe se utente ha animali
7. **Reminders**: CRUD + AUTO-CREAZIONE promemoria propagazione quando si salva una pianta nella stagione ideale
8. **Profile**: nome, città, animali, luce casa, spazio
9. **Mobile Version Separata**: 7 pagine dedicate con MobileBottomNav (FAB centrale Scanner), header compatto, layout touch-first
10. **Refactored Components**: PlantCard, PropagationSection, CareGuide condivisi tra mobile e desktop

## Implementation Timeline
- 2026-02-26: MVP iniziale + Plant of the Week
- 2026-02-26 (iter 2): Code quality fixes (hooks deps, key index, magic numbers, console)
- 2026-02-26 (iter 3): Propagation feature added
- 2026-02-26 (iter 4): JWT auth + mobile version + propagation reminders + refactored components

## Testing Status
- Backend: 25/25 pytest pass (100%) - cookie auth, all CRUD, propagation reminder, cascade delete, brute force
- Frontend: 100% desktop + mobile (390px viewport)
- Design issues: 0 critical (Emergent badge overlap risolto con z-index 50)

## Test Credentials
- Admin: admin@plantcare.com / admin123 (seeded at startup)
- User accounts: register via UI o POST /api/auth/register

## Prioritized Backlog

### P1
- [ ] Password reset via email (Resend integration)
- [ ] Object storage per immagini piante (no base64 inline)
- [ ] Notifiche push browser per promemoria stagionali
- [ ] Estendere catalogo piante (50+)

### P2
- [ ] OAuth Google login
- [ ] Multi-language (EN, ES)
- [ ] Storico identificazioni
- [ ] Community sharing
- [ ] Identificazione malattie

### P3
- [ ] Dark mode
- [ ] PWA installabile
- [ ] Export PDF guide cura
