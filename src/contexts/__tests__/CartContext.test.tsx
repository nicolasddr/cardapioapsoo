import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { CartProvider, useCart } from '../CartContext'
import { CartItem } from '@/src/types/cart'

describe('CartContext', () => {
  let localStorageMock: {
    getItem: jest.Mock
    setItem: jest.Mock
    removeItem: jest.Mock
    clear: jest.Mock
    store: Record<string, string>
  }

  beforeEach(() => {
    const store: Record<string, string> = {}
    localStorageMock = {
      getItem: jest.fn((key: string) => store[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        store[key] = value.toString()
      }),
      removeItem: jest.fn((key: string) => {
        delete store[key]
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key])
      }),
      store,
    }

    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
  })

  afterEach(() => {
    localStorageMock.clear()
    jest.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <CartProvider>{children}</CartProvider>
  )

  describe('addToCart', () => {
    it('should add new item to cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].productName).toBe('Hambúrguer')
      expect(result.current.items[0].quantity).toBe(1)
    })

    it('should increment quantity when adding identical item', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      const item = {
        productId: 'prod-1',
        productName: 'Hambúrguer',
        productPrice: 25.9,
        quantity: 1,
        selectedOptions: [],
        notes: '',
      }

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].quantity).toBe(1)

      act(() => {
        result.current.addToCart(item)
      })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].quantity).toBe(2)
    })

    it('should calculate total price correctly', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 2,
          selectedOptions: [
            {
              optionGroupId: 'group-1',
              optionGroupName: 'Adicionais',
              optionId: 'opt-1',
              optionName: 'Bacon',
              additionalPrice: 3.0,
            },
          ],
          notes: '',
        })
      })

      expect(result.current.items[0].totalPrice).toBe(57.8) // (25.9 + 3.0) * 2
    })

    it('should not match items with different options', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [
            {
              optionGroupId: 'group-1',
              optionGroupName: 'Tamanho',
              optionId: 'opt-1',
              optionName: 'Pequeno',
              additionalPrice: 0,
            },
          ],
          notes: '',
        })
      })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [
            {
              optionGroupId: 'group-1',
              optionGroupName: 'Tamanho',
              optionId: 'opt-2',
              optionName: 'Grande',
              additionalPrice: 5.0,
            },
          ],
          notes: '',
        })
      })

      expect(result.current.items).toHaveLength(2)
    })

    it('should not match items with different notes', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: 'Sem cebola',
        })
      })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: 'Com cebola',
        })
      })

      expect(result.current.items).toHaveLength(2)
    })
  })

  describe('removeFromCart', () => {
    it('should remove item from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      const itemId = result.current.items[0].id

      act(() => {
        result.current.removeFromCart(itemId)
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('updateCartItem', () => {
    it('should update item quantity', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      const itemId = result.current.items[0].id

      act(() => {
        result.current.updateCartItem(itemId, { quantity: 3 })
      })

      expect(result.current.items[0].quantity).toBe(3)
      expect(result.current.items[0].totalPrice).toBeCloseTo(77.7, 1) // 25.9 * 3
    })

    it('should recalculate total price when updating options', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      const itemId = result.current.items[0].id

      act(() => {
        result.current.updateCartItem(itemId, {
          selectedOptions: [
            {
              optionGroupId: 'group-1',
              optionGroupName: 'Adicionais',
              optionId: 'opt-1',
              optionName: 'Bacon',
              additionalPrice: 3.0,
            },
          ],
        })
      })

      expect(result.current.items[0].totalPrice).toBeCloseTo(28.9, 1) // 25.9 + 3.0
    })
  })

  describe('getCartItems', () => {
    it('should return all cart items', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
        result.current.addToCart({
          productId: 'prod-2',
          productName: 'Pizza',
          productPrice: 35.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      const items = result.current.getCartItems()
      expect(items).toHaveLength(2)
    })
  })

  describe('getCartTotal', () => {
    it('should return zero for empty cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })
      expect(result.current.getCartTotal()).toBe(0)
    })

    it('should return sum of all item totals', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
        result.current.addToCart({
          productId: 'prod-2',
          productName: 'Pizza',
          productPrice: 35.9,
          quantity: 2,
          selectedOptions: [],
          notes: '',
        })
      })

      const total = result.current.getCartTotal()
      expect(total).toBeCloseTo(97.7, 1) // 25.9 + (35.9 * 2) = 97.7
    })
  })

  describe('clearCart', () => {
    it('should remove all items from cart', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      act(() => {
        result.current.clearCart()
      })

      expect(result.current.items).toHaveLength(0)
    })
  })

  describe('getCartItemsCount', () => {
    it('should return total quantity of all items', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 2,
          selectedOptions: [],
          notes: '',
        })
        result.current.addToCart({
          productId: 'prod-2',
          productName: 'Pizza',
          productPrice: 35.9,
          quantity: 3,
          selectedOptions: [],
          notes: '',
        })
      })

      expect(result.current.getCartItemsCount()).toBe(5) // 2 + 3
    })
  })

  describe('localStorage persistence', () => {
    it('should load cart from localStorage on mount', () => {
      const savedCart: CartItem[] = [
        {
          id: 'saved-id',
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
          totalPrice: 25.9,
        },
      ]

      localStorageMock.store['poo-cardapio-cart'] = JSON.stringify(savedCart)
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedCart))

      const { result } = renderHook(() => useCart(), { wrapper })

      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].productName).toBe('Hambúrguer')
    })

    it('should save cart to localStorage when items change', () => {
      const { result } = renderHook(() => useCart(), { wrapper })

      act(() => {
        result.current.addToCart({
          productId: 'prod-1',
          productName: 'Hambúrguer',
          productPrice: 25.9,
          quantity: 1,
          selectedOptions: [],
          notes: '',
        })
      })

      // Wait for useEffect to run
      expect(localStorageMock.setItem).toHaveBeenCalled()
      const calls = localStorageMock.setItem.mock.calls
      const lastCall = calls[calls.length - 1]
      if (lastCall && lastCall[1]) {
        const savedData = JSON.parse(lastCall[1])
        expect(savedData.length).toBeGreaterThanOrEqual(1)
        expect(savedData.find((item: CartItem) => item.productName === 'Hambúrguer')).toBeDefined()
      }
    })

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json')

      const { result } = renderHook(() => useCart(), { wrapper })

      expect(result.current.items).toHaveLength(0)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })
  })

  describe('useCart hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderHook(() => useCart())
      }).toThrow('useCart must be used within a CartProvider')

      consoleSpy.mockRestore()
    })
  })
})

