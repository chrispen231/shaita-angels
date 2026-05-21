import Link from 'next/link'

export default function Footer() {
  return (
    <footer style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }} className="mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: '#CC0000' }}>
                <span className="text-white font-black text-xs">SA</span>
              </div>
              <span className="text-white font-black text-sm tracking-widest">SHAITA ANGELS FC</span>
            </div>
            <p style={{ color: '#444' }} className="text-xs leading-relaxed">
              Based in Careysburg, Liberia.<br />
              Founded 2019. LFA Super Cup Champions.
            </p>
            <div className="flex gap-3 mt-4">
              <a href="https://web.facebook.com/shaitaangelsfc" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors hover:text-white"
                style={{ background: '#1a1a1a', color: '#555' }}>f</a>
              <a href="#" target="_blank" rel="noreferrer"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors hover:text-white"
                style={{ background: '#1a1a1a', color: '#555' }}>𝕏</a>
            </div>
          </div>

          {/* Club */}
          <div>
            <p className="text-white text-xs font-bold tracking-widest uppercase mb-4">Club</p>
            {[
              { href: '/about', label: 'About Us' },
              { href: '/players', label: 'Players' },
              { href: '/fixtures', label: 'Fixtures' },
              { href: '/gallery', label: 'Gallery' },
              { href: '/sponsors', label: 'Sponsors' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="block text-xs mb-2 transition-colors hover:text-white"
                style={{ color: '#444' }}>
                {l.label}
              </Link>
            ))}
          </div>

          {/* Community */}
          <div>
            <p className="text-white text-xs font-bold tracking-widest uppercase mb-4">Community</p>
            {[
              { href: '/fan-zone', label: 'Fan Zone' },
              { href: '/shop', label: 'Merch Shop' },
              { href: '/tickets', label: 'Tickets' },
              { href: '/contact', label: 'Contact' },
              { href: '/news', label: 'News' },
            ].map(l => (
              <Link key={l.href} href={l.href}
                className="block text-xs mb-2 transition-colors hover:text-white"
                style={{ color: '#444' }}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #1a1a1a' }} className="pt-6 flex justify-between items-center">
          <p style={{ color: '#333' }} className="text-xs">
            © 2025 Shaita Angels FC. All rights reserved.
          </p>
          <Link href="/admin"
            className="text-xs transition-colors hover:text-white"
            style={{ color: '#333' }}>
            Admin
          </Link>
        </div>
      </div>
    </footer>
  )
}