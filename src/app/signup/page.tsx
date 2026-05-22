'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div
        style={{ background: '#0a0a0a', minHeight: '100vh' }}
        className="flex items-center justify-center px-4"
      >
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-white font-black text-xl uppercase tracking-tight mb-3">
            Welcome to the Family!
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: '#666' }}>
            Your account has been created. Check your email to confirm your account,
            then log in to access the Fan Zone.
          </p>
          <Link
            href="/login"
            className="inline-block text-white font-black tracking-widest uppercase text-xs px-6 py-3 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000' }}
          >
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{ background: '#0a0a0a', minHeight: '100vh' }}
      className="flex items-center justify-center px-4 py-12"
    >
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 font-black text-white text-lg"
            style={{ background: '#CC0000' }}
          >
            SA
          </div>
          <h1 className="text-white font-black text-xl uppercase tracking-tight mb-1">
            Join the Angels
          </h1>
          <p className="text-xs tracking-widest" style={{ color: '#555' }}>
            Create your Shaita Angels fan account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSignup} className="flex flex-col gap-4">

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-xs font-bold"
              style={{ background: '#1a0000', border: '1px solid #CC0000', color: '#ff6666' }}
            >
              {error}
            </div>
          )}

          <div>
            <label
              className="block text-xs font-black tracking-widest uppercase mb-2"
              style={{ color: '#555' }}
            >
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              placeholder="Your full name"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-700 outline-none"
              style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-black tracking-widest uppercase mb-2"
              style={{ color: '#555' }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-700 outline-none"
              style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-black tracking-widest uppercase mb-2"
              style={{ color: '#555' }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Min. 6 characters"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-700 outline-none"
              style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
            />
          </div>

          <div>
            <label
              className="block text-xs font-black tracking-widest uppercase mb-2"
              style={{ color: '#555' }}
            >
              Confirm Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              placeholder="Repeat your password"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-700 outline-none"
              style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80 mt-2"
            style={{
              background: loading ? '#555' : '#CC0000',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-6 flex flex-col gap-3">
          <p className="text-xs" style={{ color: '#555' }}>
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-black transition-colors hover:text-white"
              style={{ color: '#CC0000' }}
            >
              Sign In
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs font-black tracking-widest uppercase transition-colors hover:text-white"
            style={{ color: '#333' }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}