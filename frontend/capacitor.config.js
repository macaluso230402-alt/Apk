/** @type {import('@capacitor/cli').CapacitorConfig} */
const config = {
  appId: 'com.plantcare.app',
  appName: 'PlantCare',
  webDir: 'build',
  server: {
    // For dev: load from local server. Comment out and use bundled web assets for production APK.
    // url: 'https://plant-smart-care.preview.emergentagent.com',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
  },
};

module.exports = config;
