# PlantCare — App Android (APK)

Questa guida spiega come ottenere il file `.apk` per installare PlantCare sul tuo telefono Android.

## 📋 Prerequisiti

1. **Backend deployato e accessibile via HTTPS** (preview URL o deploy permanente)
2. Account GitHub collegato a Emergent (il codice viene pushato sul repo)
3. Repository su GitHub con questo codice

## 🔧 Setup Iniziale (una sola volta)

### 1. Configura il segreto del backend URL

Nel tuo repository GitHub:

1. Vai su **Settings → Secrets and variables → Actions**
2. Clicca **New repository secret**
3. Aggiungi:
   - **Name:** `REACT_APP_BACKEND_URL`
   - **Value:** `https://plant-smart-care.preview.emergentagent.com` (o il tuo URL di produzione)
4. Salva

> ⚠️ Senza questo segreto, l'APK non saprà a quale backend connettersi.

### 2. Aggiorna `FRONTEND_URL` sul backend

Affinché l'app Android possa fare login (cookie cross-site), il backend deve permettere l'origin `https://localhost` (gestito automaticamente da Capacitor) — già configurato in `backend/server.py`. ✅

## 🚀 Costruire l'APK

### Trigger automatico
Ogni push al branch `main` che modifica `frontend/**` fa partire il workflow.

### Trigger manuale
1. Vai sul repository GitHub
2. Tab **Actions** → **Build Android APK**
3. Clicca **Run workflow** → scegli branch → **Run workflow**

### Tempo di build
~5-10 minuti per il primo build, ~3-5 minuti per i successivi.

## 📥 Scaricare l'APK

1. Una volta che il workflow è completato (badge verde ✅)
2. Apri il run dalla tab **Actions**
3. Scorri in fondo, sezione **Artifacts**
4. Scarica `PlantCare-debug-apk` (file ZIP)
5. Estrai → otterrai `PlantCare-debug.apk`

## 📱 Installare l'APK sul Telefono

1. **Trasferisci** il file `.apk` sul telefono (USB, Drive, email, Telegram a te stesso, ecc.)
2. Sul telefono Android:
   - Vai in **Impostazioni → Sicurezza** (o **App → Accesso speciale**)
   - Abilita **"Installa da origini sconosciute"** per il browser/file manager che usi
3. Apri il file `.apk` → tocca **Installa**
4. Tocca **Apri** o trova l'icona **PlantCare** nel drawer app

## 🐛 Troubleshooting

### "App non installata"
- Disinstalla versioni precedenti
- Verifica spazio libero
- Riprova con un file manager diverso

### App si apre ma non fa login
- Backend offline o URL sbagliato nel secret → ricontrolla `REACT_APP_BACKEND_URL`
- CORS non configurato → verifica che `backend/server.py` includa `capacitor://localhost` e `https://localhost` (già fatto ✅)
- Cookie bloccati → assicurati che il backend usi HTTPS (i cookie `Secure` non funzionano su HTTP)

### Build fallisce su GitHub Actions
- Tab **Actions** → apri il run fallito → leggi il log dello step rosso
- Cause comuni: `yarn.lock` non sincronizzato, secret mancante, errori in `frontend/build`

## 🔐 Build di Produzione (Firmato)

Il workflow attuale genera un APK **debug** (sufficiente per uso privato).

Per generare un APK **release** firmato (necessario se vuoi pubblicare in futuro):
1. Crea un keystore: `keytool -genkey -v -keystore plantcare-release.keystore -alias plantcare -keyalg RSA -keysize 2048 -validity 10000`
2. Aggiungi i secret in GitHub: `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`
3. Modifica il workflow per usare `assembleRelease` con signing config

(per uso privato puoi ignorare questa sezione)

## 📦 Build Locale (Alternativa)

Se hai **Android Studio** installato sul tuo computer:

```bash
cd frontend
yarn install
yarn build
npx cap copy android
npx cap open android   # apre Android Studio
```

Poi in Android Studio: **Build → Build Bundle(s)/APK(s) → Build APK(s)**.
