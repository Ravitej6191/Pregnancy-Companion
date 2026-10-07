import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'
import { BottomNav } from './BottomNav'
import { useToast } from '../ui/Toast'

// Bottom-nav root tabs — back button on these should show the exit toast,
// not navigate backwards through previously visited tabs.
const ROOT_TABS = new Set(['/', '/daily-checklist', '/guide', '/profile'])

function AppShellInner() {
  const location = useLocation()
  const navigate = useNavigate()
  const { show } = useToast()
  const lastBackPressRef = useRef<number>(0)

  // Reset scroll to top on every route change
  useEffect(() => {
    const mainEl = document.querySelector('main')
    if (mainEl) mainEl.scrollTop = 0
  }, [location.pathname])

  // Android hardware back button — navigate back or show exit warning
  useEffect(() => {
    let handle: PluginListenerHandle | null = null
    let cleaned = false

    CapacitorApp.addListener('backButton', () => {
      if (ROOT_TABS.has(location.pathname)) {
        // On any root tab: double-press to exit
        const now = Date.now()
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp()
        } else {
          lastBackPressRef.current = now
          show('Press back again to exit', 'info')
        }
      } else {
        // On any sub-page: go back; fall back to home if history is exhausted
        navigate(-1)
      }
    }).then(h => {
      if (cleaned) {
        h.remove()
      } else {
        handle = h
      }
    })

    return () => {
      cleaned = true
      handle?.remove()
    }
  }, [location.pathname, navigate, show])

  return (
    <div className="flex flex-col h-screen bg-brand-bg overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto overflow-x-hidden main-scroll-pb">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

export function AppShell() {
  return <AppShellInner />
}
