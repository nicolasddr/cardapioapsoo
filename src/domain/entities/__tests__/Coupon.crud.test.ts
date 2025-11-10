import { Coupon, CouponValidationError, CreateCouponPayload, UpdateCouponPayload } from '../Coupon'

// Mock do Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('Coupon CRUD Operations', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('deve retornar todos os cupons', async () => {
      const mockData = [
        {
          id: '1',
          code: 'PROMO10',
          discount_type: 'percentage',
          discount_value: 10,
          status: 'Ativo',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      })

      const coupons = await Coupon.getAll(mockSupabaseClient as any)

      expect(coupons).toHaveLength(1)
      expect(coupons[0].code).toBe('PROMO10')
      expect(coupons[0].discountType).toBe('percentage')
    })

    it('deve lançar erro em caso de timeout', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 35000))
          ),
        }),
      })

      await expect(Coupon.getAll(mockSupabaseClient as any)).rejects.toThrow('TIMEOUT')
    }, 40000)
  })

  describe('create', () => {
    it('deve criar um cupom com código normalizado (uppercase)', async () => {
      const payload: CreateCouponPayload = {
        code: 'promo10',
        discountType: 'percentage',
        discountValue: 10,
        status: 'Ativo',
      }

      const mockData = {
        id: '1',
        code: 'PROMO10',
        discount_type: 'percentage',
        discount_value: 10,
        status: 'Ativo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const coupon = await Coupon.create(payload, mockSupabaseClient as any)

      expect(coupon.code).toBe('PROMO10')
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupons')
    })

    it('deve validar código obrigatório', async () => {
      const payload: CreateCouponPayload = {
        code: '',
        discountType: 'percentage',
        discountValue: 10,
        status: 'Ativo',
      }

      await expect(Coupon.create(payload, mockSupabaseClient as any)).rejects.toThrow(
        CouponValidationError
      )
    })

    it('deve validar percentual entre 1 e 100', async () => {
      const payload: CreateCouponPayload = {
        code: 'PROMO',
        discountType: 'percentage',
        discountValue: 150,
        status: 'Ativo',
      }

      await expect(Coupon.create(payload, mockSupabaseClient as any)).rejects.toThrow(
        CouponValidationError
      )
    })

    it('deve validar desconto fixo maior que zero', async () => {
      const payload: CreateCouponPayload = {
        code: 'PROMO',
        discountType: 'fixed',
        discountValue: 0,
        status: 'Ativo',
      }

      await expect(Coupon.create(payload, mockSupabaseClient as any)).rejects.toThrow(
        CouponValidationError
      )
    })

    it('deve lançar erro específico para código duplicado', async () => {
      const payload: CreateCouponPayload = {
        code: 'PROMO10',
        discountType: 'percentage',
        discountValue: 10,
        status: 'Ativo',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'duplicate key' },
            }),
          }),
        }),
      })

      await expect(Coupon.create(payload, mockSupabaseClient as any)).rejects.toThrow(
        'Código de cupom já existe'
      )
    })
  })

  describe('update', () => {
    it('deve atualizar um cupom', async () => {
      const payload: UpdateCouponPayload = {
        discountValue: 15,
      }

      const mockData = {
        id: '1',
        code: 'PROMO10',
        discount_type: 'percentage',
        discount_value: 15,
        status: 'Ativo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      })

      const coupon = await Coupon.update('1', payload, mockSupabaseClient as any)

      expect(coupon.discountValue).toBe(15)
    })

    it('deve normalizar código ao atualizar', async () => {
      const payload: UpdateCouponPayload = {
        code: 'promo20',
      }

      const mockData = {
        id: '1',
        code: 'PROMO20',
        discount_type: 'percentage',
        discount_value: 10,
        status: 'Ativo',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockData,
                error: null,
              }),
            }),
          }),
        }),
      })

      const coupon = await Coupon.update('1', payload, mockSupabaseClient as any)

      expect(coupon.code).toBe('PROMO20')
    })
  })

  describe('delete (soft delete)', () => {
    it('deve desativar cupom (soft delete)', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      await expect(Coupon.delete('1', mockSupabaseClient as any)).resolves.not.toThrow()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('coupons')
    })

    it('deve lançar erro em caso de timeout', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 35000))
          ),
        }),
      })

      await expect(Coupon.delete('1', mockSupabaseClient as any)).rejects.toThrow('TIMEOUT')
    }, 40000)
  })
})

