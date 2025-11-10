import { Category } from '../Category'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => {
  const mockSupabase = {
    from: jest.fn(),
  }
  return {
    supabase: mockSupabase,
  }
})

import { supabase as mockSupabase } from '@/lib/supabase/client'

const supabaseMock = mockSupabase as unknown as {
  from: jest.Mock
}

describe('Category', () => {
  const category = new Category(
    'cat-1',
    'Entradas',
    1,
    true,
    new Date(),
    new Date()
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isActive()', () => {
    it('should return true when active is true', () => {
      expect(category.isActive()).toBe(true)
    })

    it('should return false when active is false', () => {
      const inactiveCategory = new Category(
        'cat-2',
        'Inativa',
        2,
        false,
        new Date(),
        new Date()
      )
      expect(inactiveCategory.isActive()).toBe(false)
    })
  })

  describe('hasActiveProducts()', () => {
    it('should return true when category has active products', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [{ id: 'prod-1' }],
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const hasProducts = await category.hasActiveProducts()

      expect(supabaseMock.from).toHaveBeenCalledWith('products')
      expect(mockChain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'Ativo')
      expect(hasProducts).toBe(true)
    })

    it('should return false when category has no active products', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const hasProducts = await category.hasActiveProducts()

      expect(hasProducts).toBe(false)
    })

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(category.hasActiveProducts()).rejects.toThrow(
        'Error checking active products: Database error'
      )
    })
  })

  describe('getProducts()', () => {
    it('should fetch active products for category', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Produto 1',
          price: 25.9,
          category_id: 'cat-1',
          status: 'Ativo',
          order: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockProducts,
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const products = await category.getProducts()

      expect(supabaseMock.from).toHaveBeenCalledWith('products')
      expect(mockChain.eq).toHaveBeenCalledWith('category_id', 'cat-1')
      expect(mockChain.eq).toHaveBeenCalledWith('status', 'Ativo')
      expect(products).toHaveLength(1)
      expect(products[0].name).toBe('Produto 1')
    })

    it('should return empty array when no products found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const products = await category.getProducts()

      expect(products).toEqual([])
    })

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(category.getProducts()).rejects.toThrow(
        'Error fetching products: Database error'
      )
    })
  })

  describe('getAllActive()', () => {
    it('should fetch all active categories', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Entradas',
          order: 1,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'cat-2',
          name: 'Pratos Principais',
          order: 2,
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      }

      // Mock the second order() call
      mockChain.order.mockReturnValueOnce(mockChain).mockReturnValueOnce({
        data: mockCategories,
        error: null,
      })

      supabaseMock.from.mockReturnValue(mockChain)

      const categories = await Category.getAllActive()

      expect(supabaseMock.from).toHaveBeenCalledWith('categories')
      expect(mockChain.eq).toHaveBeenCalledWith('active', true)
      expect(categories).toHaveLength(2)
      expect(categories[0].name).toBe('Entradas')
      expect(categories[1].name).toBe('Pratos Principais')
    })

    it('should return empty array when no active categories found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      }

      mockChain.order.mockReturnValueOnce(mockChain).mockReturnValueOnce({
        data: [],
        error: null,
      })

      supabaseMock.from.mockReturnValue(mockChain)

      const categories = await Category.getAllActive()

      expect(categories).toEqual([])
    })

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
      }

      mockChain.order.mockReturnValueOnce(mockChain).mockReturnValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(Category.getAllActive()).rejects.toThrow(
        'Error fetching categories: Database error'
      )
    })
  })
})

