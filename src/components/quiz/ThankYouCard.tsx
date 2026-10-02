'use client'

import React, { useState } from 'react'
import { Heart, RotateCcw, Sparkles, CheckCircle2, MapPin, Share2, Phone, Check } from 'lucide-react'

interface ThankYouCardProps {
  restaurantName: string
  slug?: string
}

export default function ThankYouCard({ restaurantName, slug }: ThankYouCardProps) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (typeof window === 'undefined') return
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${restaurantName} — Crispy Fried Chicken & Fast Food`,
          text: `Check out ${restaurantName} on Ashiyana Digha Road near Gold's Gym, Divya Apartment Shop No 4, Patna!`,
          url,
        })
      } catch {}
    } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  return (
    <main className="relative z-10 w-full max-w-md mx-auto my-auto py-3 sm:py-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-stone-200/90 shadow-[0_25px_60px_-15px_rgba(225,29,72,0.12),0_4px_20px_rgba(0,0,0,0.04)] text-center space-y-5 sm:space-y-6">
        {/* Celebration Heart Monogram */}
        <div className="relative mx-auto w-20 h-20">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xl shadow-rose-600/25 border-2 border-rose-200/60">
            <Heart className="w-10 h-10 fill-white text-white drop-shadow-sm animate-pulse" />
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-white shadow-xs border border-stone-200 text-rose-600">
            <Sparkles className="w-4 h-4 fill-amber-400 text-amber-500" />
          </div>
        </div>

        {/* Title & Shukriya Badge */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200/80 text-[11px] font-bold text-rose-900 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-600" />
            <span>Thank You! धन्यवाद</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight leading-tight">
            Thank you for dining with us!
          </h1>

          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-xs mx-auto">
            Your honest thoughts help the chef and team at{' '}
            <strong className="text-stone-800 font-semibold">{restaurantName || 'Patna Fried Chicken (PFC)'}</strong> maintain
            the highest culinary standard.
          </p>
        </div>

        {/* Verified Feedback Badge Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-b from-rose-50/50 to-stone-50 border border-rose-200/70 text-left space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Feedback Recorded Successfully</span>
            </div>
            <span className="text-[10px] font-semibold text-rose-800 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-300/40">
              Verified Diner
            </span>
          </div>
          <p className="text-xs text-stone-600 leading-relaxed">
            Our management team and kitchen staff review every response to continually perfect our crispy recipes, fried chicken, burgers, and hospitality. We look forward to serving you again soon!
          </p>
        </div>

        {/* Customer Helpline & Quick Action Buttons */}
        <div className="space-y-2.5 pt-1">
          {/* Primary: Direct Call to Restaurant */}
          <a
            href="tel:7091719475"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 text-sm transition-all duration-200 cursor-pointer active:scale-95"
          >
            <Phone className="w-4 h-4" />
            <span>Call Restaurant: +91 70917 19475</span>
          </a>

          {/* Secondary Buttons Row */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href="https://www.google.com/maps/search/?api=1&query=PFC+Patna+Fried+Chicken+Ashiyana+Digha+Road+Divya+Apartment+Patna"
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-3 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/90 text-stone-700 hover:text-stone-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span>Directions</span>
            </a>

            <button
              type="button"
              onClick={handleShare}
              className={`h-11 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-stone-50 hover:bg-stone-100 border-stone-200/90 text-stone-700 hover:text-stone-900'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-teal-600" />
                  <span>Share Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Subtle Footer Action: Submit another response */}
        {slug && (
          <div className="pt-2 border-t border-stone-100">
            <a
              href={`/r/${slug}?new=1`}
              className="inline-flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-semibold transition-colors py-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
              <span>Submit another response</span>
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
