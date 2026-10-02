'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

interface PwaContextValue {
  isInstallable: boolean
  isInstalled: boolean
  isIOS: boolean
  isOnline: boolean
  promptInstall: () => Promise<boolean>
  showInstallModal: boolean
  setShowInstallModal: (show: boolean) => void
  dismissInstallPrompt: () => void
}

const PwaContext = createContext<PwaContextValue | null>(null)

const DISMISS_KEY = 'rp_pwa_prompt_dismissed_until'

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}

function getServerOnlineSnapshot() {
  return true
}

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot)
  const [showInstallModal, setShowInstallModal] = useState(false)

  // 1. Register Service Worker & check standalone mode
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !('MSStream' in window)
    setIsIOS(isIosDevice)

    // Check if running in standalone display mode (installed)
    const nav = window.navigator as unknown as { standalone?: boolean }
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      nav.standalone === true ||
      document.referrer.includes('android-app://')

    setIsInstalled(isStandalone)

    // Register service worker if supported (production only)
    if ('serviceWorker' in navigator) {
      if (process.env.NODE_ENV === 'production') {
        navigator.serviceWorker
          .register('/sw.js', { scope: '/' })
          .then((reg) => {
            // Check for updates
            reg.addEventListener('updatefound', () => {
              const installingWorker = reg.installing
              if (installingWorker) {
                installingWorker.addEventListener('statechange', () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New content is available; please refresh.')
                  }
                })
              }
            })
          })
          .catch((err) => {
            console.warn('[PWA] Service Worker registration failed:', err)
          })
      } else {
        // In development, unregister any active service workers & purge caches to avoid Turbopack chunk mismatch errors
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          for (const reg of registrations) {
            reg.unregister()
          }
        })
        if ('caches' in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => {
              if (key.startsWith('rp-')) {
                caches.delete(key)
              }
            })
          })
        }
      }
    }

    // Capture Android/Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)

      // Auto-display prompt after a short delay if not dismissed recently
      const dismissedUntil = localStorage.getItem(DISMISS_KEY)
      const now = Date.now()
      if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
        setTimeout(() => {
          setShowInstallModal(true)
        }, 3500)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Detect when app is successfully installed
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setShowInstallModal(false)
      setDeferredPrompt(null)
      console.log('[PWA] App successfully installed')
    }

    window.addEventListener('appinstalled', handleAppInstalled)

    // For iOS users who haven't installed yet, offer install instructions
    if (isIosDevice && !isStandalone) {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY)
      const now = Date.now()
      if (!dismissedUntil || now > parseInt(dismissedUntil, 10)) {
        setTimeout(() => {
          setShowInstallModal(true)
        }, 5000)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Trigger installation prompt
  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      if (isIOS) {
        setShowInstallModal(true)
        return false
      }
      return false
    }

    try {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true)
        setIsInstallable(false)
        setShowInstallModal(false)
        setDeferredPrompt(null)
        return true
      }
    } catch (err) {
      console.error('[PWA] Install prompt error:', err)
    }
    return false
  }, [deferredPrompt, isIOS])

  const dismissInstallPrompt = useCallback(() => {
    setShowInstallModal(false)
    // Don't show again for 5 days
    const fiveDaysFromNow = Date.now() + 5 * 24 * 60 * 60 * 1000
    try {
      localStorage.setItem(DISMISS_KEY, fiveDaysFromNow.toString())
    } catch {}
  }, [])

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIOS,
        isOnline,
        promptInstall,
        showInstallModal,
        setShowInstallModal,
        dismissInstallPrompt,
      }}
    >
      {children}
    </PwaContext.Provider>
  )
}

export function usePwa() {
  const context = useContext(PwaContext)
  if (!context) {
    throw new Error('usePwa must be used within a PwaProvider')
  }
  return context
}
