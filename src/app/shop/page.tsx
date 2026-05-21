'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, X, Plus, Minus } from 'lucide-react'

type Category = 'ALL' | 'Kit' | 'Training' | 'Accessories'

type Item = {
  id: number
  name: string
  price: number
  category: Category
  image: string
  description: string
  sizes?: string[]
  badge?: string
}

const items: Item[] = [
  {
    id: 1,
    name: 'Home Kit 2024/25',
    price: 45.00,
    category: 'Kit',
    image: '/gallery-3.jpg',
    description: 'Official Shaita Angels FC home kit. Red with white trim. Lightweight performance fabric.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    badge: 'NEW',
  },
  {
    id: 2,
    name: 'Away Kit 2024/25',
    price: 45.00,
    category: 'Kit',
    image: '/gallery-2.jpg',
    description: 'Official Shaita Angels FC away kit. White with red trim. Lightweight performance fabric.',
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  },
  {
    id: 3,
    name: 'Training Jersey',
    price: 28.00,
    category: 'Training',
    image: '/gallery-2.jpg',
    description: 'Club training jersey worn by the squad. Breathable fabric perfect for training sessions.',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 4,
    name: 'Training Shorts',
    price: 18.00,
    category: 'Training',
    image: '/gallery-3.jpg',
    description: 'Official club training shorts. Elastic waistband with drawstring. Lightweight and comfortable.',
    sizes: ['S', 'M', 'L', 'XL'],
  },
  {
    id: 5,
    name: 'Club Scarf',
    price: 15.00,
    category: 'Accessories',
    image: '/news-featured.jpg',
    description: 'Red and black woven club scarf. Show your colours on match day.',
    badge: 'POPULAR',
  },
  {
    id: 6,
    name: 'Club Cap',
    price: 12.00,
    category: 'Accessories',
    image: '/gallery-1.jpg',
    description: 'Embroidered Shaita Angels FC cap. One size fits all. Adjustable strap.',
  },
  {
    id: 7,
    name: 'Super Cup Winners Tee',
    price: 22.00,
    category: 'Accessories',
    image: '/news-featured.jpg',
    description: 'Commemorative t-shirt celebrating the LFA Super Cup 2024/25 victory.',
    badge: 'LIMITED',
  },
  {
    id: 8,
    name: 'Club Tracksuit',
    price: 65.00,
    category: 'Training',
    image: '/gallery-2.jpg',
    description: 'Full club tracksuit — jacket and trousers. Perfect for matchday travel and training.',
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
  },
]

type CartItem = Item & { qty: number; selectedSize?: string }

const categories: Category[] = ['ALL', 'Kit', 'Training', 'Accessories']

const badgeColors: Record<string, { bg: string; color: string }> = {
  NEW: { bg: '#CC0000', color: '#fff' },
  POPULAR: { bg: '#FFD700', color: '#000' },
  LIMITED: { bg: '#1a1a1a', color: '#fff' },
}

export default function ShopPage() {
  const [active, setActive] = useState<Category>('ALL')
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>('')

  const filtered = active === 'ALL' ? items : items.filter(i => i.category === active)
  const cartTotal = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0)

  function addToCart(item: Item, size?: string) {
    setCart(prev => {
      const key = `${item.id}-${size || ''}`
      const existing = prev.find(c => `${c.id}-${c.selectedSize || ''}` === key)
      if (existing) {
        return prev.map(c =>
          `${c.id}-${c.selectedSize || ''}` === key ? { ...c, qty: c.qty + 1 } : c
        )
      }
      return [...prev, { ...item, qty: 1, selectedSize: size }]
    })
    setSelectedItem(null)
    setSelectedSize('')
    setCartOpen(true)
  }

  function removeFromCart(id: number, size?: string) {
    setCart(prev => prev.filter(c => !(c.id === id && c.selectedSize === size)))
  }

  function updateQty(id: number, size: string | undefined, delta: number) {
    setCart(prev => prev.map(c => {
      if (c.id === id && c.selectedSize === size) {
        const newQty = c.qty + delta
        if (newQty <= 0) return null as unknown as CartItem
        return { ...c, qty: newQty }
      }
      return c
    }).filter(Boolean))
  }

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh' }}>

      {/* Header */}
      <div
        style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a' }}
        className="px-6 pt-8 pb-0"
      >
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#CC0000' }}>
              Official Store
            </p>
            <h1 className="text-white font-black text-3xl uppercase tracking-tight mb-6">
              Merch Shop
            </h1>
          </div>
          {/* Cart button */}
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg mb-6 transition-opacity hover:opacity-80"
            style={{ background: '#CC0000', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            <ShoppingCart size={16} />
            <span className="text-xs font-black tracking-widest">CART</span>
            {cartCount > 0 && (
              <span
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-xs font-black"
                style={{ background: '#fff', color: '#CC0000' }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* Category tabs */}
        <div className="max-w-7xl mx-auto flex gap-0" style={{ borderBottom: '1px solid #222' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActive(cat)}
              className="text-xs font-black tracking-widest uppercase px-5 py-3 transition-colors"
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

      {/* Products grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="rounded-xl overflow-hidden cursor-pointer group transition-transform hover:-translate-y-1"
              style={{ background: '#111', border: '1px solid #1e1e1e' }}
              onClick={() => { setSelectedItem(item); setSelectedSize('') }}
            >
              {/* Image */}
              <div
                className="relative overflow-hidden"
                style={{ height: '180px', background: '#1a1a1a' }}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div
                  className="absolute inset-0 -z-10 flex items-center justify-center"
                  style={{ background: '#1a1a1a' }}
                >
                  <span className="font-black text-5xl" style={{ color: 'rgba(204,0,0,0.15)' }}>SA</span>
                </div>
                {item.badge && (
                  <div
                    className="absolute top-2 left-2 text-xs font-black px-2 py-0.5 tracking-widest"
                    style={{
                      background: badgeColors[item.badge].bg,
                      color: badgeColors[item.badge].color,
                      fontSize: '9px',
                    }}
                  >
                    {item.badge}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <p
                  className="text-xs font-black tracking-widest uppercase mb-1"
                  style={{ color: '#555', fontSize: '9px' }}
                >
                  {item.category}
                </p>
                <p className="text-white font-black text-sm mb-2 leading-snug">{item.name}</p>
                <div className="flex items-center justify-between">
                  <p className="font-black text-base" style={{ color: '#CC0000' }}>
                    ${item.price.toFixed(2)}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (item.sizes) {
                        setSelectedItem(item)
                        setSelectedSize('')
                      } else {
                        addToCart(item)
                      }
                    }}
                    className="text-xs font-black tracking-widest px-3 py-1.5 transition-opacity hover:opacity-80"
                    style={{ background: '#CC0000', color: '#fff', border: 'none', cursor: 'pointer' }}
                  >
                    ADD
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Product modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.9)' }}
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="relative max-w-lg w-full rounded-xl overflow-hidden"
            style={{ background: '#111', border: '1px solid #222' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative" style={{ height: '220px', background: '#1a1a1a' }}>
              <img
                src={selectedItem.image}
                alt={selectedItem.name}
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <div className="absolute inset-0 -z-10 flex items-center justify-center">
                <span className="font-black text-6xl" style={{ color: 'rgba(204,0,0,0.15)' }}>SA</span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm"
                style={{ background: '#CC0000', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="p-5">
              <p
                className="text-xs font-black tracking-widest uppercase mb-1"
                style={{ color: '#CC0000', fontSize: '9px' }}
              >
                {selectedItem.category}
              </p>
              <h3 className="text-white font-black text-lg mb-2">{selectedItem.name}</h3>
              <p className="text-xs leading-relaxed mb-4" style={{ color: '#666' }}>
                {selectedItem.description}
              </p>

              {/* Size selector */}
              {selectedItem.sizes && (
                <div className="mb-4">
                  <p className="text-xs font-black tracking-widest uppercase mb-2" style={{ color: '#555' }}>
                    Select Size
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {selectedItem.sizes.map(size => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className="w-10 h-10 rounded text-xs font-black transition-all"
                        style={{
                          background: selectedSize === size ? '#CC0000' : '#1a1a1a',
                          color: selectedSize === size ? '#fff' : '#666',
                          border: selectedSize === size ? '1px solid #CC0000' : '1px solid #333',
                          cursor: 'pointer',
                        }}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <p className="font-black text-2xl" style={{ color: '#CC0000' }}>
                  ${selectedItem.price.toFixed(2)}
                </p>
                <button
                  onClick={() => {
                    if (selectedItem.sizes && !selectedSize) return
                    addToCart(selectedItem, selectedSize || undefined)
                  }}
                  className="text-xs font-black tracking-widest px-6 py-3 transition-opacity hover:opacity-80"
                  style={{
                    background: selectedItem.sizes && !selectedSize ? '#333' : '#CC0000',
                    color: '#fff',
                    border: 'none',
                    cursor: selectedItem.sizes && !selectedSize ? 'not-allowed' : 'pointer',
                  }}
                >
                  {selectedItem.sizes && !selectedSize ? 'SELECT SIZE' : 'ADD TO CART'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart sidebar */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.7)' }}
            onClick={() => setCartOpen(false)}
          />
          <div
            className="relative w-full max-w-sm h-full flex flex-col"
            style={{ background: '#0f0f0f', borderLeft: '1px solid #1a1a1a' }}
          >
            {/* Cart header */}
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid #1a1a1a' }}
            >
              <p className="text-white font-black tracking-widest uppercase text-sm">
                Cart ({cartCount})
              </p>
              <button
                onClick={() => setCartOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#666' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingCart size={40} style={{ color: '#333', margin: '0 auto 12px' }} />
                  <p className="text-xs font-black tracking-widest uppercase" style={{ color: '#444' }}>
                    Your cart is empty
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {cart.map(c => (
                    <div
                      key={`${c.id}-${c.selectedSize}`}
                      className="flex gap-3 items-start py-3"
                      style={{ borderBottom: '1px solid #1a1a1a' }}
                    >
                      <div
                        className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0"
                        style={{ background: '#1a1a1a' }}
                      >
                        <img
                          src={c.image}
                          alt={c.name}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-black text-xs mb-1">{c.name}</p>
                        {c.selectedSize && (
                          <p className="text-xs mb-1" style={{ color: '#555' }}>Size: {c.selectedSize}</p>
                        )}
                        <p className="text-xs font-black" style={{ color: '#CC0000' }}>
                          ${c.price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQty(c.id, c.selectedSize, -1)}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ background: '#1a1a1a', border: 'none', cursor: 'pointer', color: '#fff' }}
                          >
                            <Minus size={10} />
                          </button>
                          <span className="text-white text-xs font-black">{c.qty}</span>
                          <button
                            onClick={() => updateQty(c.id, c.selectedSize, 1)}
                            className="w-6 h-6 rounded flex items-center justify-center"
                            style={{ background: '#1a1a1a', border: 'none', cursor: 'pointer', color: '#fff' }}
                          >
                            <Plus size={10} />
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(c.id, c.selectedSize)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#555' }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cart footer */}
            {cart.length > 0 && (
              <div className="px-5 py-4" style={{ borderTop: '1px solid #1a1a1a' }}>
                <div className="flex justify-between mb-4">
                  <p className="text-white font-black text-sm">Total</p>
                  <p className="font-black text-lg" style={{ color: '#CC0000' }}>
                    ${cartTotal.toFixed(2)}
                  </p>
                </div>
                <button
                  className="w-full text-white font-black tracking-widest uppercase text-xs py-3 transition-opacity hover:opacity-80"
                  style={{ background: '#CC0000', border: 'none', cursor: 'pointer' }}
                >
                  CHECKOUT
                </button>
                <p className="text-center text-xs mt-3" style={{ color: '#444' }}>
                  Contact us on Facebook to complete your order
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}