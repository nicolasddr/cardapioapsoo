'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { CartItem, generateCartItemId, cartItemsMatch, AppliedCoupon } from '@/src/types/cart'
import { Coupon } from '@/src/domain/entities/Coupon'

interface CartContextType {
  items: CartItem[]
  appliedCoupon: AppliedCoupon | null
  addToCart: (item: Omit<CartItem, 'id' | 'totalPrice'>) => void
  removeFromCart: (itemId: string) => void
  updateCartItem: (itemId: string, updates: Partial<CartItem>) => void
  getCartItems: () => CartItem[]
  getCartTotal: () => number
  getDiscount: () => number
  getTotal: () => number
  clearCart: () => void
  getCartItemsCount: () => number
  applyCoupon: (code: string) => Promise<{ success: boolean; message: string }>
  removeCoupon: () => void
  couponRemovedNotification: { show: boolean; code: string | null }
  clearCouponNotification: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'poo-cardapio-cart'
const COUPON_STORAGE_KEY = 'poo-cardapio-coupon'

function calculateItemTotal(
  productPrice: number,
  selectedOptions: CartItem['selectedOptions'],
  quantity: number
): number {
  const optionsTotal = selectedOptions.reduce(
    (sum, option) => sum + option.additionalPrice,
    0
  )
  return (productPrice + optionsTotal) * quantity
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [couponRemovedNotification, setCouponRemovedNotification] = useState<{ show: boolean; code: string | null }>({ show: false, code: null })
  const isInitialLoad = useRef(true)

  const clearCouponNotification = useCallback(() => {
    setCouponRemovedNotification({ show: false, code: null })
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(CART_STORAGE_KEY)
      const storedCoupon = localStorage.getItem(COUPON_STORAGE_KEY)
      
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          setItems(parsed)
          
          if (storedCoupon) {
            try {
              const parsedCoupon = JSON.parse(storedCoupon)
              validateCouponOnLoad(parsedCoupon, parsed)
            } catch {
              localStorage.removeItem(COUPON_STORAGE_KEY)
            }
          }
        } catch {
          localStorage.removeItem(CART_STORAGE_KEY)
        }
      } else if (storedCoupon) {
        localStorage.removeItem(COUPON_STORAGE_KEY)
      }
      isInitialLoad.current = false
    }
  }, [])

  const validateCouponOnLoad = useCallback(async (storedCoupon: AppliedCoupon, cartItems: CartItem[]) => {
    try {
      const coupon = await Coupon.validate(storedCoupon.code)
      if (coupon && coupon.isActive()) {
        const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
        const discountAmount = coupon.calculateDiscount(subtotal)
        setAppliedCoupon({
          code: coupon.code,
          discountType: coupon.getDiscountType(),
          discountValue: coupon.getDiscountValue(),
          discountAmount,
        })
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY)
        setAppliedCoupon(null)
        if (!isInitialLoad.current) {
          setCouponRemovedNotification({ show: true, code: storedCoupon.code })
        }
      }
    } catch {
      localStorage.removeItem(COUPON_STORAGE_KEY)
      setAppliedCoupon(null)
      if (!isInitialLoad.current) {
        setCouponRemovedNotification({ show: true, code: storedCoupon.code })
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (items.length >= 0) {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
      }
      if (appliedCoupon) {
        localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(appliedCoupon))
      } else {
        localStorage.removeItem(COUPON_STORAGE_KEY)
      }
    }
  }, [items, appliedCoupon])

  useEffect(() => {
    if (appliedCoupon && items.length > 0) {
      const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
      const coupon = new Coupon(
        '',
        appliedCoupon.code,
        appliedCoupon.discountType,
        appliedCoupon.discountValue,
        'Ativo',
        new Date(),
        new Date()
      )
      const discountAmount = coupon.calculateDiscount(subtotal)
      setAppliedCoupon({
        ...appliedCoupon,
        discountAmount,
      })
    }
  }, [items])

  const addToCart = useCallback((item: Omit<CartItem, 'id' | 'totalPrice'>) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((existing) =>
        cartItemsMatch(existing, item)
      )

      if (existingItem) {
        return prevItems.map((existing) =>
          existing.id === existingItem.id
            ? {
                ...existing,
                quantity: existing.quantity + item.quantity,
                totalPrice: calculateItemTotal(
                  existing.productPrice,
                  existing.selectedOptions,
                  existing.quantity + item.quantity
                ),
              }
            : existing
        )
      }

      const totalPrice = calculateItemTotal(
        item.productPrice,
        item.selectedOptions,
        item.quantity
      )

      const newItem: CartItem = {
        ...item,
        id: generateCartItemId(),
        totalPrice,
      }

      return [...prevItems, newItem]
    })
  }, [])

  const removeFromCart = useCallback((itemId: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== itemId))
  }, [])

  const updateCartItem = useCallback(
    (itemId: string, updates: Partial<CartItem>) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id !== itemId) return item

          const updated = { ...item, ...updates }

          if (
            updates.quantity !== undefined ||
            updates.selectedOptions !== undefined ||
            updates.productPrice !== undefined
          ) {
            updated.totalPrice = calculateItemTotal(
              updated.productPrice,
              updated.selectedOptions,
              updated.quantity
            )
          }

          return updated
        })
      )
    },
    []
  )

  const getCartItems = useCallback(() => items, [items])

  const getCartTotal = useCallback(() => {
    return items.reduce((sum, item) => sum + item.totalPrice, 0)
  }, [items])

  const getDiscount = useCallback(() => {
    if (!appliedCoupon) return 0
    return appliedCoupon.discountAmount
  }, [appliedCoupon])

  const getTotal = useCallback(() => {
    const subtotal = getCartTotal()
    const discount = getDiscount()
    return Math.max(0, subtotal - discount)
  }, [getCartTotal, getDiscount])

  const clearCart = useCallback(() => {
    setItems([])
    setAppliedCoupon(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CART_STORAGE_KEY)
      localStorage.removeItem(COUPON_STORAGE_KEY)
    }
  }, [])

  const getCartItemsCount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0)
  }, [items])

  const applyCoupon = useCallback(async (code: string) => {
    try {
      const coupon = await Coupon.validate(code)
      
      if (!coupon || !coupon.isActive()) {
        return {
          success: false,
          message: 'Cupom inválido ou expirado',
        }
      }

      const subtotal = getCartTotal()
      const discountAmount = coupon.calculateDiscount(subtotal)

      setAppliedCoupon({
        code: coupon.code,
        discountType: coupon.getDiscountType(),
        discountValue: coupon.getDiscountValue(),
        discountAmount,
      })

      return {
        success: true,
        message: `Cupom ${coupon.code} aplicado com sucesso!`,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Erro ao validar cupom. Tente novamente.',
      }
    }
  }, [getCartTotal])

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(COUPON_STORAGE_KEY)
    }
  }, [])

  return (
    <CartContext.Provider
      value={{
        items,
        appliedCoupon,
        addToCart,
        removeFromCart,
        updateCartItem,
        getCartItems,
        getCartTotal,
        getDiscount,
        getTotal,
        clearCart,
        getCartItemsCount,
        applyCoupon,
        removeCoupon,
        couponRemovedNotification,
        clearCouponNotification,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
