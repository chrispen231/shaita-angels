'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
}

type Post = {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: { full_name: string; email: string }
  reactions: { emoji: string; user_id: string }[]
}

const EMOJIS = ['❤️', '🔥', '👏']

function timeAgo(date: string) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getInitials(name: string, email: string) {
  if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  return email.slice(0, 2).toUpperCase()
}

const avatarColors = [
  '#CC0000', '#880000', '#1a3a5c', '#1a3a0a', '#4a0000', '#2a2a6a',
]

function getAvatarColor(userId: string) {
  const index = userId.charCodeAt(0) % avatarColors.length
  return avatarColors[index]
}

export default function FanZonePage() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  // Load user + posts
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      await loadPosts()
      setLoading(false)
    }
    init()
  }, [])

  async function loadPosts() {
    const { data } = await supabase
      .from('comments')
      .select(`
        id, content, created_at, user_id,
        profiles ( full_name, email ),
        reactions ( emoji, user_id )
      `)
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) setPosts(data as unknown as Post[])
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !profile) return
    setPosting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('comments').insert({
      user_id: user.id,
      content: newComment.trim(),
      news_id: null,
      is_approved: true,
    })

    if (!error) {
      setNewComment('')
      await loadPosts()
    }
    setPosting(false)
  }

  async function handleReact(postId: string, emoji: string) {
    if (!profile) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Check if already reacted
    const post = posts.find(p => p.id === postId)
    const existing = post?.reactions.find(r => r.emoji === emoji && r.user_id === user.id)

    if (existing) {
      // Remove reaction
      await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('news_id', postId)
        .eq('emoji', emoji)
    } else {
      // Add reaction — use comment id as news_id for simplicity
      await supabase.from('reactions').insert({
        user_id: user.id,
        news_id: postId,
        emoji,
      })
    }
    await loadPosts()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleDelete(postId: string) {
    await supabase.from('comments').delete().eq('id', postId)
    await loadPosts()
  }

  if (loading) {
    return (
      <div
        style={{ background: '#0a0a0a', minHeight: '100vh' }}
        className="flex items-center justify-center"
      >
        <div className="text-center">
          <div
            className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto mb-4 animate-spin"
            style={{ borderColor: '#CC0000', borderTopColor: 'transparent' }}
          />
          <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#555' }}>
            Loading Fan Zone...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        className="px-6 pt-8 pb-6"
      >
        <div className="max-w-3xl mx-auto flex items-start justify-between">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
              Community
            </p>
            <h1 className="text-white font-black text-3xl uppercase tracking-tight">
              Fan Zone
            </h1>
            {profile && (
              <p className="text-xs mt-2" style={{ color: '#555' }}>
                Signed in as{' '}
                <span style={{ color: '#fff' }}>
                  {profile.full_name || profile.email}
                </span>
                {profile.role === 'admin' && (
                  <span
                    className="ml-2 text-xs font-black px-2 py-0.5 rounded"
                    style={{ background: '#CC0000', color: '#fff', fontSize: '9px' }}
                  >
                    ADMIN
                  </span>
                )}
              </p>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-xs font-black tracking-widest uppercase px-3 py-2 rounded-lg transition-colors hover:text-white"
            style={{ background: 'transparent', border: '1px solid #1a1a1a', color: '#555', cursor: 'pointer' }}
          >
            <LogOut size={12} />
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">

        {/* Post composer */}
        <form
          onSubmit={handlePost}
          className="rounded-xl p-5 mb-8"
          style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
        >
          <div className="flex gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0"
              style={{ background: profile ? getAvatarColor(profile.id) : '#CC0000' }}
            >
              {profile ? getInitials(profile.full_name, profile.email) : 'SA'}
            </div>
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Share your thoughts with the Angels family..."
              rows={3}
              className="flex-1 text-sm text-white placeholder-gray-700 outline-none resize-none rounded-lg px-4 py-3"
              style={{ background: '#1a1a1a', border: '1px solid #222', color: '#fff' }}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={posting || !newComment.trim()}
              className="text-xs font-black tracking-widest uppercase px-5 py-2 text-white transition-opacity hover:opacity-80"
              style={{
                background: posting || !newComment.trim() ? '#333' : '#CC0000',
                border: 'none',
                cursor: posting || !newComment.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {posting ? 'Posting...' : 'Post'}
            </button>
          </div>
        </form>

        {/* Posts feed */}
        <div className="flex flex-col gap-4">
          {posts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🔴</p>
              <p className="font-black text-sm uppercase tracking-widest mb-2" style={{ color: '#333' }}>
                No posts yet
              </p>
              <p className="text-xs" style={{ color: '#444' }}>
                Be the first to post in the Fan Zone!
              </p>
            </div>
          )}

          {posts.map(post => {
            const name = post.profiles?.full_name || post.profiles?.email || 'Fan'
            const initials = getInitials(post.profiles?.full_name, post.profiles?.email)
            const avatarColor = getAvatarColor(post.user_id)
            const isOwn = profile?.id === post.user_id
            const isAdmin = profile?.role === 'admin'

            return (
              <div
                key={post.id}
                className="rounded-xl p-5"
                style={{ background: '#0f0f0f', border: '1px solid #1a1a1a' }}
              >
                {/* User row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0"
                      style={{ background: avatarColor }}
                    >
                      {initials}
                    </div>
                    <div>
                      <p className="text-white font-black text-sm">{name}</p>
                      <p className="text-xs" style={{ color: '#555' }}>{timeAgo(post.created_at)}</p>
                    </div>
                  </div>
                  {(isOwn || isAdmin) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-xs transition-colors hover:text-red-500"
                      style={{ background: 'transparent', border: 'none', color: '#333', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Content */}
                <p className="text-sm leading-relaxed mb-4" style={{ color: '#aaa' }}>
                  {post.content}
                </p>

                {/* Reactions */}
                <div className="flex items-center gap-2">
                  {EMOJIS.map(emoji => {
                    const count = post.reactions?.filter(r => r.emoji === emoji).length || 0
                    const reacted = post.reactions?.some(
                      r => r.emoji === emoji && r.user_id === profile?.id
                    )
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReact(post.id, emoji)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                        style={{
                          background: reacted ? '#1a0000' : '#1a1a1a',
                          border: reacted ? '1px solid #CC0000' : '1px solid #222',
                          color: reacted ? '#fff' : '#666',
                          cursor: 'pointer',
                        }}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span>{count}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}