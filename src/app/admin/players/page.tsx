'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

type Player = {
  id: string
  name: string
  position: string
  shirt_number: number
  bio: string
  photo_url: string
  appearances: number
  goals: number
  assists: number
  clean_sheets: number
  is_captain: boolean
  is_active: boolean
}

const positions = ['GK', 'DEF', 'MID', 'FWD']

const posColors: Record<string, string> = {
  GK: '#CC0000', DEF: '#7eb8f7', MID: '#7ecf7e', FWD: '#ff6666',
}

const emptyPlayer = {
  name: '', position: 'GK', shirt_number: 0,
  bio: '', photo_url: '', appearances: 0,
  goals: 0, assists: 0, clean_sheets: 0,
  is_captain: false, is_active: true,
}

export default function AdminPlayersPage() {
  const supabase = createClient()
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Player | null>(null)
  const [form, setForm] = useState(emptyPlayer)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('players')
      .select('*')
      .order('shirt_number', { ascending: true })
    setPlayers(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyPlayer)
    setShowForm(true)
    setError('')
  }

  function openEdit(p: Player) {
    setEditing(p)
    setForm({
      name: p.name, position: p.position,
      shirt_number: p.shirt_number, bio: p.bio || '',
      photo_url: p.photo_url || '', appearances: p.appearances,
      goals: p.goals, assists: p.assists,
      clean_sheets: p.clean_sheets, is_captain: p.is_captain,
      is_active: p.is_active,
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Player name is required.'); return }
    setSaving(true)

    if (editing) {
      const { error: e } = await supabase
        .from('players').update(form).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('players').insert(form)
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this player?')) return
    await supabase.from('players').delete().eq('id', id)
    load()
  }

  const grouped = positions.reduce((acc, pos) => {
    acc[pos] = players.filter(p => p.position === pos)
    return acc
  }, {} as Record<string, Player[]>)

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Players</h1>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Add Player
          </button>
        </div>

        {loading ? (
          <p className="text-xs font-black tracking-widest uppercase text-center py-12" style={{ color: '#444' }}>
            Loading...
          </p>
        ) : players.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: '#1a1a1a', border: '1px solid #222' }}
          >
            <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#444' }}>
              No players yet
            </p>
            <button
              onClick={openNew}
              className="text-white text-xs font-black tracking-widest uppercase px-4 py-2"
              style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
            >
              + Add First Player
            </button>
          </div>
        ) : (
          positions.map(pos => grouped[pos].length > 0 && (
            <div key={pos} className="mb-8">
              <p
                className="text-xs font-black tracking-widest uppercase mb-3 flex items-center gap-2"
                style={{ color: posColors[pos] }}
              >
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ background: posColors[pos] }}
                />
                {pos === 'GK' ? 'Goalkeepers' : pos === 'DEF' ? 'Defenders' : pos === 'MID' ? 'Midfielders' : 'Forwards'}
              </p>
              <div
                className="rounded-xl overflow-hidden"
                style={{ background: '#1a1a1a', border: '1px solid #222' }}
              >
                {grouped[pos].map((player, i) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-4 px-5 py-3"
                    style={{ borderBottom: i < grouped[pos].length - 1 ? '1px solid #222' : 'none' }}
                  >
                    {/* Number */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{ background: '#222', color: posColors[pos] }}
                    >
                      {player.shirt_number}
                    </div>

                    {/* Name + captain */}
                    <div className="flex-1">
                      <p className="text-white font-black text-sm">
                        {player.name}
                        {player.is_captain && (
                          <span
                            className="ml-2 text-xs font-black px-1.5 py-0.5 rounded"
                            style={{ background: '#FFD700', color: '#000', fontSize: '8px' }}
                          >
                            C
                          </span>
                        )}
                        {!player.is_active && (
                          <span
                            className="ml-2 text-xs font-black px-1.5 py-0.5 rounded"
                            style={{ background: '#333', color: '#888', fontSize: '8px' }}
                          >
                            INACTIVE
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex gap-4">
                      {[
                        { label: 'Apps', val: player.appearances },
                        { label: 'Goals', val: player.goals },
                        { label: player.position === 'GK' ? 'Clean' : 'Assists', val: player.position === 'GK' ? player.clean_sheets : player.assists },
                      ].map(s => (
                        <div key={s.label} className="text-center">
                          <p className="font-black text-sm" style={{ color: posColors[player.position] }}>{s.val}</p>
                          <p className="text-xs" style={{ color: '#555', fontSize: '9px' }}>{s.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(player)}
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-white"
                        style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDelete(player.id)}
                        className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-red-400"
                        style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Player form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.9)' }}
        >
          <div
            className="relative w-full max-w-lg my-8 rounded-xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <p className="text-white font-black text-sm uppercase tracking-widest">
                {editing ? 'Edit Player' : 'Add Player'}
              </p>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {error && (
                <div
                  className="px-4 py-3 rounded text-xs font-bold"
                  style={{ background: '#1a0000', border: '1px solid #CC0000', color: '#ff6666' }}
                >
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Player name"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Position
                  </label>
                  <select
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  >
                    {positions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Shirt Number
                  </label>
                  <input
                    type="number"
                    value={form.shirt_number}
                    onChange={e => setForm(f => ({ ...f, shirt_number: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Appearances
                  </label>
                  <input
                    type="number"
                    value={form.appearances}
                    onChange={e => setForm(f => ({ ...f, appearances: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Goals
                  </label>
                  <input
                    type="number"
                    value={form.goals}
                    onChange={e => setForm(f => ({ ...f, goals: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Assists
                  </label>
                  <input
                    type="number"
                    value={form.assists}
                    onChange={e => setForm(f => ({ ...f, assists: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Clean Sheets
                  </label>
                  <input
                    type="number"
                    value={form.clean_sheets}
                    onChange={e => setForm(f => ({ ...f, clean_sheets: parseInt(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Photo URL
                  </label>
                  <input
                    type="text"
                    value={form.photo_url}
                    onChange={e => setForm(f => ({ ...f, photo_url: e.target.value }))}
                    placeholder="https://... or /players/name.jpg"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Bio
                  </label>
                  <textarea
                    value={form.bio}
                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                    placeholder="Short player bio..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none resize-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                {[
                  { label: 'Captain', key: 'is_captain' },
                  { label: 'Active', key: 'is_active' },
                ].map(toggle => (
                  <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, [toggle.key]: !f[toggle.key as keyof typeof f] }))}
                      className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                      style={{ background: form[toggle.key as keyof typeof form] ? '#CC0000' : '#333' }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{ left: form[toggle.key as keyof typeof form] ? '22px' : '2px' }}
                      />
                    </div>
                    <span className="text-xs font-black tracking-widest uppercase" style={{ color: '#666' }}>
                      {toggle.label}
                    </span>
                  </label>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80"
                  style={{ background: saving ? '#555' : '#CC0000', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Player'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase"
                  style={{ background: '#1a1a1a', border: '1px solid #222', color: '#555', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}