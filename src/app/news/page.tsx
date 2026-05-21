'use client'

import { useState } from 'react'
import Link from 'next/link'

type Category = 'ALL' | 'Match Report' | 'Transfer' | 'Training' | 'National Team' | 'Club News'

const articles = [
  {
    id: 1,
    slug: 'angels-claim-super-cup-glory',
    title: 'Angels claim LFA Super Cup glory in stunning fashion',
    excerpt: 'Shaita Angels FC defeated World Girls FC 3-1 to clinch the LFA Super Cup in a memorable night for Careysburg.',
    category: 'Match Report',
    date: 'May 10, 2025',
    readTime: '5 min read',
    image: '/news-featured.jpg',
    featured: true,
  },
  {
    id: 2,
    slug: 'three-new-signings-confirmed',
    title: 'Three new signings confirmed ahead of new season',
    excerpt: 'Shaita Angels FC bolster their squad with three exciting new additions ahead of the 2025/26 campaign.',
    category: 'Transfer',
    date: 'Apr 28, 2025',
    readTime: '3 min read',
    image: '/news-2.jpg',
    featured: false,
  },
  {
    id: 3,
    slug: 'u20-player-welfare-statement',
    title: 'Club statement on U-20 player welfare dispute',
    excerpt: 'Shaita Angels FC issues an official statement regarding the withdrawal of three players from the Liberia Women\'s U-20 National Team.',
    category: 'National Team',
    date: 'Apr 15, 2025',
    readTime: '4 min read',
    image: '',
    featured: false,
  },
  {
    id: 4,
    slug: 'pre-season-training-underway',
    title: 'Pre-season camp underway in Careysburg',
    excerpt: 'The Angels have begun preparations for the new season with an intensive pre-season training camp at their Careysburg home ground.',
    category: 'Training',
    date: 'Apr 5, 2025',
    readTime: '2 min read',
    image: '/gallery-2.jpg',
    featured: false,
  },
  {
    id: 5,
    slug: 'angels-finish-second-league',
    title: 'Angels finish second in LFA Premier League 2023/24',
    excerpt: 'A remarkable season ends with Shaita Angels FC finishing runners-up in the LFA Women\'s Premier League.',
    category: 'Club News',
    date: 'Mar 20, 2025',
    readTime: '3 min read',
    image: '/gallery-3.jpg',
    featured: false,
  },
  {
    id: 6,
    slug: 'fa-cup-winners-2024',
    title: 'Shaita Angels crowned FA Cup champions',
    excerpt: 'The Angels defeated World Girls FC in the FA Cup final to claim their first ever cup title in the club\'s history.',
    category: 'Match Report',
    date: 'Feb 14, 2025',
    readTime: '6 min read',
    image: '/news-featured.jpg',
    featured: false,
  },
]

const categories: Category[] = ['ALL', 'Match Report', 'Transfer', 'Training', 'National Team', 'Club News']

const categoryColors: Record<string, string> = {
  'Match Report': '#CC0000',
  'Transfer': '#1565c0',
  'Training': '#2e7d32',
  'National Team': '#f57f17',
  'Club News': '#6a1b9a',
}

export default function NewsPage() {
  const [active, setActive] = useState<Category>('ALL')

  const featured = articles.find(a => a.featured)
  const filtered = articles.filter(a => {
    if (a.featured && active === 'ALL') return false
    if (active === 'ALL') return true
    return a.category === active
  })

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        className="px-6 pt-8 pb-0"
      >
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
            Latest
          </p>
          <h1 className="text-white font-black text-3xl uppercase tracking-tight mb-6">
            News &amp; Blog
          </h1>

          {/* Category tabs */}
          <div
            className="flex gap-0 overflow-x-auto"
            style={{ borderBottom: '1px solid #222' }}
          >
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

      <div className="max-w-7xl mx-auto px-6 py-8">

        {/* Featured article */}
        {featured && active === 'ALL' && (
          <Link
            href={`/news/${featured.slug}`}
            className="block relative rounded-xl overflow-hidden mb-8 group cursor-pointer"
            style={{ height: '280px' }}
          >
            {featured.image ? (
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : null}
            {/* Fallback bg */}
            <div
              className="absolute inset-0 -z-10"
              style={{ background: 'linear-gradient(135deg, #CC0000, #880000)' }}
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.1) 60%)' }}
            />
            <div className="absolute bottom-0 left-0 p-6">
              <div
                className="inline-block text-white text-xs font-black px-3 py-1 mb-3 tracking-widest"
                style={{ background: '#CC0000' }}
              >
                {featured.category.toUpperCase()}
              </div>
              <h2 className="text-white font-black text-xl leading-tight max-w-xl mb-2">
                {featured.title}
              </h2>
              <p className="text-sm leading-relaxed max-w-lg mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
                {featured.excerpt}
              </p>
              <p className="text-xs" style={{ color: '#888' }}>
                {featured.date} · {featured.readTime}
              </p>
            </div>
          </Link>
        )}

        {/* Articles grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(article => (
            <Link
              key={article.id}
              href={`/news/${article.slug}`}
              className="rounded-xl overflow-hidden group cursor-pointer block transition-transform hover:-translate-y-1"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}
            >
              {/* Image */}
              <div className="relative overflow-hidden" style={{ height: '220px' }}>
                {article.image ? (
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                ) : null}
                {/* Fallback */}
                <div
                  className="absolute inset-0 -z-10 flex items-center justify-center"
                  style={{ background: '#1a1a1a' }}
                >
                  <span className="font-black text-4xl" style={{ color: 'rgba(204,0,0,0.2)' }}>SA</span>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)' }}
                />
                {/* Category badge */}
                <div
                  className="absolute top-3 left-3 text-white text-xs font-black px-2 py-1 tracking-widest"
                  style={{ background: categoryColors[article.category] || '#CC0000' }}
                >
                  {article.category.toUpperCase()}
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="text-white font-black text-sm leading-snug mb-2 group-hover:text-red-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-xs leading-relaxed mb-3" style={{ color: '#666' }}>
                  {article.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <p className="text-xs" style={{ color: '#444' }}>{article.date}</p>
                  <p className="text-xs" style={{ color: '#444' }}>{article.readTime}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="font-black text-2xl mb-2" style={{ color: '#222' }}>No articles yet</p>
            <p className="text-xs tracking-widest" style={{ color: '#444' }}>
              Check back soon for {active} updates
            </p>
          </div>
        )}
      </div>
    </div>
  )
}