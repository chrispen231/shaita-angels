'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Shield } from 'lucide-react'

type Fan = {
  id: string
  email: string
  full_name: string
  role: string
  created_at: string
}

export default function AdminFansPage() {
  const supabase = createClient()
  const [fans, setFans] = useState<Fan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setFans(data || [])
    setLoading(false)
  }

  async function toggleRole(fan: Fan) {
    const newRole = fan.role === 'admin' ? 'fan' : 'admin'
    if (!confirm(`Make ${fan.full_name || fan.email} a${newRole === 'admin' ? 'n admin' : ' fan'}?`)) return
    await supabase.from('profiles').update({ role: newRole }).eq('id', fan.id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remove this user? This cannot be undone.')) return
    await supabase.from('profiles').delete().eq('id', id)
    load()
  }

  const filtered = fans.filter(f =>
    f.email?.toLowerCase().includes(search.toLowerCase()) ||
    f.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 86400) return 'Today'
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Fans</h1>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="rounded-xl px-3 py-2 text-center"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}
            >
              <p className="font-black text-lg text-white">{fans.length}</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: '#555', fontSize: '9px' }}>
                Total
              </p>
            </div>
            <div
              className="rounded-xl px-3 py-2 text-center"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}
            >
              <p className="font-black text-lg" style={{ color: '#CC0000' }}>
                {fans.filter(f => f.role === 'admin').length}
              </p>
              <p className="text-xs tracking-widest uppercase" style={{ color: '#555', fontSize: '9px' }}>
                Admins
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full px-4 py-3 rounded-xl text-sm text-white outline-none"
            style={{ background: '#1a1a1a', border: '1px solid #222' }}
          />
        </div>

        {/* Fans table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid #222' }}
        >
          <div
            className="grid px-5 py-3"
            style={{
              gridTemplateColumns: '1fr 1fr 100px 100px 80px',
              borderBottom: '1px solid #222',
            }}
          >
            {['Name', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
              <p key={h} className="text-xs font-black tracking-widest uppercase"
                style={{ color: '#555' }}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                Loading...
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                No users found
              </p>
            </div>
          ) : (
            filtered.map((fan, i) => (
              <div
                key={fan.id}
                className="grid px-5 py-4 items-center"
                style={{
                  gridTemplateColumns: '1fr 1fr 100px 100px 80px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #222' : 'none',
                }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0"
                    style={{ background: fan.role === 'admin' ? '#CC0000' : '#333' }}
                  >
                    {(fan.full_name || fan.email || 'F').slice(0, 2).toUpperCase()}
                  </div>
                  <p className="text-white font-black text-sm truncate">
                    {fan.full_name || '—'}
                  </p>
                </div>
                <p className="text-xs truncate" style={{ color: '#888' }}>{fan.email}</p>
                <span
                  className="text-xs font-black px-2 py-1 rounded w-fit capitalize"
                  style={{
                    background: fan.role === 'admin' ? '#1a0000' : '#1a1a1a',
                    color: fan.role === 'admin' ? '#CC0000' : '#555',
                    border: `1px solid ${fan.role === 'admin' ? '#CC0000' : '#333'}`,
                  }}
                >
                  {fan.role}
                </span>
                <p className="text-xs" style={{ color: '#555' }}>{timeAgo(fan.created_at)}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleRole(fan)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-white"
                    style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                    title={fan.role === 'admin' ? 'Remove admin' : 'Make admin'}
                  >
                    <Shield size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(fan.id)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-red-400"
                    style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}