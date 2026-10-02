import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Sparkles, LayoutDashboard, QrCode, MessageSquare, Utensils, Settings, LogOut, Users } from 'lucide-react'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  async function signOutAction() {
    'use server'
    const serverSupabase = await createClient()
    await serverSupabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center text-white font-extrabold shadow-md shadow-rose-600/20 group-hover:scale-105 transition-transform border border-rose-400/30 overflow-hidden text-xs tracking-wider">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/pfc-logo.jpg" alt="PFC" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base text-white tracking-tight leading-tight">Patna Fried Chicken (PFC)</span>
                <span className="text-[10px] text-rose-400 font-semibold leading-none">ReviewPulse Portal • Ashiyana Digha Rd, Patna</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm">
              <Link
                href="/dashboard?tab=overview"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <LayoutDashboard className="w-4 h-4 text-rose-400" />
                Overview
              </Link>
              <Link
                href="/dashboard?tab=customers"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <Users className="w-4 h-4 text-teal-400" />
                Customers
              </Link>
              <Link
                href="/dashboard?tab=responses"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                Responses
              </Link>
              <Link
                href="/dashboard?tab=campaigns"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <QrCode className="w-4 h-4 text-rose-400" />
                Campaigns
              </Link>
              <Link
                href="/dashboard?tab=menu"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <Utensils className="w-4 h-4 text-emerald-400" />
                Menu
              </Link>
              <Link
                href="/dashboard?tab=settings"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 font-medium transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-400" />
                Settings
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-200 truncate max-w-[200px]">
                {user.email}
              </span>
              <span className="text-[11px] text-rose-400 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-rose-400" /> PFC Owner / Admin
              </span>
            </div>

            <form action={signOutAction}>
              <button
                type="submit"
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-900/50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {children}
      </main>
    </div>
  )
}
