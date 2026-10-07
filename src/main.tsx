import { createRoot } from 'react-dom/client'
import { SplashScreen } from '@capacitor/splash-screen'
import './index.css'
import App from './App.tsx'

// Kill the Capacitor SplashScreen plugin instantly (zero animation) the moment
// the WebView is ready. The Android system splash (Theme.SplashScreen) already
// covers the launch gap; the React SplashScreen component covers the init gap.
// We do NOT want the Capacitor plugin splash in between.
SplashScreen.hide({ fadeOutDuration: 0 }).catch(() => {})

createRoot(document.getElementById('root')!).render(<App />)
