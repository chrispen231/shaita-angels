'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

type Fixture = {
  id: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  match_date: string
  venue: string
  competition: string
  status: string
}

const competitions = [
  'LFA Premier League', 'LFA FA Cup', 'LFA Super Cup', 'Friendly',
]

const emptyFixture = {
  home_team: 'Shaita Angels FC',
  away_team: '',
  home_score: '',
  away_score: '',
  match_date: '',
  venue: 'Careysburg Stadium',
  competition: 'LFA Premier League',
  status: 'upcoming',
}

const statusColors: Record<string, { bg: string; color: string }> = {
  upcoming: { bg: '#0a0a1a', color: '#7eb8f7' },
  live: { bg: '#0a1a0a', color: '#7ecf7e' },
  completed: { bg: '#1a1a1a', color: '#555' },
}

export default function AdminFixturesPage() {
  const supabase = createClient()
  const [fixtures, setFixtures] = useState<Fixture[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Fixture | null>(null)
  const [form, setForm] = useState(emptyFixture)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('fixtures')
      .select('*')
      .order('match_date', { ascending: false })
    setFixtures(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyFixture)
    setShowForm(true)
    setError('')
  }

  function openEdit(f: Fixture) {
    setEditing(f)
    setForm({
      home_team: f.home_team,
      away_team: f.away_team,
      home_score: f.home_score?.toString() || '',
      away_score: f.away_score?.toString() || '',
      match_date: f.match_date ? f.match_date.slice(0, 16) : '',
      venue: f.venue || '',
      competition: f.competition,
      status: f.status,
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.away_team.trim()) { setError('Away team is required.'); return }
    if (!form.match_date) { setError('Match date is required.'); return }
    setSaving(true)

    const payload = {
      home_team: form.home_team,
      away_team: form.away_team,
      home_score: form.home_score !== '' ? parseInt(form.home_score as string) : null,
      away_score: form.away_score !== '' ? parseInt(form.away_score as string) : null,
      match_date: form.match_date,
      venue: form.venue,
      competition: form.competition,
      status: form.status,
    }

    if (editing) {
      const { error: e } = await supabase.from('fixtures').update(payload).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('fixtures').insert(payload)
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this fixture?')) return
    await supabase.from('fixtures').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Fixtures</h1>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Add Fixture
          </button>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid #222' }}
        >
          <div
            className="grid px-5 py-3"
            style={{ gridTemplateColumns: '1fr 1fr 120px 100px 90px', borderBottom: '1px solid #222' }}
          >
            {['Home', 'Away', 'Date', 'Status', 'Actions'].map(h => (
              <p key={h} className="text-xs font-black tracking-widest uppercase" style={{ color: '#555' }}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>Loading...</p>
            </div>
          ) : fixtures.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                No fixtures yet.
              </p>
            </div>
          ) : (
            fixtures.map((fixture, i) => {
              const sc = statusColors[fixture.status]
              return (
                <div
                  key={fixture.id}
                  className="grid px-5 py-4 items-center"
                  style={{
                    gridTemplateColumns: '1fr 1fr 120px 100px 90px',
                    borderBottom: i < fixtures.length - 1 ? '1px solid #222' : 'none',
                  }}
                >
                  <div>
                    <p className="text-white font-black text-sm">{fixture.home_team}</p>
                    {fixture.home_score !== null && (
                      <p className="text-xs font-black" style={{ color: '#CC0000' }}>{fixture.home_score}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">{fixture.away_team}</p>
                    {fixture.away_score !== null && (
                      <p className="text-xs font-black" style={{ color: '#CC0000' }}>{fixture.away_score}</p>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#888' }}>
                    {new Date(fixture.match_date).toLocaleDateString()}
                  </p>
                  <span
                    className="text-xs font-black px-2 py-1 rounded w-fit capitalize"
                    style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.color}44` }}
                  >
                    {fixture.status}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(fixture)}
                      className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-white"
                      style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(fixture.id)}
                      className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-red-400"
                      style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Fixture form modal */}
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
                {editing ? 'Edit Fixture' : 'Add Fixture'}
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

              {[
                { label: 'Home Team', key: 'home_team', placeholder: 'Shaita Angels FC' },
                { label: 'Away Team *', key: 'away_team', placeholder: 'Opponent name' },
                { label: 'Venue', key: 'venue', placeholder: 'Stadium name' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Home Score
                  </label>
                  <input
                    type="number"
                    value={form.home_score}
                    onChange={e => setForm(f => ({ ...f, home_score: e.target.value }))}
                    placeholder="—"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Away Score
                  </label>
                  <input
                    type="number"
                    value={form.away_score}
                    onChange={e => setForm(f => ({ ...f, away_score: e.target.value }))}
                    placeholder="—"
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Match Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={form.match_date}
                  onChange={e => setForm(f => ({ ...f, match_date: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Competition
                </label>
                <select
                  value={form.competition}
                  onChange={e => setForm(f => ({ ...f, competition: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                >
                  {competitions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                >
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80"
                  style={{ background: saving ? '#555' : '#CC0000', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Fixture'}
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