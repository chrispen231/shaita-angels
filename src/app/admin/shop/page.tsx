'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pencil, Trash2, Plus, X } from 'lucide-react'

type ShopItem = {
  id: string
  name: string
  description: string
  price: number
  image_url: string
  category: string
  is_available: boolean
}

const categories = ['Kit', 'Training', 'Accessories', 'Other']

const emptyItem = {
  name: '', description: '', price: 0,
  image_url: '', category: 'Kit', is_available: true,
}

export default function AdminShopPage() {
  const supabase = createClient()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ShopItem | null>(null)
  const [form, setForm] = useState(emptyItem)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('shop_items')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  function openNew() {
    setEditing(null)
    setForm(emptyItem)
    setShowForm(true)
    setError('')
  }

  function openEdit(item: ShopItem) {
    setEditing(item)
    setForm({
      name: item.name, description: item.description || '',
      price: item.price, image_url: item.image_url || '',
      category: item.category, is_available: item.is_available,
    })
    setShowForm(true)
    setError('')
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)

    if (editing) {
      const { error: e } = await supabase.from('shop_items').update(form).eq('id', editing.id)
      if (e) { setError(e.message); setSaving(false); return }
    } else {
      const { error: e } = await supabase.from('shop_items').insert(form)
      if (e) { setError(e.message); setSaving(false); return }
    }

    setSaving(false)
    setShowForm(false)
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this item?')) return
    await supabase.from('shop_items').delete().eq('id', id)
    load()
  }

  async function toggleAvailable(item: ShopItem) {
    await supabase.from('shop_items')
      .update({ is_available: !item.is_available }).eq('id', item.id)
    load()
  }

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-1"
              style={{ color: '#CC0000' }}>Admin</p>
            <h1 className="text-white font-black text-2xl uppercase tracking-tight">Shop</h1>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 text-white text-xs font-black tracking-widest uppercase px-4 py-2 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
          >
            <Plus size={14} /> Add Item
          </button>
        </div>

        <div
          className="rounded-xl overflow-hidden"
          style={{ background: '#1a1a1a', border: '1px solid #222' }}
        >
          <div
            className="grid px-5 py-3"
            style={{ gridTemplateColumns: '1fr 100px 100px 100px 80px', borderBottom: '1px solid #222' }}
          >
            {['Item', 'Category', 'Price', 'Status', 'Actions'].map(h => (
              <p key={h} className="text-xs font-black tracking-widest uppercase"
                style={{ color: '#555' }}>{h}</p>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                Loading...
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                No items yet
              </p>
            </div>
          ) : (
            items.map((item, i) => (
              <div
                key={item.id}
                className="grid px-5 py-4 items-center"
                style={{
                  gridTemplateColumns: '1fr 100px 100px 100px 80px',
                  borderBottom: i < items.length - 1 ? '1px solid #222' : 'none',
                }}
              >
                <div className="flex items-center gap-3">
                  {item.image_url && (
                    <div
                      className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                      style={{ background: '#222' }}
                    >
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    </div>
                  )}
                  <p className="text-white font-black text-sm">{item.name}</p>
                </div>
                <p className="text-xs" style={{ color: '#888' }}>{item.category}</p>
                <p className="font-black text-sm" style={{ color: '#CC0000' }}>
                  ${item.price.toFixed(2)}
                </p>
                <button
                  onClick={() => toggleAvailable(item)}
                  className="text-xs font-black px-2 py-1 rounded w-fit transition-opacity hover:opacity-80"
                  style={{
                    background: item.is_available ? '#0a1a0a' : '#1a1a1a',
                    color: item.is_available ? '#7ecf7e' : '#555',
                    border: `1px solid ${item.is_available ? '#2e7d32' : '#333'}`,
                    cursor: 'pointer',
                  }}
                >
                  {item.is_available ? 'Live' : 'Hidden'}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(item)}
                    className="w-7 h-7 rounded flex items-center justify-center hover:text-white"
                    style={{ background: '#222', border: 'none', color: '#666', cursor: 'pointer' }}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="w-7 h-7 rounded flex items-center justify-center hover:text-red-400"
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

      {/* Form modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.9)' }}
        >
          <div
            className="relative w-full max-w-md my-8 rounded-xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #222' }}
          >
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <p className="text-white font-black text-sm uppercase tracking-widest">
                {editing ? 'Edit Item' : 'Add Item'}
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

              {[
                { label: 'Name *', key: 'name', placeholder: 'Item name' },
                { label: 'Image URL', key: 'image_url', placeholder: 'https://...' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: '#555' }}>
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={form[field.key as keyof typeof form] as string}
                    onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
              ))}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black tracking-widest uppercase mb-2"
                    style={{ color: '#555' }}>
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none"
                    style={{ background: '#1a1a1a', border: '1px solid #222' }}
                  />
                </div>
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
              </div>

              <div>
                <label className="block text-xs font-black tracking-widest uppercase mb-2"
                  style={{ color: '#555' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Item description..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg text-sm text-white outline-none resize-none"
                  style={{ background: '#1a1a1a', border: '1px solid #222' }}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, is_available: !f.is_available }))}
                  className="w-10 h-5 rounded-full relative transition-colors cursor-pointer"
                  style={{ background: form.is_available ? '#CC0000' : '#333' }}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: form.is_available ? '22px' : '2px' }}
                  />
                </div>
                <span className="text-xs font-black tracking-widest uppercase" style={{ color: '#666' }}>
                  Available in shop
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 text-white font-black tracking-widest uppercase text-xs transition-opacity hover:opacity-80"
                  style={{
                    background: saving ? '#555' : '#CC0000',
                    border: 'none',
                    cursor: saving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {saving ? 'Saving...' : editing ? 'Save Changes' : 'Add Item'}
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