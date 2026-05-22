'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Check, X } from 'lucide-react'

type Comment = {
  id: string
  content: string
  is_approved: boolean
  created_at: string
  user_id: string
  profiles: { full_name: string; email: string }
}

export default function AdminCommentsPage() {
  const supabase = createClient()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('comments')
      .select(`id, content, is_approved, created_at, user_id,
        profiles ( full_name, email )`)
      .order('created_at', { ascending: false })
    setComments(data as unknown as Comment[] || [])
    setLoading(false)
  }

  async function handleApprove(id: string, current: boolean) {
    await supabase.from('comments').update({ is_approved: !current }).eq('id', id)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this comment?')) return
    await supabase.from('comments').delete().eq('id', id)
    load()
  }

  const filtered = comments.filter(c => {
    if (filter === 'APPROVED') return c.is_approved
    if (filter === 'PENDING') return !c.is_approved
    return true
  })

  function timeAgo(date: string) {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (diff < 60) return `${diff}s ago`
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Comments</h1>
          </div>
          <div className="flex gap-2">
            {(['ALL', 'APPROVED', 'PENDING'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded transition-all"
                style={{
                  background: filter === f ? '#CC0000' : '#1a1a1a',
                  color: filter === f ? '#fff' : '#555',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Total', val: comments.length, color: '#fff' },
            { label: 'Approved', val: comments.filter(c => c.is_approved).length, color: '#7ecf7e' },
            { label: 'Pending', val: comments.filter(c => !c.is_approved).length, color: '#FFD700' },
          ].map(s => (
            <div
              key={s.label}
              className="rounded-xl p-4 text-center"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}
            >
              <p className="font-black text-2xl mb-1" style={{ color: s.color }}>{s.val}</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: '#555' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Comments list */}
        <div className="flex flex-col gap-3">
          {loading ? (
            <p className="text-xs font-black tracking-widest uppercase text-center py-12"
              style={{ color: '#444' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <div
              className="rounded-xl p-12 text-center"
              style={{ background: '#1a1a1a', border: '1px solid #222' }}
            >
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                No comments found
              </p>
            </div>
          ) : (
            filtered.map(comment => (
              <div
                key={comment.id}
                className="rounded-xl p-5"
                style={{
                  background: '#1a1a1a',
                  border: `1px solid ${comment.is_approved ? '#222' : '#2a2a00'}`,
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* User */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs flex-shrink-0"
                        style={{ background: '#CC0000' }}
                      >
                        {(comment.profiles?.full_name || comment.profiles?.email || 'F')
                          .slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-white font-black text-xs">
                          {comment.profiles?.full_name || comment.profiles?.email || 'Fan'}
                        </p>
                        <p className="text-xs" style={{ color: '#555' }}>
                          {timeAgo(comment.created_at)}
                        </p>
                      </div>
                      <span
                        className="ml-2 text-xs font-black px-2 py-0.5 rounded"
                        style={{
                          background: comment.is_approved ? '#0a1a0a' : '#1a1a00',
                          color: comment.is_approved ? '#7ecf7e' : '#FFD700',
                          border: `1px solid ${comment.is_approved ? '#2e7d32' : '#555500'}`,
                          fontSize: '9px',
                        }}
                      >
                        {comment.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    {/* Content */}
                    <p className="text-sm leading-relaxed" style={{ color: '#aaa' }}>
                      {comment.content}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleApprove(comment.id, comment.is_approved)}
                      className="w-8 h-8 rounded flex items-center justify-center transition-colors"
                      style={{
                        background: comment.is_approved ? '#1a1a00' : '#0a1a0a',
                        border: 'none',
                        color: comment.is_approved ? '#FFD700' : '#7ecf7e',
                        cursor: 'pointer',
                      }}
                      title={comment.is_approved ? 'Unapprove' : 'Approve'}
                    >
                      {comment.is_approved ? <X size={12} /> : <Check size={12} />}
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="w-8 h-8 rounded flex items-center justify-center transition-colors hover:text-red-400"
                      style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}