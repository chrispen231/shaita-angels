'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Trash2, Plus, X, Upload } from 'lucide-react'

type Photo = {
  id: string
  title: string
  image_url: string
  category: string
  created_at: string
}

const categories = ['Match Day', 'Training', 'Trophy', 'Squad', 'Away', 'Other']

export default function AdminGalleryPage() {
  const supabase = createClient()
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', image_url: '', category: 'Match Day' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false })
    setPhotos(data || [])
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const fileName = `${Date.now()}.${ext}`

    const { data, error: uploadError } = await supabase.storage
      .from('gallery-photos')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { data: urlData } = supabase.storage
      .from('gallery-photos')
      .getPublicUrl(data.path)

    setForm(f => ({ ...f, image_url: urlData.publicUrl }))
    setUploading(false)
  }

  async function handleSave() {
    if (!form.image_url) { setError('Please upload or enter an image URL.'); return }
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { error: e } = await supabase.from('gallery').insert({
      ...form,
      uploaded_by: user?.id,
    })

    if (e) { setError(e.message); setSaving(false); return }
    setSaving(false)
    setShowForm(false)
    setForm({ title: '', image_url: '', category: 'Match Day' })
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this photo?')) return
    await supabase.from('gallery').delete().eq('id', id)
    load()
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Gallery</h1>
          </div>
          <button
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Upload Photo
          </button>
        </div>

        {/* Photo grid */}
        {loading ? (
          <p className="text-xs font-black tracking-widest uppercase text-center py-12"
            style={{ color: '#444' }}>Loading...</p>
        ) : photos.length === 0 ? (
          <div
            className="rounded-xl p-12 text-center"
            style={{ background: '#1a1a1a', border: '1px solid #222' }}
          >
            <p className="text-xs font-black tracking-widest uppercase mb-3" style={{ color: '#444' }}>
              No photos yet
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="text-white text-xs font-black tracking-widest uppercase px-4 py-2"
              style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
            >
              + Upload First Photo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="relative rounded-lg overflow-hidden group"
                style={{ aspectRatio: '1', background: '#1a1a1a' }}
              >
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                {/* Overlay */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3"
                  style={{ background: 'rgba(0,0,0,0.8)' }}
                >
                  <button
                    onClick={() => handleDelete(photo.id)}
                    className="w-7 h-7 rounded flex items-center justify-center self-end transition-colors hover:text-red-400"
                    style={{ background: '#CC0000', border: 'none', color: '#fff', cursor: 'pointer' }}
                  >
                    <Trash2 size={12} />
                  </button>
                  <div>
                    <p className="text-white font-black text-xs mb-1">{photo.title || 'Untitled'}</p>
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded"
                      style={{ background: '#CC0000', color: '#fff', fontSize: '9px' }}
                    >
                      {photo.category}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
        >
          <div
            className="relative w-full max-w-md rounded-xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <p className="text-white font-black text-sm uppercase tracking-widest">Upload Photo</p>
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

              {/* File upload */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2"
                  style={{ color: '#555' }}>
                  Upload Image
                </label>
                <label
                  className="flex flex-col items-center justify-center w-full rounded-xl cursor-pointer transition-colors hover:border-red-500"
                  style={{
                    border: '2px dashed #333',
                    padding: '24px',
                    background: '#1a1a1a',
                  }}
                >
                  <Upload size={24} style={{ color: '#555', marginBottom: '8px' }} />
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#555' }}>
                    {uploading ? 'Uploading...' : 'Click to upload'}
                  </p>
                  <p className="text-xs mt-1" style={{ color: '#333' }}>JPG, PNG, WEBP</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
                {form.image_url && (
                  <div className="mt-2 rounded-lg overflow-hidden" style={{ height: '100px' }}>
                    <img
                      src={form.image_url}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Or URL */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2"
                  style={{ color: '#555' }}>
                  Or paste image URL
                </label>
                <input
                  type="text"
                  value={form.image_url}
                  onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2"
                  style={{ color: '#555' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Photo title (optional)"
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2"
                  style={{ color: '#555' }}>
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

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || uploading}
                  className="flex-1 py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80"
                  style={{
                    background: saving || uploading ? '#555' : '#CC0000',
                    border: 'none',
                    cursor: saving || uploading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : 'Add to Gallery'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-xs font-black tracking-widest uppercase"
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