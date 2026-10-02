'use client'

import { useSyncExternalStore } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'

interface OfflineBannerProps {
  hasSyncError?: boolean
  onRetry?: () => void
}

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

export default function OfflineBanner({ hasSyncError = false, onRetry }: OfflineBannerProps) {
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getServerOnlineSnapshot)
  const isOffline = !isOnline

  if (!isOffline && !hasSyncError) return null

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-sm rounded-2xl bg-slate-900 border border-amber-500/30 p-3 shadow-2xl text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
          <WifiOff className="w-4 h-4" />
        </div>
        <div>
          <p className="font-semibold text-white">Connection lost</p>
          <p className="text-[11px] text-amber-300/80">Checking connection &amp; saving answers...</p>
        </div>
      </div>

      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry</span>
        </button>
      )}
    </div>
  )
}
