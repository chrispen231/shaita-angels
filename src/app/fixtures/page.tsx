'use client'

import { useState } from 'react'

type Filter = 'ALL' | 'UPCOMING' | 'RESULTS'

const fixtures = [
  {
    id: 1,
    home: 'Shaita Angels',
    away: 'Monrovia Queens',
    homeScore: null,
    awayScore: null,
    date: 'May 22, 2025',
    time: '16:00',
    venue: 'Careysburg Stadium',
    competition: 'LFA Premier League',
    status: 'upcoming',
  },
  {
    id: 2,
    home: 'Gbanga Ladies',
    away: 'Shaita Angels',
    homeScore: null,
    awayScore: null,
    date: 'Jun 5, 2025',
    time: '15:00',
    venue: 'Gbanga Stadium',
    competition: 'LFA Premier League',
    status: 'upcoming',
  },
  {
    id: 3,
    home: 'Shaita Angels',
    away: 'Freeport Ladies',
    homeScore: null,
    awayScore: null,
    date: 'Jun 19, 2025',
    time: '16:00',
    venue: 'Careysburg Stadium',
    competition: 'LFA Premier League',
    status: 'upcoming',
  },
  {
    id: 4,
    home: 'Shaita Angels',
    away: 'World Girls FC',
    homeScore: 3,
    awayScore: 1,
    date: 'May 10, 2025',
    time: '',
    venue: 'Careysburg Stadium',
    competition: 'LFA Super Cup',
    status: 'completed',
  },
  {
    id: 5,
    home: 'Monrovia Queens',
    away: 'Shaita Angels',
    homeScore: 1,
    awayScore: 1,
    date: 'Apr 28, 2025',
    time: '',
    venue: 'Antoinette Tubman Stadium',
    competition: 'LFA Premier League',
    status: 'completed',
  },
  {
    id: 6,
    home: 'Shaita Angels',
    away: 'Gbanga Ladies',
    homeScore: 2,
    awayScore: 0,
    date: 'Apr 15, 2025',
    time: '',
    venue: 'Careysburg Stadium',
    competition: 'LFA Premier League',
    status: 'completed',
  },
  {
    id: 7,
    home: 'Freeport Ladies',
    away: 'Shaita Angels',
    homeScore: 0,
    awayScore: 2,
    date: 'Apr 2, 2025',
    time: '',
    venue: 'Freeport Stadium',
    competition: 'LFA Premier League',
    status: 'completed',
  },
  {
    id: 8,
    home: 'Shaita Angels',
    away: 'Monrovia Queens',
    homeScore: 1,
    awayScore: 2,
    date: 'Mar 18, 2025',
    time: '',
    venue: 'Careysburg Stadium',
    competition: 'LFA FA Cup',
    status: 'completed',
  },
]

const tabs: Filter[] = ['ALL', 'UPCOMING', 'RESULTS']

function getResult(fixture: typeof fixtures[0]) {
  if (fixture.status !== 'completed') return null
  const isSafc = fixture.home === 'Shaita Angels'
  const saScore = isSafc ? fixture.homeScore! : fixture.awayScore!
  const oppScore = isSafc ? fixture.awayScore! : fixture.homeScore!
  if (saScore > oppScore) return 'W'
  if (saScore < oppScore) return 'L'
  return 'D'
}

const resultStyle: Record<string, { bg: string; color: string }> = {
  W: { bg: '#e8f5e9', color: '#2e7d32' },
  D: { bg: '#fff8e1', color: '#f57f17' },
  L: { bg: '#ffebee', color: '#c62828' },
}

export default function FixturesPage() {
  const [active, setActive] = useState<Filter>('ALL')

  const filtered = fixtures.filter(f => {
    if (active === 'UPCOMING') return f.status === 'upcoming'
    if (active === 'RESULTS') return f.status === 'completed'
    return true
  })

  const upcoming = fixtures.filter(f => f.status === 'upcoming')[0]

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }} className="px-6 pt-8 pb-0">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            2024/25 Season
          </p>
          <h1 className="text-white font-black text-3xl uppercase tracking-tight mb-6">
            Fixtures &amp; Results
          </h1>

          {/* Filter tabs */}
          <div className="flex gap-0" style={{ borderBottom: '1px solid #222' }}>
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActive(tab)}
                className="text-xs font-black tracking-widest uppercase px-5 py-3 transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active === tab ? '2px solid #CC0000' : '2px solid transparent',
                  color: active === tab ? '#fff' : '#555',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Next match highlight */}
        {upcoming && (active === 'ALL' || active === 'UPCOMING') && (
          <div
            className="rounded-xl p-5 mb-8"
            style={{ background: 'linear-gradient(135deg, #1a0000, #2a0000)', border: '1px solid #CC0000' }}
          >
            <p className="text-xs font-black tracking-widest uppercase mb-3"
              style={{ color: '#CC0000' }}>
              ⚡ Next Match
            </p>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-white font-black text-base">{upcoming.home}</p>
                  <p className="text-xs tracking-widest" style={{ color: '#555' }}>HOME</p>
                </div>
                <div className="text-center px-4">
                  <p className="font-black text-xl" style={{ color: '#CC0000' }}>VS</p>
                  <p className="text-xs tracking-widest mt-1" style={{ color: '#555' }}>
                    {upcoming.date}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-white font-black text-base">{upcoming.away}</p>
                  <p className="text-xs tracking-widest" style={{ color: '#555' }}>AWAY</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-xs font-bold">{upcoming.venue}</p>
                <p className="text-xs mt-1" style={{ color: '#555' }}>{upcoming.competition}</p>
                <p className="text-xs mt-1 font-black" style={{ color: '#CC0000' }}>
                  {upcoming.time}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Fixtures list */}
        <div className="flex flex-col gap-3">
          {filtered.map(fixture => {
            const result = getResult(fixture)
            const rs = result ? resultStyle[result] : null

            return (
              <div
                key={fixture.id}
                className="rounded-xl px-5 py-4 flex items-center gap-4 flex-wrap"
                style={{ background: '#111', border: '1px solid #1e1e1e' }}
              >
                {/* Date */}
                <div className="text-center flex-shrink-0" style={{ minWidth: '64px' }}>
                  <p className="text-white text-xs font-bold">{fixture.date.split(',')[0]}</p>
                  <p className="text-xs" style={{ color: '#555' }}>
                    {fixture.date.split(' ')[2] || fixture.date.split(',')[1]?.trim()}
                  </p>
                </div>

                {/* Competition badge */}
                <div
                  className="text-xs font-black tracking-widest px-2 py-1 rounded flex-shrink-0"
                  style={{ background: '#1a1a1a', color: '#555', fontSize: '9px' }}
                >
                  {fixture.competition}
                </div>

                {/* Teams */}
                <div className="flex items-center gap-3 flex-1 justify-center">
                  <p className="text-white font-black text-sm text-right flex-1">{fixture.home}</p>

                  {fixture.status === 'completed' ? (
                    <div
                      className="font-black text-base px-3 py-1 rounded text-center flex-shrink-0"
                      style={{ background: '#1a1a1a', color: '#fff', minWidth: '60px' }}
                    >
                      {fixture.homeScore} – {fixture.awayScore}
                    </div>
                  ) : (
                    <div
                      className="font-black text-xs px-3 py-1 rounded text-center flex-shrink-0"
                      style={{ background: '#CC0000', color: '#fff', minWidth: '60px' }}
                    >
                      {fixture.time || 'TBD'}
                    </div>
                  )}

                  <p className="text-white font-black text-sm text-left flex-1">{fixture.away}</p>
                </div>

                {/* Result badge */}
                <div className="flex-shrink-0" style={{ minWidth: '36px' }}>
                  {rs ? (
                    <span
                      className="text-xs font-black px-2 py-1 rounded"
                      style={{ background: rs.bg, color: rs.color }}
                    >
                      {result}
                    </span>
                  ) : (
                    <span
                      className="text-xs font-black px-2 py-1 rounded"
                      style={{ background: '#1a1a1a', color: '#555' }}
                    >
                      –
                    </span>
                  )}
                </div>

                {/* Venue */}
                <div className="text-right flex-shrink-0 hidden md:block" style={{ minWidth: '140px' }}>
                  <p className="text-xs font-bold" style={{ color: '#555' }}>{fixture.venue}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Season summary */}
        {(active === 'ALL' || active === 'RESULTS') && (
          <div className="mt-10">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: '#CC0000' }}>
              Season Summary
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Played', val: fixtures.filter(f => f.status === 'completed').length },
                { label: 'Won', val: fixtures.filter(f => getResult(f) === 'W').length },
                { label: 'Drawn', val: fixtures.filter(f => getResult(f) === 'D').length },
                { label: 'Lost', val: fixtures.filter(f => getResult(f) === 'L').length },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-4 text-center" style={{ background: '#111', border: '1px solid #1e1e1e' }}>
                  <p className="font-black text-2xl text-white mb-1">{s.val}</p>
                  <p className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}