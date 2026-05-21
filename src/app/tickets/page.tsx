'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Calendar, MapPin, Clock, Ticket } from 'lucide-react'

type Match = {
  id: number
  home: string
  away: string
  date: string
  time: string
  venue: string
  competition: string
  tiers: {
    name: string
    price: number
    available: number
    perks: string[]
  }[]
}

const matches: Match[] = [
  {
    id: 1,
    home: 'Shaita Angels FC',
    away: 'Monrovia Queens',
    date: 'May 22, 2025',
    time: '16:00',
    venue: 'Careysburg Stadium',
    competition: 'LFA Premier League',
    tiers: [
      {
        name: 'VIP',
        price: 15.00,
        available: 50,
        perks: ['Premium seating', 'Pre-match reception', 'Match programme', 'Player meet & greet'],
      },
      {
        name: 'Standard',
        price: 5.00,
        available: 300,
        perks: ['General admission', 'Match programme'],
      },
      {
        name: 'Student',
        price: 2.00,
        available: 100,
        perks: ['General admission', 'Valid student ID required'],
      },
    ],
  },
  {
    id: 2,
    home: 'Gbanga Ladies',
    away: 'Shaita Angels FC',
    date: 'Jun 5, 2025',
    time: '15:00',
    venue: 'Gbanga Stadium',
    competition: 'LFA Premier League',
    tiers: [
      {
        name: 'VIP',
        price: 12.00,
        available: 30,
        perks: ['Premium seating', 'Match programme', 'Refreshments'],
      },
      {
        name: 'Standard',
        price: 4.00,
        available: 250,
        perks: ['General admission'],
      },
      {
        name: 'Student',
        price: 2.00,
        available: 80,
        perks: ['General admission', 'Valid student ID required'],
      },
    ],
  },
  {
    id: 3,
    home: 'Shaita Angels FC',
    away: 'Freeport Ladies',
    date: 'Jun 19, 2025',
    time: '16:00',
    venue: 'Careysburg Stadium',
    competition: 'LFA Premier League',
    tiers: [
      {
        name: 'VIP',
        price: 15.00,
        available: 50,
        perks: ['Premium seating', 'Pre-match reception', 'Match programme'],
      },
      {
        name: 'Standard',
        price: 5.00,
        available: 300,
        perks: ['General admission', 'Match programme'],
      },
      {
        name: 'Student',
        price: 2.00,
        available: 100,
        perks: ['General admission', 'Valid student ID required'],
      },
    ],
  },
]

const tierColors: Record<string, { bg: string; border: string; text: string }> = {
  VIP: { bg: '#2a1500', border: '#FFD700', text: '#FFD700' },
  Standard: { bg: '#0a1a0a', border: '#CC0000', text: '#CC0000' },
  Student: { bg: '#0a0a1a', border: '#7eb8f7', text: '#7eb8f7' },
}

export default function TicketsPage() {
  const [selectedMatch, setSelectedMatch] = useState<Match>(matches[0])
  const [selectedTier, setSelectedTier] = useState<string>('')
  const [qty, setQty] = useState(1)
  const [booked, setBooked] = useState(false)

  const tier = selectedMatch.tiers.find(t => t.name === selectedTier)
  const total = tier ? tier.price * qty : 0

  function handleBook() {
    if (!selectedTier) return
    setBooked(true)
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        className="px-6 pt-8 pb-6"
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            Match Day
          </p>
          <h1 className="text-white font-black text-3xl uppercase tracking-tight">
            Get Tickets
          </h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Match selector */}
          <div className="lg:col-span-1">
            <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: '#555' }}>
              Select Match
            </p>
            <div className="flex flex-col gap-3">
              {matches.map(match => (
                <button
                  key={match.id}
                  onClick={() => {
                    setSelectedMatch(match)
                    setSelectedTier('')
                    setQty(1)
                    setBooked(false)
                  }}
                  className="text-left rounded-xl p-4 transition-all"
                  style={{
                    background: selectedMatch.id === match.id ? '#1a0000' : '#0f0f0f',
                    border: selectedMatch.id === match.id ? '1px solid #CC0000' : '1px solid #1a1a1a',
                    cursor: 'pointer',
                  }}
                >
                  <p
                    className="text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: '#CC0000', fontSize: '9px' }}
                  >
                    {match.competition}
                  </p>
                  <p className="text-white font-black text-sm mb-1">
                    {match.home}
                  </p>
                  <p className="text-xs mb-2" style={{ color: '#555' }}>vs {match.away}</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} style={{ color: '#555' }} />
                      <span className="text-xs" style={{ color: '#666' }}>{match.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} style={{ color: '#555' }} />
                      <span className="text-xs" style={{ color: '#666' }}>{match.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} style={{ color: '#555' }} />
                      <span className="text-xs" style={{ color: '#666' }}>{match.venue}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ticket tiers + booking */}
          <div className="lg:col-span-2">

            {/* Match banner */}
            <div
              className="rounded-xl p-5 mb-6"
              style={{ background: 'linear-gradient(135deg, #1a0000, #2a0000)', border: '1px solid #CC0000' }}
            >
              <p
                className="text-xs font-black tracking-widest uppercase mb-2"
                style={{ color: '#CC0000', fontSize: '9px' }}
              >
                {selectedMatch.competition}
              </p>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-white font-black text-lg">{selectedMatch.home}</p>
                  <p className="text-xs" style={{ color: '#555' }}>vs {selectedMatch.away}</p>
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{selectedMatch.date}</p>
                  <p className="text-xs" style={{ color: '#CC0000' }}>{selectedMatch.time}</p>
                  <p className="text-xs mt-1" style={{ color: '#555' }}>{selectedMatch.venue}</p>
                </div>
              </div>
            </div>

            {/* Success state */}
            {booked ? (
              <div
                className="rounded-xl p-8 text-center"
                style={{ background: '#0a1a0a', border: '1px solid #2e7d32' }}
              >
                <div className="text-5xl mb-4">🎉</div>
                <p className="text-white font-black text-xl mb-2 uppercase tracking-tight">
                  Booking Request Sent!
                </p>
                <p className="text-sm mb-6" style={{ color: '#666' }}>
                  Thank you for your interest. Please contact us on Facebook to confirm your{' '}
                  <span style={{ color: '#CC0000' }}>{selectedTier}</span> ticket
                  {qty > 1 ? 's' : ''} for{' '}
                  <span style={{ color: '#fff' }}>{selectedMatch.home} vs {selectedMatch.away}</span>.
                </p>
                <a
                  href="https://web.facebook.com/shaitaangelsfc"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block text-white text-xs font-black tracking-widest px-6 py-3 transition-opacity hover:opacity-80"
                  style={{ background: '#CC0000' }}
                >
                  CONTACT ON FACEBOOK
                </a>
                <button
                  onClick={() => { setBooked(false); setSelectedTier(''); setQty(1) }}
                  className="block mx-auto mt-4 text-xs font-black tracking-widest uppercase transition-colors hover:text-white"
                  style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
                >
                  Book Another Ticket
                </button>
              </div>
            ) : (
              <>
                {/* Tier selection */}
                <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: '#555' }}>
                  Select Ticket Type
                </p>
                <div className="flex flex-col gap-3 mb-6">
                  {selectedMatch.tiers.map(t => {
                    const tc = tierColors[t.name]
                    const isSelected = selectedTier === t.name
                    return (
                      <button
                        key={t.name}
                        onClick={() => setSelectedTier(t.name)}
                        className="text-left rounded-xl p-4 transition-all"
                        style={{
                          background: isSelected ? tc.bg : '#0f0f0f',
                          border: isSelected ? `1px solid ${tc.border}` : '1px solid #1a1a1a',
                          cursor: 'pointer',
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                              style={{ background: isSelected ? tc.border : '#1a1a1a' }}
                            >
                              <Ticket size={14} style={{ color: isSelected ? '#000' : '#555' }} />
                            </div>
                            <div>
                              <p
                                className="font-black text-sm tracking-widest"
                                style={{ color: isSelected ? tc.text : '#fff' }}
                              >
                                {t.name}
                              </p>
                              <p className="text-xs" style={{ color: '#555' }}>
                                {t.available} tickets left
                              </p>
                            </div>
                          </div>
                          <p
                            className="font-black text-lg"
                            style={{ color: isSelected ? tc.text : '#CC0000' }}
                          >
                            ${t.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2 pl-11">
                          {t.perks.map((perk, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ background: '#1a1a1a', color: '#666', fontSize: '10px' }}
                            >
                              {perk}
                            </span>
                          ))}
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Quantity + checkout */}
                {selectedTier && (
                  <div
                    className="rounded-xl p-5"
                    style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-white font-black text-sm">Quantity</p>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQty(q => Math.max(1, q - 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
                          style={{ background: '#1a1a1a', border: 'none', cursor: 'pointer' }}
                        >
                          –
                        </button>
                        <span className="text-white font-black text-lg w-6 text-center">{qty}</span>
                        <button
                          onClick={() => setQty(q => Math.min(10, q + 1))}
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white"
                          style={{ background: '#1a1a1a', border: 'none', cursor: 'pointer' }}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div
                      className="flex items-center justify-between py-3 mb-4"
                      style={{ borderTop: '1px solid #1a1a1a', borderBottom: '1px solid #1a1a1a' }}
                    >
                      <p className="text-white font-black text-sm">Total</p>
                      <p className="font-black text-2xl" style={{ color: '#CC0000' }}>
                        ${total.toFixed(2)}
                      </p>
                    </div>

                    <button
                      onClick={handleBook}
                      className="w-full text-white font-black tracking-widest uppercase text-xs py-3 transition-opacity hover:opacity-80"
                      style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
                    >
                      BOOK NOW — {qty} × {selectedTier} TICKET{qty > 1 ? 'S' : ''}
                    </button>
                    <p className="text-center text-xs mt-3" style={{ color: '#444' }}>
                      Payment via mobile money or cash at the gate
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}