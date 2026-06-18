'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { MENU_ITEMS } from '@/lib/mockData'

export interface CartItem {
  id: string        // may be 'base-id--Option' for option variants
  name: string      // includes option label, e.g. 'Waakye Stew — Goat'
  price: number
  quantity: number
  unit: string
  note?: string     // the selected option, e.g. 'Goat'
}

export interface OrderDetails {
  fullName: string
  phone: string
  email: string
  eventType?: string
  guestCount: number
  fulfillmentType: 'delivery' | 'pickup'
  address: string
  distanceRange: string
  preferredDate: string
  preferredTime: string
  specialInstructions: string
  clientType?: 'regular' | 'corporate'
  orgName?: string
  contactPerson?: string
  billingEmail?: string
  poNumber?: string
  requestInvoice?: boolean
}

interface CartContextType {
  items: CartItem[]
  orderDetails: OrderDetails | null
  hydrated: boolean
  updateQuantity: (id: string, delta: number, option?: string) => void
  setQuantity: (id: string, qty: number, option?: string) => void
  saveOrderDetails: (details: OrderDetails) => void
  clearCart: () => void
  subtotal: number
  totalItems: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const savedItems = localStorage.getItem('edziban-cart')
      const savedOrder = localStorage.getItem('edziban-order')
      if (savedItems) setItems(JSON.parse(savedItems))
      if (savedOrder) setOrderDetails(JSON.parse(savedOrder))
    } catch {}
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem('edziban-cart', JSON.stringify(items))
  }, [items, hydrated])

  const updateQuantity = useCallback((id: string, delta: number, option?: string) => {
    setItems(prev => {
      const baseId = id.split('--')[0]
      const menuItem = MENU_ITEMS.find(m => m.id === baseId)
      if (!menuItem) return prev
      const cartId = option ? `${baseId}--${option}` : id
      const displayName = option ? `${menuItem.name} — ${option}` : menuItem.name
      const existing = prev.find(i => i.id === cartId)
      const currentQty = existing?.quantity ?? 0
      const newQty = Math.max(0, currentQty + delta)
      if (newQty === 0) return prev.filter(i => i.id !== cartId)
      if (existing) return prev.map(i => i.id === cartId ? { ...i, quantity: newQty } : i)
      return [...prev, { id: cartId, name: displayName, price: menuItem.price, quantity: newQty, unit: menuItem.unit, note: option }]
    })
  }, [])

  const setQuantity = useCallback((id: string, qty: number, option?: string) => {
    setItems(prev => {
      const baseId = id.split('--')[0]
      const menuItem = MENU_ITEMS.find(m => m.id === baseId)
      if (!menuItem) return prev
      const cartId = option ? `${baseId}--${option}` : id
      const displayName = option ? `${menuItem.name} — ${option}` : menuItem.name
      if (qty <= 0) return prev.filter(i => i.id !== cartId)
      const existing = prev.find(i => i.id === cartId)
      if (existing) return prev.map(i => i.id === cartId ? { ...i, quantity: qty } : i)
      return [...prev, { id: cartId, name: displayName, price: menuItem.price, quantity: qty, unit: menuItem.unit, note: option }]
    })
  }, [])

  const saveOrderDetails = useCallback((details: OrderDetails) => {
    setOrderDetails(details)
    localStorage.setItem('edziban-order', JSON.stringify(details))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    setOrderDetails(null)
    localStorage.removeItem('edziban-cart')
    localStorage.removeItem('edziban-order')
  }, [])

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, orderDetails, hydrated, updateQuantity, setQuantity, saveOrderDetails, clearCart, subtotal, totalItems }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
