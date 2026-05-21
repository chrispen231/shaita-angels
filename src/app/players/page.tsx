'use client'

import { useState } from 'react'
import Link from 'next/link'

type Position = 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'

const players = [
  { name: 'Fatu Kollie', pos: 'GK', num: 1, apps: 12, goals: 0, assists: 0, clean: 8, photo: '/players/fatu.jpg' },
  { name: 'Massa Duo', pos: 'GK', num: 13, apps: 5, goals: 0, assists: 0, clean: 3, photo: '' },
  { name: 'Yeatta Boakai', pos: 'DEF', num: 2, apps: 14, goals: 1, assists: 0, clean: 0, photo: '' },
  { name: 'Korto Sherman', pos: 'DEF', num: 4, apps: 16, goals: 0, assists: 0, clean: 0, photo: '' },
  { name: 'Miatta Flomo', pos: 'DEF', num: 5, apps: 13, goals: 2, assists: 1, clean: 0, photo: '' },
  { name: 'Satta Cooper', pos: 'DEF', num: 6, apps: 11, goals: 0, assists: 2, clean: 0, photo: '' },
  { name: 'Finda Kamara', pos: 'MID', num: 8, apps: 17, goals: 4, assists: 6, clean: 0, photo: '' },
  { name: 'Tenneh Sayeh', pos: 'MID', num: 10, apps: 18, goals: 7, assists: 9, clean: 0, captain: true, photo: '' },
  { name: 'Zoe Mulbah', pos: 'MID', num: 7, apps: 15, goals: 3, assists: 5, clean: 0, photo: '' },
  { name: 'Musu Karnga', pos: 'FWD', num: 9, apps: 16, goals: 11, assists: 5, clean: 0, photo: '' },
  { name: 'Korpo Toe', pos: 'FWD', num: 11, apps: 14, goals: 8, assists: 4, clean: 0, photo: '' },
  { name: 'Bendu Mulbah', pos: 'FWD', num: 17, apps: 10, goals: 5, assists: 3, clean: 0, photo: '' },
]

const posConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
  GK: { bg: '#CC0000', border: '#ff3333', text: '#fff', label: 'GOALKEEPER' },
  DEF: { bg: '#1a3a5c', border: '#2a5a8c', text: '#7eb8f7', label: 'DEFENDER' },
  MID: { bg: '#1a3a0a', border: '#2a6a2a', text: '#7ecf7e', label: 'MIDFIELDER' },
  FWD: { bg: '#4a0000', border: '#880000', text: '#ff6666', label: 'FORWARD' },
}

const tabs: Position[] = ['ALL', 'GK', 'DEF', 'MID', 'FWD']

export default function PlayersPage() {
  const [active, setActive] = useState<Position>('ALL')

  const filtered = active === 'ALL' ? players : players.filter(p => p.pos === active)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }} className="px-6 pt-8 pb-0">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            2024/25 Season
          </p>
          <h1 className="text-white font-black text-3xl uppercase tracking-tight mb-6">The Squad</h1>

          {/* Position filter tabs */}
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

      {/* Squad grid */}
      <div style={{ background: '#0f0f0f' }} className="px-6 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((player) => {
            const cfg = posConfig[player.pos]
            const statLabel = player.pos === 'GK' ? 'CLEAN' : 'ASSISTS'
            const statVal = player.pos === 'GK' ? player.clean : player.assists

            return (
              <div
                key={player.num}
                className="rounded-xl overflow-hidden cursor-pointer transition-transform hover:-translate-y-1"
                style={{ background: '#1a1a1a' }}
              >
                {/* Photo / avatar area */}
                <div
                  className="relative flex items-center justify-center"
                  style={{
                    height: '220px',
                    background: `linear-gradient(135deg, #1a1a1a, ${cfg.bg}44)`,
                  }}
                >
                  {/* Big number watermark */}
                  <span
                    className="absolute font-black"
                    style={{ fontSize: '64px', color: 'rgba(255,255,255,0.05)' }}
                  >
                    {player.num}
                  </span>

                  {/* Photo or avatar */}
                  {player.photo ? (
                    <img
                      src={player.photo}
                      alt={player.name}
                      className="w-full h-full object-cover object-top absolute inset-0"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center font-black text-lg z-10"
                      style={{ background: cfg.bg, color: cfg.text, border: `2px solid ${cfg.border}` }}
                    >
                      {player.pos}
                    </div>
                  )}

                  {/* Shirt number badge */}
                  <div
                    className="absolute top-2 left-2 text-white text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: '#CC0000', fontSize: '10px' }}
                  >
                    #{player.num}
                  </div>

                  {/* Captain badge */}
                  {player.captain && (
                    <div
                      className="absolute top-2 right-2 text-xs font-black px-2 py-0.5 rounded"
                      style={{ background: '#FFD700', color: '#000', fontSize: '9px' }}
                    >
                      CAP
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-xs font-black tracking-widest mb-1" style={{ color: cfg.text }}>
                    {cfg.label}{player.captain ? ' · CAPTAIN' : ''}
                  </p>
                  <p className="text-white font-black text-sm mb-3">{player.name}</p>

                  {/* Stats */}
                  <div
                    className="grid grid-cols-3 gap-1 pt-2"
                    style={{ borderTop: '1px solid #2a2a2a' }}
                  >
                    <div className="text-center">
                      <p className="font-black text-sm" style={{ color: cfg.text }}>{player.apps}</p>
                      <p className="text-xs tracking-widest" style={{ color: '#555', fontSize: '8px' }}>APPS</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-sm" style={{ color: cfg.text }}>{player.goals}</p>
                      <p className="text-xs tracking-widest" style={{ color: '#555', fontSize: '8px' }}>GOALS</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-sm" style={{ color: cfg.text }}>{statVal}</p>
                      <p className="text-xs tracking-widest" style={{ color: '#555', fontSize: '8px' }}>{statLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}