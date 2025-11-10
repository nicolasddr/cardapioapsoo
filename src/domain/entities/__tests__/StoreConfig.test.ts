import { StoreConfig } from '../StoreConfig'

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

describe('StoreConfig', () => {
  const storeConfig = new StoreConfig(
    'store-1',
    'Restaurante Teste',
    'https://example.com/logo.png',
    'https://example.com/cover.png',
    'Descrição do restaurante',
    'Seg-Sex: 11h-22h',
    new Date(),
    new Date()
  )

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getLogoUrl()', () => {
    it('should return logo URL when available', () => {
      expect(storeConfig.getLogoUrl()).toBe('https://example.com/logo.png')
    })

    it('should return null when logo URL is not available', () => {
      const configWithoutLogo = new StoreConfig(
        'store-1',
        'Restaurante',
        null,
        null,
        null,
        null,
        new Date(),
        new Date()
      )
      expect(configWithoutLogo.getLogoUrl()).toBeNull()
    })
  })

  describe('getCoverUrl()', () => {
    it('should return cover URL when available', () => {
      expect(storeConfig.getCoverUrl()).toBe('https://example.com/cover.png')
    })

    it('should return null when cover URL is not available', () => {
      const configWithoutCover = new StoreConfig(
        'store-1',
        'Restaurante',
        null,
        null,
        null,
        null,
        new Date(),
        new Date()
      )
      expect(configWithoutCover.getCoverUrl()).toBeNull()
    })
  })

  describe('getName()', () => {
    it('should return store name', () => {
      expect(storeConfig.getName()).toBe('Restaurante Teste')
    })
  })

  describe('getDescription()', () => {
    it('should return description when available', () => {
      expect(storeConfig.getDescription()).toBe('Descrição do restaurante')
    })

    it('should return null when description is not available', () => {
      const configWithoutDesc = new StoreConfig(
        'store-1',
        'Restaurante',
        null,
        null,
        null,
        null,
        new Date(),
        new Date()
      )
      expect(configWithoutDesc.getDescription()).toBeNull()
    })
  })

  describe('getOpeningHours()', () => {
    it('should return opening hours when available', () => {
      expect(storeConfig.getOpeningHours()).toBe('Seg-Sex: 11h-22h')
    })

    it('should return null when opening hours is not available', () => {
      const configWithoutHours = new StoreConfig(
        'store-1',
        'Restaurante',
        null,
        null,
        null,
        null,
        new Date(),
        new Date()
      )
      expect(configWithoutHours.getOpeningHours()).toBeNull()
    })
  })

  describe('getSettings()', () => {
    it('should fetch store settings from Supabase', async () => {
      const mockSettings = {
        id: 'store-1',
        name: 'Restaurante Teste',
        logo_url: 'https://example.com/logo.png',
        cover_url: 'https://example.com/cover.png',
        description: 'Descrição',
        opening_hours: 'Seg-Sex: 11h-22h',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockSettings,
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      const settings = await StoreConfig.getSettings()

      expect(supabaseMock.from).toHaveBeenCalledWith('store_settings')
      expect(settings).toBeInstanceOf(StoreConfig)
      expect(settings.getName()).toBe('Restaurante Teste')
      expect(settings.getLogoUrl()).toBe('https://example.com/logo.png')
    })

    it('should throw error when Supabase returns error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(StoreConfig.getSettings()).rejects.toThrow(
        'Error fetching store settings: Database error'
      )
    })

    it('should throw error when no settings found', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }

      supabaseMock.from.mockReturnValue(mockChain)

      await expect(StoreConfig.getSettings()).rejects.toThrow(
        'Store settings not found'
      )
    })
  })
})

