'use client'

import Image from 'next/image'
import Link from 'next/link'
import Ticker from '@/components/layout/Ticker'

export default function HomePage() {
  return (
    <div style={{ background: '#0a0a0a' }}>

      {/* HERO */}
      <section className="relative w-full overflow-hidden" style={{ height: '520px' }}>
        {/* Background image — replace /hero.jpg with your actual squad photo in /public */}
        <div className="absolute inset-0 bg-gray-900">
          <img
            src="/hero.jpg"
            alt="Shaita Angels FC"
            className="w-full h-full object-cover object-center"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        </div>

        {/* Gradient overlays */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(10,10,10,0) 20%, rgba(10,10,10,0.6) 60%, rgba(10,10,10,0.97) 100%)' }} />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, rgba(10,10,10,0.6) 0%, transparent 60%)' }} />

        {/* Content pinned bottom-left */}
        <div className="absolute bottom-0 left-0 right-0 px-6 pb-10 max-w-7xl mx-auto">
          <div
            className="inline-block text-white text-xs font-black px-3 py-1 mb-4 tracking-widest"
            style={{ background: '#CC0000' }}>
            LIBERIA WOMEN&apos;S PREMIER LEAGUE
          </div>
          <h1
            className="text-white font-black leading-none tracking-tight uppercase mb-3"
            style={{ fontSize: 'clamp(36px, 6vw, 72px)' }}>
            Rise of the<br />
            <span style={{ color: '#CC0000' }}>Angels.</span>
          </h1>
          <p className="text-sm mb-6 max-w-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
            LFA Super Cup Champions 2024/25 · Careysburg, Liberia · Est. 2019
          </p>
          <div className="flex gap-3">
            <Link href="/players"
              className="text-white text-xs font-black tracking-widest px-6 py-3 transition-opacity hover:opacity-90"
              style={{ background: '#CC0000' }}>
              VIEW SQUAD
            </Link>
            <Link href="/about"
              className="text-white text-xs font-black tracking-widest px-6 py-3 border transition-colors hover:bg-white hover:text-black"
              style={{ borderColor: 'rgba(255,255,255,0.3)' }}>
              OUR STORY
            </Link>
          </div>
        </div>
      </section>

      {/* TICKER */}
      <Ticker />

      {/* STATS STRIP */}
      <section style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-4">
          {[
            { num: '20+', label: 'Players' },
            { num: '2', label: 'Trophies' },
            { num: '2019', label: 'Founded' },
            { num: '2nd', label: 'League 23/24' },
          ].map((s, i) => (
            <div key={i}
              className="text-center py-6 px-4"
              style={{ borderRight: i < 3 ? '1px solid #1e1e1e' : 'none' }}>
              <div className="font-black text-white mb-1" style={{ fontSize: '28px' }}>
                {s.num.replace(/(\d+)(.*)/,
                  (_, n, suffix) => n).toString()}
                <span style={{ color: '#CC0000' }}>
                  {s.num.replace(/^[\d]+/, '')}
                </span>
              </div>
              <div className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NEWS EDITORIAL GRID */}
      <section style={{ background: '#0f0f0f' }} className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
                Latest
              </p>
              <h2 className="text-white font-black text-xl uppercase tracking-tight">
                News &amp; Updates
              </h2>
            </div>
            <Link href="/news"
              className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
              style={{ color: '#555', borderBottom: '1px solid #333', paddingBottom: '2px' }}>
              All News →
            </Link>
          </div>

          {/* Featured card */}
          <Link href="/news" className="block relative rounded-lg overflow-hidden mb-4 cursor-pointer group"
            style={{ height: '320px' }}>
            <img
              src="/news-featured.jpg"
              alt="Super Cup"
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
              onError={(e) => { (e.target as HTMLImageElement).src = '' }}
            />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.1) 60%)' }} />
            {/* Fallback background */}
            <div className="absolute inset-0 -z-10" style={{ background: '#CC0000' }} />
            <div className="absolute bottom-0 left-0 p-5">
              <div className="inline-block text-white text-xs font-black px-2 py-1 mb-2 tracking-widest"
                style={{ background: '#CC0000' }}>
                MATCH REPORT
              </div>
              <h3 className="text-white font-black text-xl leading-tight max-w-sm">
                Angels claim LFA Super Cup glory in stunning fashion
              </h3>
              <p className="text-xs mt-2" style={{ color: '#888' }}>May 10, 2025 · 5 min read</p>
            </div>
          </Link>

          {/* Two smaller cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/news"
              className="rounded-md overflow-hidden cursor-pointer group block"
              style={{ background: '#1a1a1a' }}>
              <div className="relative h-32 overflow-hidden">
                <img
                  src="/news-2.jpg"
                  alt="Training"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }} />
              </div>
              <div className="p-3">
                <p className="text-xs font-black tracking-widest mb-1" style={{ color: '#CC0000' }}>TRANSFER</p>
                <p className="text-white text-xs font-bold leading-snug">
                  Three new signings confirmed ahead of new season
                </p>
                <p className="text-xs mt-2" style={{ color: '#555' }}>Apr 28, 2025</p>
              </div>
            </Link>

            <Link href="/news"
              className="rounded-md overflow-hidden cursor-pointer group block"
              style={{ background: '#1a1a1a' }}>
              <div className="relative h-32 overflow-hidden flex items-center justify-center"
                style={{ background: '#1e1e1e' }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm"
                  style={{ background: '#CC0000', color: '#fff', opacity: 0.5 }}>
                  SA
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-black tracking-widest mb-1" style={{ color: '#CC0000' }}>NATIONAL TEAM</p>
                <p className="text-white text-xs font-bold leading-snug">
                  Club statement on U-20 player welfare dispute
                </p>
                <p className="text-xs mt-2" style={{ color: '#555' }}>Apr 15, 2025</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* NEXT MATCH BANNER */}
      <section style={{ background: '#CC0000' }} className="px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: 'rgba(255,255,255,0.6)' }}>
              Next Match · May 22, 2025
            </p>
            <p className="text-white font-black tracking-wide text-sm">
              SHAITA ANGELS{' '}
              <span className="font-normal text-xs mx-2" style={{ color: 'rgba(255,255,255,0.5)' }}>vs</span>
              MONROVIA QUEENS
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>
              LFA Premier League · Careysburg Stadium
            </p>
          </div>
          <Link href="/tickets"
            className="text-xs font-black tracking-widest uppercase px-4 py-2 whitespace-nowrap transition-opacity hover:opacity-90"
            style={{ background: '#fff', color: '#CC0000' }}>
            GET TICKETS
          </Link>
        </div>
      </section>

      {/* SQUAD PREVIEW */}
      <section style={{ background: '#0f0f0f' }} className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
                2024/25 Season
              </p>
              <h2 className="text-white font-black text-xl uppercase tracking-tight">
                The Squad
              </h2>
            </div>
            <Link href="/players"
              className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
              style={{ color: '#555', borderBottom: '1px solid #333', paddingBottom: '2px' }}>
              Full Squad →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { name: 'Fatu Kollie', pos: 'GK', num: 1, color: '#CC0000' },
              { name: 'Tenneh Sayeh', pos: 'MID', num: 10, color: '#2a6a2a', captain: true },
              { name: 'Musu Karnga', pos: 'FWD', num: 9, color: '#4a0000' },
              { name: 'Yeatta Boakai', pos: 'DEF', num: 2, color: '#1a3a5c' },
            ].map((p) => (
              <Link href="/players" key={p.num}
                className="rounded-lg overflow-hidden cursor-pointer group block transition-transform hover:-translate-y-1"
                style={{ background: '#1a1a1a' }}>
                <div className="relative h-40 flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, #1a1a1a, ${p.color}44)` }}>
                  <span className="absolute text-6xl font-black opacity-10" style={{ color: '#fff' }}>
                    {p.num}
                  </span>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center font-black text-sm z-10"
                    style={{ background: p.color, color: '#fff', border: `2px solid ${p.color}99` }}>
                    {p.pos}
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs font-black tracking-widest mb-1"
                    style={{ color: p.color === '#CC0000' ? '#CC0000' : p.color === '#4a0000' ? '#ff6666' : p.color === '#2a6a2a' ? '#7ecf7e' : '#7eb8f7' }}>
                    {p.pos}{p.captain ? ' · CAPTAIN' : ''}
                  </p>
                  <p className="text-white text-sm font-black">{p.name}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* GALLERY PREVIEW */}
      <section style={{ background: '#0a0a0a' }} className="px-6 py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>
                Photos
              </p>
              <h2 className="text-white font-black text-xl uppercase tracking-tight">Gallery</h2>
            </div>
            <Link href="/gallery"
              className="text-xs font-semibold tracking-widest uppercase transition-colors hover:text-white"
              style={{ color: '#555', borderBottom: '1px solid #333', paddingBottom: '2px' }}>
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { src: '/gallery-1.jpg', label: 'Super Cup 2025' },
              { src: '/gallery-2.jpg', label: 'Match Day' },
              { src: '/gallery-3.jpg', label: 'The Squad' },
            ].map((img, i) => (
              <Link href="/gallery" key={i}
                className="relative rounded-lg overflow-hidden group cursor-pointer block"
                style={{ aspectRatio: '4/3', background: i === 0 ? '#CC0000' : i === 1 ? '#880000' : '#1a1a1a' }}>
                <img
                  src={img.src}
                  alt={img.label}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)' }} />
                <p className="absolute bottom-2 left-3 text-white text-xs font-bold">{img.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SPONSORS STRIP */}
      <section style={{ background: '#0f0f0f', borderTop: '1px solid #1a1a1a' }} className="px-6 py-8">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-xs font-black tracking-widest uppercase mb-6" style={{ color: '#333' }}>
            Our Partners
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {['Partner One', 'Partner Two', 'Partner Three', 'Partner Four'].map((s, i) => (
              <div key={i}
                className="text-xs font-black tracking-widest uppercase px-4 py-2 rounded"
                style={{ color: '#333', border: '1px solid #222' }}>
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  )
}