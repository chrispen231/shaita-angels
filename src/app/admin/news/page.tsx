'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, X, Eye, EyeOff } from 'lucide-react'

type Article = {
  id: string
  title: string
  slug: string
  excerpt: string
  content: string
  category: string
  is_published: boolean
  is_featured: boolean
  cover_image_url: string
  created_at: string
}

const categories = ['Match Report', 'Transfer', 'Training', 'National Team', 'Club News', 'General']

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

const empty = {
  title: '', slug: '', excerpt: '', content: '',
  category: 'General', is_published: false,
  is_featured: false, cover_image_url: '',
}

export default function AdminNewsPage() {
  const supabase = createClient()
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Article | null>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
    setArticles(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(empty)
    setShowForm(true)
    setError('')
  }

  function openEdit(article: Article) {
    setEditing(article)
    setForm({
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt || '',
      content: article.content || '',
      category: article.category,
      is_published: article.is_published,
      is_featured: article.is_featured,
      cover_image_url: article.cover_image_url || '',
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    const slug = form.slug || slugify(form.title)

    if (editing) {
      const { error: e } = await supabase
        .from('news')
        .update({ ...form, slug, updated_at: new Date().toISOString() })
        .eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase
        .from('news')
        .insert({ ...form, slug })
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this article?')) return
    await supabase.from('news').delete().eq('id', id)
    load()
  }

  async function togglePublish(article: Article) {
    await supabase
      .from('news')
      .update({ is_published: !article.is_published })
      .eq('id', article.id)
    load()
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1" style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">News</h1>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> New Article
          </button>
        </div>

        {/* Articles table */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid #222' }}
        >
          <div
            className="grid px-5 py-3"
            style={{
              gridTemplateColumns: '1fr 120px 100px 100px',
              borderBottom: '1px solid #222',
            }}
          >
            {['Article', 'Category', 'Status', 'Actions'].map(h => (
              <p key={h} className="text-xs font-black tracking-widest uppercase" style={{ color: '#555' }}>
                {h}
              </p>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                Loading...
              </p>
            </div>
          ) : articles.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                No articles yet. Create your first one!
              </p>
            </div>
          ) : (
            articles.map((article, i) => (
              <div
                key={article.id}
                className="grid px-5 py-4 items-center"
                style={{
                  gridTemplateColumns: '1fr 120px 100px 100px',
                  borderBottom: i < articles.length - 1 ? '1px solid #222' : 'none',
                }}
              >
                <div>
                  <p className="text-white font-black text-sm leading-snug mb-1">{article.title}</p>
                  <p className="text-xs" style={{ color: '#555' }}>
                    {new Date(article.created_at).toLocaleDateString()}
                    {article.is_featured && (
                      <span
                        className="ml-2 text-xs font-black px-1.5 py-0.5 rounded"
                        style={{ background: '#FFD700', color: '#000', fontSize: '8px' }}
                      >
                        FEATURED
                      </span>
                    )}
                  </p>
                </div>
                <p className="text-xs font-black" style={{ color: '#888' }}>{article.category}</p>
                <button
                  onClick={() => togglePublish(article)}
                  className="flex items-center gap-1.5 text-xs font-black px-2 py-1 rounded w-fit transition-opacity hover:opacity-80"
                  style={{
                    background: article.is_published ? '#0a1a0a' : '#1a1a1a',
                    color: article.is_published ? '#7ecf7e' : '#555',
                    border: `1px solid ${article.is_published ? '#2e7d32' : '#333'}`,
                    cursor: 'pointer',
                  }}
                >
                  {article.is_published ? <Eye size={10} /> : <EyeOff size={10} />}
                  {article.is_published ? 'Live' : 'Draft'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(article)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-white"
                    style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(article.id)}
                    className="w-7 h-7 rounded flex items-center justify-center transition-colors hover:text-red-400"
                    style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Article form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.9)' }}
        >
          <div
            className="relative w-full max-w-2xl my-8 rounded-xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <p className="text-white font-black text-sm uppercase tracking-widest">
                {editing ? 'Edit Article' : 'New Article'}
              </p>
              <button
                onClick={() => setShowForm(false)}
                style={{ background: 'transparent', border: 'none', color: '#555', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4">
              {error && (
                <div
                  className="px-4 py-3 rounded text-xs font-bold"
                  style={{ background: '#1a0000', border: '1px solid #CC0000', color: '#ff6666' }}
                >
                  {error}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({
                    ...f, title: e.target.value,
                    slug: slugify(e.target.value),
                  }))}
                  placeholder="Article title"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Slug
                </label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated-from-title"
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222', color: '#666' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Cover image URL */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Cover Image URL
                </label>
                <input
                  type="text"
                  value={form.cover_image_url}
                  onChange={e => setForm(f => ({ ...f, cover_image_url: e.target.value }))}
                  placeholder="https://... or /image.jpg"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Excerpt
                </label>
                <textarea
                  value={form.excerpt}
                  onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Short summary shown on news list..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                  Content
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="Full article content..."
                  rows={8}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                {[
                  { label: 'Published', key: 'is_published' },
                  { label: 'Featured', key: 'is_featured' },
                ].map(toggle => (
                  <label key={toggle.key} className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setForm(f => ({ ...f, [toggle.key]: !f[toggle.key as keyof typeof f] }))}
                      className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                      style={{
                        background: form[toggle.key as keyof typeof form] ? '#CC0000' : '#333',
                      }}
                    >
                      <div
                        className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                        style={{
                          left: form[toggle.key as keyof typeof form] ? '22px' : '2px',
                        }}
                      />
                    </div>
                    <span className="text-xs font-black tracking-widest uppercase" style={{ color: '#666' }}>
                      {toggle.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80"
                  style={{ background: saving ? '#555' : '#CC0000', border: 'none', cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Publish Article'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase transition-colors hover:text-white"
                  style={{ background: '#1a1a1a', border: '1px solid #222', color: '#555', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}