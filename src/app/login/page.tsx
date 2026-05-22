'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check role and redirect
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'admin') {
      router.push('/admin')
    } else {
      router.push('/fan-zone')
    }
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
            Welcome Back
          </h1>
          <p className="text-xs tracking-widest" style={{ color: '#555' }}>
            Sign in to your Shaita Angels account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">

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
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-700 outline-none transition-all focus:ring-1"
              style={{
                background: '#0f0f0f',
                border: '1px solid #1a1a1a',
                focusRingColor: '#CC0000',
              }}
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
              placeholder="••••••••"
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
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Links */}
        <div className="text-center mt-6 flex flex-col gap-3">
          <p className="text-xs" style={{ color: '#555' }}>
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="font-black transition-colors hover:text-white"
              style={{ color: '#CC0000' }}
            >
              Sign Up
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