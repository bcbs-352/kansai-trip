import React from 'react'
import ReactDOM from 'react-dom/client'
import { TranslationProvider } from '../i18n'
import { useSettingsStore } from '../store/settingsStore'
import ErrorBoundary, { RootErrorFallback } from '../components/shared/ErrorBoundary'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/600.css'
import '@fontsource/geist-sans/400.css'
import '@fontsource/geist-sans/600.css'
import 'leaflet/dist/leaflet.css'
import '../index.css'
import './static.css'
import StaticTripPage from './StaticTripPage'

useSettingsStore.getState().setLanguageTransient('zh')
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary boundaryId="root" level="root" fallback={s => <RootErrorFallback {...s} />}>
      <TranslationProvider><StaticTripPage /></TranslationProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
