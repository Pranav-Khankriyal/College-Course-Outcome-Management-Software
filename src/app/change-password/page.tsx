'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Eye, EyeOff, Save } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/app/actions/auth'
import { useSession } from 'next-auth/react'

export default function ChangePasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { update } = useSession()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const result = await changePassword(password)
      if (result.error) {
        setError(result.error)
      } else {
        await update({ mustChangePassword: false })
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      setError('Failed to change password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="login-blob w-72 h-72 bg-primary/40 top-10 -left-20" />
      <div className="login-blob w-96 h-96 bg-accent/30 top-1/2 -right-20 animation-delay-2000" />
      <div className="login-blob w-64 h-64 bg-primary/20 bottom-10 left-1/3 animation-delay-4000" />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="login-card rounded-3xl p-8 shadow-2xl bg-white/80 backdrop-blur-xl border border-white/20">
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="mb-4"
            >
              <div className="w-24 h-24 mx-auto flex items-center justify-center mb-4 bg-primary/10 rounded-full">
                <Lock className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">
              Change Password
            </h1>
            <p className="text-sm text-muted-foreground mt-2">For security reasons, you must change your temporary password to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-black/10 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Enter new password"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-black/10 bg-white text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm text-destructive font-medium"
              >
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl gradient-primary font-semibold text-sm shadow-lg hover:shadow-xl transition-shadow duration-200 disabled:opacity-60 flex items-center justify-center gap-2 text-white bg-primary"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save & Continue
                </>
              )}
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
