'use client'

import React, { useState } from 'react'
import {
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Mail,
  Lock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
  initialUsername?: string
  onPasswordChanged: (newPassword: string, username: string) => void
}

export default function ChangePasswordModal({
  isOpen,
  onClose,
  initialUsername = 'admin',
  onPasswordChanged,
}: ChangePasswordModalProps) {
  const [activeMode, setActiveMode] = useState<'change' | 'reset'>('change')
  const [username, setUsername] = useState(initialUsername)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Sync initialUsername if opened with new value
  React.useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername)
    }
  }, [initialUsername])

  if (!isOpen) return null

  // Password strength calculation
  const calculateStrength = (pass: string) => {
    let score = 0
    if (pass.length >= 8) score += 1
    if (pass.length >= 12) score += 1
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1
    return score // 0 - 4
  }

  const strengthScore = calculateStrength(newPassword)
  const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const strengthColors = [
    'bg-slate-700',
    'bg-rose-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-emerald-500',
  ]

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          currentPassword,
          newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to update password. Please check your credentials.')
        setLoading(false)
        return
      }

      setSuccess('Password updated successfully! You can now log in with your new password.')
      onPasswordChanged(newPassword, username.trim())
      setLoading(false)

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.')
      setLoading(false)
    }
  }

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!username.trim()) {
      setError('Please provide your username or registered email.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to send password reset instructions.')
        setLoading(false)
        return
      }

      setSuccess(
        data.message || 'If an account exists, a password reset email has been dispatched.'
      )
      setLoading(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Glow Accent Top Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 pb-4 border-b border-slate-800/80 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Admin Security
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              {activeMode === 'change' ? 'Change Account Password' : 'Reset Password'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeMode === 'change'
                ? 'Update your credentials with your own custom secure password.'
                : 'Send a secure recovery link to the registered owner email.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-5 sm:px-6 pt-3">
          <div className="grid grid-cols-2 p-1 bg-slate-950/70 border border-slate-800/90 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setActiveMode('change')
                setError(null)
                setSuccess(null)
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'change'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Update Password
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveMode('reset')
                setError(null)
                setSuccess(null)
              }}
              className={`py-1.5 rounded-lg transition-all cursor-pointer ${
                activeMode === 'reset'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Email Reset Link
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {activeMode === 'change' ? (
            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* Username Input */}
              <div className="space-y-1">
                <Label htmlFor="c-username" className="text-xs font-semibold text-slate-300">
                  Username or Email
                </Label>
                <Input
                  id="c-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin or email"
                  disabled={loading}
                  className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 h-10 rounded-xl text-xs"
                />
              </div>

              {/* Current Password Input */}
              <div className="space-y-1">
                <Label htmlFor="c-current" className="text-xs font-semibold text-slate-300">
                  Current Password
                </Label>
                <div className="relative">
                  <Input
                    id="c-current"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter your current password"
                    disabled={loading}
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 h-10 pr-9 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* New Password Input */}
              <div className="space-y-1">
                <Label htmlFor="c-new" className="text-xs font-semibold text-slate-300">
                  New Password
                </Label>
                <div className="relative">
                  <Input
                    id="c-new"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 8 characters"
                    disabled={loading}
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 h-10 pr-9 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {newPassword.length > 0 && (
                  <div className="pt-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Strength:</span>
                      <span
                        className={`font-semibold ${
                          strengthScore <= 1
                            ? 'text-rose-400'
                            : strengthScore <= 2
                            ? 'text-amber-400'
                            : strengthScore === 3
                            ? 'text-sky-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {strengthLabels[strengthScore]}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`rounded-full h-full transition-all duration-200 ${
                            strengthScore >= step ? strengthColors[strengthScore] : 'bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm New Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="c-confirm" className="text-xs font-semibold text-slate-300">
                    Confirm New Password
                  </Label>
                  {confirmPassword.length > 0 && (
                    <span
                      className={`text-[10px] font-semibold flex items-center gap-1 ${
                        newPassword === confirmPassword ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {newPassword === confirmPassword ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> Passwords match
                        </>
                      ) : (
                        'Does not match'
                      )}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="c-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-type new password"
                    disabled={loading}
                    className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 h-10 pr-9 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    tabIndex={-1}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="bg-transparent border-slate-800 hover:bg-slate-800 text-slate-300 h-10 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold h-10 px-5 rounded-xl shadow-md shadow-amber-600/20 text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Save New Password'
                  )}
                </Button>
              </div>
            </form>
          ) : (
            /* Email Reset Form */
            <form onSubmit={handleSendResetEmail} className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-start gap-2">
                <Mail className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Enter your admin alias (e.g. <strong>admin</strong>) or registered email. A password
                  reset link will be sent to the restaurant owner inbox.
                </span>
              </div>

              <div className="space-y-1">
                <Label htmlFor="r-username" className="text-xs font-semibold text-slate-300">
                  Username or Email
                </Label>
                <Input
                  id="r-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="admin, pfc or owner@pfcpatna.com"
                  disabled={loading}
                  className="bg-slate-950/70 border-slate-800 text-white placeholder:text-slate-500 h-10 rounded-xl text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={loading}
                  className="bg-transparent border-slate-800 hover:bg-slate-800 text-slate-300 h-10 rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-bold h-10 px-5 rounded-xl shadow-md shadow-amber-600/20 text-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Secured via Supabase Authentication &amp; Encrypted Sessions</span>
        </div>
      </div>
    </div>
  )
}
