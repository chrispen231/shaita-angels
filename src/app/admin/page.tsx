'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Newspaper, Users, Calendar, MessageSquare, Image, UserCircle } from 'lucide-react'

type Stats = {
  news: number
  players: number
  fixtures: number
  comments: number
  gallery: number
  fans: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    news: 0, players: 0, fixtures: 0,
    comments: 0, gallery: 0, fans: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [news, players, fixtures, comments, gallery, fans] = await Promise.all([
        supabase.from('news').select('id', { count: 'exact', head: true }),
        supabase.from('players').select('id', { count: 'exact', head: true }),
        supabase.from('fixtures').select('id', { count: 'exact', head: true }),
        supabase.from('comments').select('id', { count: 'exact', head: true }),
        supabase.from('gallery').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        news: news.count || 0,
        players: players.count || 0,
        fixtures: fixtures.count || 0,
        comments: comments.count || 0,
        gallery: gallery.count || 0,
        fans: fans.count || 0,
      })
      setLoading(false)
    }
    load()
  }, [])

  const cards = [
    { label: 'News Articles', val: stats.news, icon: Newspaper, href: '/admin/news', color: '#CC0000' },
    { label: 'Players', val: stats.players, icon: Users, href: '/admin/players', color: '#1a3a5c' },
    { label: 'Fixtures', val: stats.fixtures, icon: Calendar, href: '/admin/fixtures', color: '#1a3a0a' },
    { label: 'Comments', val: stats.comments, icon: MessageSquare, href: '/admin/comments', color: '#4a0000' },
    { label: 'Gallery Photos', val: stats.gallery, icon: Image, href: '/admin/gallery', color: '#2a2a6a' },
    { label: 'Registered Fans', val: stats.fans, icon: UserCircle, href: '/admin/fans', color: '#555' },
  ]

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
            Admin
          </p>
          <h1 className="text-white font-black text-2xl uppercase tracking-tight">Dashboard</h1>
          <p className="text-xs mt-1" style={{ color: '#555' }}>
            Welcome back. Here&apos;s what&apos;s happening at Shaita Angels FC.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {cards.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl p-5 transition-transform hover:-translate-y-0.5 block"
                style={{ background: '#1a1a1a', border: '1px solid #222' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: `${card.color}33` }}
                  >
                    <Icon size={16} style={{ color: card.color }} />
                  </div>
                  <span
                    className="text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: '#222', color: '#555', fontSize: '9px' }}
                  >
                    MANAGE →
                  </span>
                </div>
                <p
                  className="font-black mb-1"
                  style={{ fontSize: loading ? '24px' : '28px', color: '#fff' }}
                >
                  {loading ? '—' : card.val}
                </p>
                <p className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
                  {card.label}
                </p>
              </Link>
            )
          })}
        </div>

        {/* Quick actions */}
        <div className="mb-8">
          <p className="text-xs font-black tracking-widest uppercase mb-4" style={{ color: '#555' }}>
            Quick Actions
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'New Article', href: '/admin/news', color: '#CC0000' },
              { label: 'Add Player', href: '/admin/players', color: '#1a3a5c' },
              { label: 'Add Fixture', href: '/admin/fixtures', color: '#1a3a0a' },
              { label: 'Upload Photo', href: '/admin/gallery', color: '#2a2a6a' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="rounded-lg px-4 py-3 text-center text-xs font-black tracking-widest uppercase text-white transition-opacity hover:opacity-80"
                style={{ background: action.color }}
              >
                + {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Info banner */}
        <div
          className="rounded-xl p-5"
          style={{ background: '#1a0000', border: '1px solid #CC0000' }}
        >
          <p className="text-white font-black text-sm mb-2">🔴 Admin Tips</p>
          <ul className="flex flex-col gap-1">
            {[
              'Use the sidebar to navigate between sections',
              'All content changes go live immediately',
              'Use the Fan Zone to moderate fan comments',
              'Upload player photos via the Players section',
            ].map((tip, i) => (
              <li key={i} className="text-xs" style={{ color: '#888' }}>
                · {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}