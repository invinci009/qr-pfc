'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2, KeyRound, UserCheck, ShieldCheck } from 'lucide-react'
import ChangePasswordModal from '@/components/auth/ChangePasswordModal'

export default function LoginPage() {
  const [email, setEmail] = useState('admin')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: email.trim(),
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Invalid login credentials. Please try again.')
        setLoading(false)
        return
      }

      // Successful login -> instant navigation to dashboard
      window.location.href = '/dashboard'
    } catch (err: unknown) {
      const rawMsg = err instanceof Error ? err.message : 'Connection error. Please try again.'
      setError(rawMsg)
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="border border-slate-800 bg-slate-900/85 backdrop-blur-xl shadow-2xl text-slate-100 rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1.5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-rose-500/20 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pfc-logo.jpg" alt="PFC" className="w-full h-full object-cover" />
            </div>
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Patna Fried Chicken (PFC) Admin
            </span>
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <LogIn className="w-5 h-5 text-amber-500" />
            Welcome back
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">
            Sign in to view guest responses, customer phone numbers, &amp; analytics
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-3.5 pt-1">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-500" />
                Username or Email
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="admin, pfc or owner@pfcpatna.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                autoComplete="username"
                className="bg-slate-950/70 border-slate-800 focus:border-rose-500 text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setSuccessMessage(null)
                    setIsChangeModalOpen(true)
                  }}
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer group hover:underline"
                >
                  <KeyRound className="w-3 h-3 text-amber-400 group-hover:rotate-12 transition-transform" />
                  <span>Change Password</span>
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="bg-slate-950/70 border-slate-800 focus:border-amber-500 text-white placeholder:text-slate-500 h-11 pr-10 rounded-xl text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-3 pb-5">
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold h-11 rounded-xl shadow-lg shadow-amber-600/25 transition-all duration-200 cursor-pointer text-sm active:scale-95 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to Dashboard'
              )}
            </Button>

            <div className="flex items-center justify-center w-full pt-1.5 px-0.5 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setSuccessMessage(null)
                  setIsChangeModalOpen(true)
                }}
                className="hover:text-amber-400 transition-colors cursor-pointer flex items-center gap-1"
              >
                <span>Forgot or reset password?</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-rose-500/70" />
              <span>Patna Fried Chicken (PFC) Admin Portal • Ashiyana Digha Rd</span>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Interactive Password Change / Reset Modal */}
      <ChangePasswordModal
        isOpen={isChangeModalOpen}
        onClose={() => setIsChangeModalOpen(false)}
        initialUsername={email}
        onPasswordChanged={(newPass, user) => {
          setPassword(newPass)
          if (user) setEmail(user)
          setSuccessMessage('Password updated successfully! Click "Sign in to Dashboard" with your new credentials.')
        }}
      />
    </>
  )
}
