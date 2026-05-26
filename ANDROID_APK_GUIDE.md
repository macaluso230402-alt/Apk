# PlantCare — Come scaricare l'APK Android

Questo container Emergent **non può buildare APK** direttamente (manca Android SDK/Java). La build avviene automaticamente su **GitHub Actions** e ti permette di scaricare l'`.apk` finito.

---

## 🚀 Passi rapidi (3 minuti)

### 1. Salva il codice su GitHub
Dalla chat di Emergent, clicca **"Save to GitHub"** (in alto a destra o nella barra dei comandi). Conferma il push sul tuo repo.

### 2. Aggiungi il secret `REACT_APP_BACKEND_URL`
Sul repo GitHub:
1. **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
2. **Name**: `REACT_APP_BACKEND_URL`
3. **Value**: `https://plant-smart-care.preview.emergentagent.com`
   *(o il tuo URL di produzione se hai già fatto Deploy)*
4. **Add secret** ✅

### 3. Lancia la build
Sul repo GitHub:
1. Tab **Actions**
2. Sidebar → **Build Android APK**
3. Clicca **Run workflow** → branch **main** → **Run workflow** verde

Attendi ~5-10 minuti. La spunta verde ✅ significa build OK.

### 4. Scarica l'APK
1. Clicca sul run completato
2. Scorri fino in fondo → sezione **Artifacts**
3. Clicca **PlantCare-debug-apk** → scarica lo zip
4. Estrai → ottieni **`PlantCare-debug.apk`**

---

## 📱 Installa sul telefono Android

1. Trasferisci l'`.apk` sul telefono (USB, Google Drive, Telegram a te stesso, email…)
2. Sul telefono: **Impostazioni → Sicurezza → Installa app sconosciute** → abilita per il file manager che usi
3. Apri il file `.apk` → tocca **Installa** → **Apri** → trova l'icona **PlantCare** 🌿

---

## ✨ Cosa include questo APK

- ✅ Riconoscimento piante via fotocamera (Gemini Vision)
- ✅ Diario pianta con foto periodiche
- ✅ Promemoria con **notifiche locali native** (anche con app chiusa)
- ✅ Funziona **offline** — scansioni e modifiche vengono sincronizzate quando torni online
- ✅ Profilo personalizzato con animali, posizione, esposizione

---

## 🐛 Se la build fallisce

1. Apri il run rosso sulla tab **Actions**
2. Espandi lo step in rosso → leggi le ultime righe del log
3. Cause comuni:
   - **Secret mancante** → ricontrolla `REACT_APP_BACKEND_URL`
   - **yarn.lock disallineato** → fai un re-push da Emergent
   - **`cap sync` errore** → assicurati che `frontend/android/` sia stato committato

---

## 🔐 APK firmato (release, opzionale)

L'APK generato è **debug** — perfetto per uso personale.

Per pubblicare su Play Store servirebbe un APK **release** firmato:
1. Genera keystore: `keytool -genkey -v -keystore plantcare.keystore -alias plantcare -keyalg RSA -keysize 2048 -validity 10000`
2. Aggiungi i secret GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
3. Modifica il workflow per usare `./gradlew assembleRelease` con signing config

*(Non necessario per uso privato.)*

---

## 🛠️ Build locale alternativa (con Android Studio)

Se hai Android Studio sul tuo PC:
```bash
cd frontend
yarn install
yarn build
npx cap sync android
npx cap open android   # apre Android Studio
```
Poi in Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
L'APK sarà in `frontend/android/app/build/outputs/apk/debug/`.
