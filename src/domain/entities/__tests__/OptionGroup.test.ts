import { OptionGroup } from '../OptionGroup'
import { Option } from '../Option'

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

describe('OptionGroup', () => {
  const optionGroup = new OptionGroup(
    'test-id',
    'Tamanho',
    'single',
    new Date(),
    new Date()
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getName()', () => {
    it('should return the group name', () => {
      expect(optionGroup.getName()).toBe('Tamanho')
    })
  })

  describe('getSelectionType()', () => {
    it('should return "single" for single selection', () => {
      expect(optionGroup.getSelectionType()).toBe('single')
    })

    it('should return "multiple" for multiple selection', () => {
      const multipleGroup = new OptionGroup(
        'test-id-2',
        'Adicionais',
        'multiple',
        new Date(),
        new Date()
      )
      expect(multipleGroup.getSelectionType()).toBe('multiple')
    })
  })

  describe('getOptions()', () => {
    it('should fetch options from Supabase', async () => {
      const mockOptions = [
        {
          id: 'opt-1',
          name: 'Pequeno',
          additional_price: 0,
          option_group_id: 'test-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 'opt-2',
          name: 'Grande',
          additional_price: 5.0,
          option_group_id: 'test-id',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockOptions,
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const options = await optionGroup.getOptions()

      expect(supabaseMock.from).toHaveBeenCalledWith('options')
      expect(mockChain.eq).toHaveBeenCalledWith('option_group_id', 'test-id')
      expect(options).toHaveLength(2)
      expect(options[0]).toBeInstanceOf(Option)
      expect(options[0].getName()).toBe('Pequeno')
    })

    it('should return empty array when no options found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const options = await optionGroup.getOptions()

      expect(options).toEqual([])
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

      await expect(optionGroup.getOptions()).rejects.toThrow(
        'Error fetching options: Database error'
      )
    })
  })

  describe('getByProductId()', () => {
    it('should return empty array when product has no option groups', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const groups = await OptionGroup.getByProductId('non-existent-id')

      expect(supabaseMock.from).toHaveBeenCalledWith('product_option_links')
      expect(mockChain.eq).toHaveBeenCalledWith('product_id', 'non-existent-id')
      expect(groups).toEqual([])
    })

    it('should return option groups for product', async () => {
      const mockData = [
        {
          option_group_id: 'group-1',
          option_groups: {
            id: 'group-1',
            name: 'Tamanho',
            selection_type: 'single',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          option_group_id: 'group-2',
          option_groups: {
            id: 'group-2',
            name: 'Adicionais',
            selection_type: 'multiple',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
      ]

      supabaseMock.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({ single: jest.fn().mockResolvedValue({ data: mockData, error: null }) }),
        }),
      })

      const groups = await OptionGroup.getByProductId('product-id')

      expect(groups).toHaveLength(2)
      expect(groups[0]).toBeInstanceOf(OptionGroup)
      expect(groups[0].getName()).toBe('Tamanho')
      expect(groups[0].getSelectionType()).toBe('single')
      expect(groups[1].getName()).toBe('Adicionais')
      expect(groups[1].getSelectionType()).toBe('multiple')
    })

    it('should filter out null groups when option_groups is missing', async () => {
      const mockData = [
        {
          option_group_id: 'group-1',
          option_groups: {
            id: 'group-1',
            name: 'Tamanho',
            selection_type: 'single',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        },
        {
          option_group_id: 'group-2',
          option_groups: null,
        },
      ]

      supabaseMock.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockData, error: null })
          }),
        }),
      })

      const groups = await OptionGroup.getByProductId('product-id')

      expect(groups).toHaveLength(1)
      expect(groups[0].getName()).toBe('Tamanho')
    })

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(OptionGroup.getByProductId('product-id')).rejects.toThrow(
        'Error fetching option groups: Database error'
      )
    })
  })
})

