'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const links = [
  { href: '/', label: 'HOME' },
  { href: '/players', label: 'SQUAD' },
  { href: '/fixtures', label: 'FIXTURES' },
  { href: '/news', label: 'NEWS' },
  { href: '/gallery', label: 'GALLERY' },
  { href: '/about', label: 'ABOUT' },
  { href: '/shop', label: 'SHOP' },
  { href: '/tickets', label: 'TICKETS' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav style={{ background: 'rgba(10,10,10,0.96)', borderBottom: '1px solid #1a1a1a' }}
      className="sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-14">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-red flex items-center justify-center overflow-hidden">
            <span className="text-white font-black text-xs">SA</span>
          </div>
          <span className="text-white font-black text-sm tracking-widest">SHAITA ANGELS FC</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden lg:flex items-center gap-6">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs font-semibold tracking-widest transition-colors"
              style={{ color: pathname === link.href ? '#fff' : '#666' }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            href="/fan-zone"
            className="text-xs font-black tracking-widest px-4 py-2 text-white"
            style={{ background: '#CC0000' }}
          >
            FAN ZONE
          </Link>
          <Link
            href="/login"
            className="text-xs font-semibold tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            LOGIN
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a' }}
          className="lg:hidden px-6 py-4 flex flex-col gap-4">
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="text-xs font-semibold tracking-widest"
              style={{ color: pathname === link.href ? '#fff' : '#666' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/fan-zone"
            onClick={() => setMenuOpen(false)}
            className="text-xs font-black tracking-widest px-4 py-2 text-white text-center mt-2"
            style={{ background: '#CC0000' }}
          >
            FAN ZONE
          </Link>
          <Link
            href="/login"
            onClick={() => setMenuOpen(false)}
            className="text-xs font-semibold tracking-widest text-gray-500 text-center"
          >
            LOGIN
          </Link>
        </div>
      )}
    </nav>
  )
}