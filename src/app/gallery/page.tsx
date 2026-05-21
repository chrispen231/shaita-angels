'use client'

import { useState } from 'react'

type Category = 'ALL' | 'Match Day' | 'Training' | 'Trophy' | 'Squad' | 'Away'

const photos = [
  { id: 1, src: '/news-featured.jpg', label: 'LFA Super Cup 2024/25', category: 'Trophy' },
  { id: 2, src: '/gallery-3.jpg', label: 'Match Day Squad', category: 'Squad' },
  { id: 3, src: '/gallery-2.jpg', label: 'Training Session', category: 'Training' },
  { id: 4, src: '/news-featured.jpg', label: 'Trophy Lift', category: 'Trophy' },
  { id: 5, src: '/gallery-1.jpg', label: 'Pre-Match Warmup', category: 'Match Day' },
  { id: 6, src: '/gallery-2.jpg', label: 'Ball Control Drills', category: 'Training' },
  { id: 7, src: '/gallery-3.jpg', label: 'Team Photo 2024', category: 'Squad' },
  { id: 8, src: '/news-featured.jpg', label: 'FA Cup Final 2024', category: 'Trophy' },
  { id: 9, src: '/gallery-1.jpg', label: 'Away Day — Gbanga', category: 'Away' },
  { id: 10, src: '/gallery-2.jpg', label: 'Pre-Season Camp', category: 'Training' },
  { id: 11, src: '/gallery-3.jpg', label: 'Match Day Action', category: 'Match Day' },
  { id: 12, src: '/news-featured.jpg', label: 'Super Cup Celebrations', category: 'Trophy' },
]

const categories: Category[] = ['ALL', 'Match Day', 'Training', 'Trophy', 'Squad', 'Away']

const fallbackColors: Record<number, string> = {
  1: '#CC0000', 2: '#1a1a1a', 3: '#880000',
  4: '#CC0000', 5: '#1a1a1a', 6: '#550000',
  7: '#222', 8: '#CC0000', 9: '#1a1a1a',
  10: '#333', 11: '#880000', 12: '#CC0000',
}

export default function GalleryPage() {
  const [active, setActive] = useState<Category>('ALL')
  const [selected, setSelected] = useState<typeof photos[0] | null>(null)

  const filtered = active === 'ALL' ? photos : photos.filter(p => p.category === active)

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        className="px-6 pt-8 pb-0"
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            Photos
          </p>
          <h1 className="text-white font-black text-3xl uppercase tracking-tight mb-6">
            Gallery
          </h1>

          {/* Category tabs */}
          <div className="flex gap-0 overflow-x-auto" style={{ borderBottom: '1px solid #222' }}>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className="text-xs font-black tracking-widest uppercase px-4 py-3 whitespace-nowrap transition-colors flex-shrink-0"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: active === cat ? '2px solid #CC0000' : '2px solid transparent',
                  color: active === cat ? '#fff' : '#555',
                  cursor: 'pointer',
                  marginBottom: '-1px',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map(photo => (
            <div
              key={photo.id}
              className="relative rounded-lg overflow-hidden cursor-pointer group"
              style={{ aspectRatio: '4 / 3', background: fallbackColors[photo.id] }}
              onClick={() => setSelected(photo)}
            >
              <img
                src={photo.src}
                alt={photo.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              {/* Overlay */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 60%)' }}
              >
                <p className="text-white text-xs font-bold p-3">{photo.label}</p>
              </div>
              {/* Category badge */}
              <div
                className="absolute top-2 left-2 text-white text-xs font-black px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: '#CC0000', fontSize: '9px' }}
              >
                {photo.category.toUpperCase()}
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-black text-2xl mb-2" style={{ color: '#222' }}>No photos yet</p>
            <p className="text-xs tracking-widest" style={{ color: '#444' }}>
              Check back soon
            </p>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-4xl w-full rounded-xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selected.src}
              alt={selected.label}
              className="w-full object-contain"
              style={{ maxHeight: '80vh' }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
            {/* Fallback */}
            <div
              className="absolute inset-0 -z-10 flex items-center justify-center"
              style={{ background: fallbackColors[selected.id] }}
            >
              <span className="font-black text-6xl" style={{ color: 'rgba(255,255,255,0.1)' }}>SA</span>
            </div>
            {/* Caption */}
            <div
              className="absolute bottom-0 left-0 right-0 p-4"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)' }}
            >
              <p className="text-white font-black text-sm">{selected.label}</p>
              <p className="text-xs mt-1" style={{ color: '#888' }}>{selected.category}</p>
            </div>
            {/* Close button */}
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm transition-opacity hover:opacity-80"
              style={{ background: '#CC0000' }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}