import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { PwaProvider } from '@/components/pwa/PwaProvider'
import PwaInstallPrompt from '@/components/pwa/PwaInstallPrompt'
import OfflineIndicator from '@/components/pwa/OfflineIndicator'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://qr-pfc.vercel.app'),
  title: {
    default: 'PFC - Patna Fried Chicken | Feedback & Reviews',
    template: '%s | PFC Patna Fried Chicken',
  },
  description: 'Instant QR customer feedback, smart AI reviews & live restaurant management dashboard for PFC - Patna Fried Chicken, Ashiyana Digha Road, Patna',
  applicationName: 'PFC Feedback',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PFC Patna',
  },
  formatDetection: {
    telephone: false,
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: ['/icons/icon-192x192.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="PFC Patna" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        {/* Development: Force-unregister lingering service workers & clear stale dev caches */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for (var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(keys) {
                    keys.forEach(function(k) { caches.delete(k); });
                  });
                }
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} min-h-screen min-h-[100dvh] bg-slate-950 text-slate-100 antialiased overflow-x-hidden selection:bg-amber-500 selection:text-white`}>
        <PwaProvider>
          <OfflineIndicator />
          {children}
          <PwaInstallPrompt />
        </PwaProvider>
      </body>
    </html>
  )
}
