import { Order, OrderFilters, OrderValidationError } from '../Order'

// Mock do Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('Order Admin Operations', () => {
  const mockSupabaseClient = {
    from: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('deve retornar todos os pedidos sem filtros', async () => {
      const mockData = [
        {
          id: '1',
          order_type: 'Retirada',
          customer_name: 'João Silva',
          customer_phone: '11999999999',
          table_number: null,
          status: 'Recebido',
          subtotal: 50,
          discount: 0,
          total: 50,
          coupon_code: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockData,
              error: null,
            }),
          }),
        }),
      })

      const orders = await Order.getAll({}, mockSupabaseClient as any)

      expect(orders).toHaveLength(1)
      expect(orders[0].id).toBe('1')
      expect(orders[0].orderType).toBe('Retirada')
      expect(orders[0].status).toBe('Recebido')
    })

    it('deve filtrar por status', async () => {
      const mockData = [
        {
          id: '1',
          order_type: 'Retirada',
          customer_name: 'João Silva',
          customer_phone: '11999999999',
          table_number: null,
          status: 'Em Preparo',
          subtotal: 50,
          discount: 0,
          total: 50,
          coupon_code: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const eqMock = jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: mockData,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: eqMock,
        }),
      })

      const filters: OrderFilters = { status: 'Em Preparo' }
      const orders = await Order.getAll(filters, mockSupabaseClient as any)

      expect(eqMock).toHaveBeenCalledWith('status', 'Em Preparo')
      expect(orders).toHaveLength(1)
      expect(orders[0].status).toBe('Em Preparo')
    })

    it('deve lançar erro em caso de timeout', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockImplementation(
              () => new Promise((resolve) => setTimeout(resolve, 35000))
            ),
          }),
        }),
      })

      await expect(Order.getAll({}, mockSupabaseClient as any)).rejects.toThrow('TIMEOUT')
    }, 40000)
  })

  describe('updateStatus', () => {
    it('deve atualizar status de Recebido para Em Preparo', async () => {
      const currentOrderData = {
        id: '1',
        order_type: 'Retirada',
        customer_name: 'João Silva',
        customer_phone: '11999999999',
        table_number: null,
        status: 'Recebido',
        subtotal: 50,
        discount: 0,
        total: 50,
        coupon_code: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const updatedOrderData = { ...currentOrderData, status: 'Em Preparo' }

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: currentOrderData,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: updatedOrderData,
                error: null,
              }),
            }),
          }),
        }),
      })

      const order = await Order.updateStatus('1', 'Em Preparo', mockSupabaseClient as any)

      expect(order.status).toBe('Em Preparo')
    })

    it('deve lançar erro para transição inválida (Pronto para Recebido)', async () => {
      const currentOrderData = {
        id: '1',
        order_type: 'Retirada',
        customer_name: 'João Silva',
        customer_phone: '11999999999',
        table_number: null,
        status: 'Pronto',
        subtotal: 50,
        discount: 0,
        total: 50,
        coupon_code: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: currentOrderData,
              error: null,
            }),
          }),
        }),
      })

      await expect(
        Order.updateStatus('1', 'Recebido', mockSupabaseClient as any)
      ).rejects.toThrow(OrderValidationError)
    })

    it('deve retornar pedido sem alteração se status for o mesmo', async () => {
      const currentOrderData = {
        id: '1',
        order_type: 'Retirada',
        customer_name: 'João Silva',
        customer_phone: '11999999999',
        table_number: null,
        status: 'Recebido',
        subtotal: 50,
        discount: 0,
        total: 50,
        coupon_code: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: currentOrderData,
              error: null,
            }),
          }),
        }),
      })

      const order = await Order.updateStatus('1', 'Recebido', mockSupabaseClient as any)

      expect(order.status).toBe('Recebido')
    })
  })

  describe('getOrderItems', () => {
    it('deve retornar itens do pedido com opcionais', async () => {
      const mockItems = [
        {
          id: 'item-1',
          order_id: 'order-1',
          product_id: 'prod-1',
          product_name: 'Pizza Margherita',
          product_price: 30,
          quantity: 2,
          notes: 'Sem cebola',
          total_price: 60,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockOptions = [
        {
          id: 'opt-1',
          order_item_id: 'item-1',
          option_group_id: 'group-1',
          option_group_name: 'Borda',
          option_id: 'opt-1',
          option_name: 'Catupiry',
          additional_price: 5,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockItems,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockOptions,
            error: null,
          }),
        }),
      })

      const items = await Order.getOrderItems('order-1', mockSupabaseClient as any)

      expect(items).toHaveLength(1)
      expect(items[0].productName).toBe('Pizza Margherita')
      expect(items[0].selectedOptions).toHaveLength(1)
      expect(items[0].selectedOptions[0].optionName).toBe('Catupiry')
    })

    it('deve retornar array vazio se pedido não tiver itens', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const items = await Order.getOrderItems('order-1', mockSupabaseClient as any)

      expect(items).toHaveLength(0)
    })
  })
})

