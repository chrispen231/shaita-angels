'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Newspaper, Users, Calendar,
  Image, MessageSquare, UserCircle, LogOut, Menu, X, ShoppingBag
} from 'lucide-react'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/players', label: 'Players', icon: Users },
  { href: '/admin/fixtures', label: 'Fixtures', icon: Calendar },
  { href: '/admin/gallery', label: 'Gallery', icon: Image },
  { href: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { href: '/admin/fans', label: 'Fans', icon: UserCircle },
  { href: '/admin/shop', label: 'Shop', icon: ShoppingBag },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminName, setAdminName] = useState('')

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') { router.push('/'); return }
      setAdminName(profile.full_name || profile.email)
    }
    check()
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const Sidebar = () => (
    <div
      className="flex flex-col h-full"
      style={{ background: '#0a0a0a', borderRight: '1px solid #1a1a1a' }}
    >
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid #1a1a1a' }}>
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs"
            style={{ background: '#CC0000' }}
          >
            SA
          </div>
          <span className="text-white font-black text-xs tracking-widest">SHAITA ANGELS</span>
        </div>
        <p className="text-xs font-black tracking-widest" style={{ color: '#CC0000', fontSize: '9px' }}>
          ADMIN PANEL
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-black tracking-widest uppercase transition-all"
              style={{
                background: isActive ? 'rgba(204,0,0,0.12)' : 'transparent',
                color: isActive ? '#fff' : '#555',
                borderLeft: isActive ? '2px solid #CC0000' : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
        <p className="text-xs px-3 mb-3 truncate" style={{ color: '#444' }}>{adminName}</p>
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-colors hover:text-white mb-1"
          style={{ color: '#444' }}
        >
          ← View Site
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-black tracking-widest uppercase transition-colors hover:text-white"
          style={{ background: 'transparent', border: 'none', color: '#444', cursor: 'pointer' }}
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0a0a' }}>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-52 flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-52 flex-shrink-0">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Mobile topbar */}
        <div
          className="lg:hidden flex items-center justify-between px-4 py-3"
          style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}
          >
            <Menu size={20} />
          </button>
          <span className="text-white font-black text-xs tracking-widest">ADMIN</span>
          <div />
        </div>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto" style={{ background: '#0f0f0f' }}>
          {children}
        </div>
      </div>
    </div>
  )
}