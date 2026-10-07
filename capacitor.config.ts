import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.pregnancycare.companion',
  appName: 'Katyamma Care',
  webDir: 'dist',
  backgroundColor: '#FFD6E0',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ['google.com'],
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_notify',
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFF5F7',
    },
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      fadeInDuration: 0,
      fadeOutDuration: 0,
      backgroundColor: '#FFD6E0',
      showSpinner: false,
    },
  },
}

export default config
