import { SupabaseClient } from '@supabase/supabase-js'

export interface Order {
  id: string
  order_type: 'Retirada' | 'Consumo no Local'
  customer_name: string | null
  customer_phone: string | null
  table_number: number | null
  status: 'Recebido' | 'Em Preparo' | 'Pronto'
  subtotal: number
  discount: number
  total: number
  coupon_code: string | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  product_price: number
  quantity: number
  notes: string | null
  total_price: number
  options: OrderItemOption[]
}

export interface OrderItemOption {
  id: string
  order_item_id: string
  option_group_id: string
  option_group_name: string
  option_id: string
  option_name: string
  additional_price: number
}

const validTransitions: Record<string, string[]> = {
  'Recebido': ['Em Preparo'],
  'Em Preparo': ['Pronto'],
  'Pronto': []
}

export class OrderService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Valida se uma transição de status é válida
   */
  isValidTransition(currentStatus: string, newStatus: string): boolean {
    const allowedStatuses = validTransitions[currentStatus] || []
    return allowedStatuses.includes(newStatus)
  }

  /**
   * Atualiza o status de um pedido
   */
  async updateStatus(
    orderId: string,
    newStatus: 'Recebido' | 'Em Preparo' | 'Pronto'
  ): Promise<Order> {
    console.log('electron-orders:updateStatus-start', { orderId, newStatus })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = async (): Promise<Order> => {
      // Buscar pedido atual para validar transição
      const { data: currentOrder, error: fetchError } = await this.supabase
        .from('orders')
        .select('status')
        .eq('id', orderId)
        .maybeSingle()

      if (fetchError) {
        console.error('electron-orders:updateStatus-fetchError', fetchError)
        throw new Error(`Erro ao buscar pedido: ${fetchError.message}`)
      }

      if (!currentOrder) {
        throw new Error('Pedido não encontrado')
      }

      // Validar transição
      if (!this.isValidTransition(currentOrder.status, newStatus)) {
        throw new Error(
          `Transição inválida: não é possível mudar de '${currentOrder.status}' para '${newStatus}'`
        )
      }

      // Atualizar status
      const { data: updatedData, error: updateError } = await this.supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId)
        .select()
        .maybeSingle()

      if (updateError) {
        console.error('electron-orders:updateStatus-updateError', updateError)
        throw new Error(`Erro ao atualizar status: ${updateError.message}`)
      }

      if (!updatedData) {
        throw new Error('Pedido não encontrado após atualização')
      }

      const order: Order = {
        id: updatedData.id,
        order_type: updatedData.order_type,
        customer_name: updatedData.customer_name,
        customer_phone: updatedData.customer_phone,
        table_number: updatedData.table_number,
        status: updatedData.status,
        subtotal: Number(updatedData.subtotal),
        discount: Number(updatedData.discount),
        total: Number(updatedData.total),
        coupon_code: updatedData.coupon_code,
        created_at: updatedData.created_at,
        updated_at: updatedData.updated_at
      }

      try {
        const channel = this.supabase.channel(`orders:${orderId}`)
        const response = await channel.send({
          type: 'broadcast',
          event: 'status_updated',
          payload: {
            orderId,
            newStatus,
            updatedAt: new Date().toISOString()
          }
        })

        if (response !== 'ok') {
          throw new Error('Broadcast failed')
        }

        await channel.unsubscribe()
        console.log('electron-orders:updateStatus-broadcastSuccess', { orderId })
      } catch (broadcastError) {
        console.warn('electron-orders:updateStatus-broadcastFailed', {
          orderId,
          error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error'
        })
        // Não bloquear atualização se broadcast falhar
      }

      console.log('electron-orders:updateStatus-success', { orderId, newStatus })
      return order
    }

    try {
      return await Promise.race([updatePromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('electron-orders:updateStatus-timeout', { orderId })
        throw new Error('TIMEOUT')
      }
      console.error('electron-orders:updateStatus-error', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }


  async getOrderDetails(orderId: string): Promise<{ order: Order; items: OrderItem[] }> {
    console.log('electron-orders:getOrderDetails-start', { orderId })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<{ order: Order; items: OrderItem[] }> => {
      // Buscar pedido
      const { data: orderData, error: orderError } = await this.supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (orderError) {
        throw new Error(`Erro ao buscar pedido: ${orderError.message}`)
      }

      if (!orderData) {
        throw new Error('Pedido não encontrado')
      }

      const order: Order = {
        id: orderData.id,
        order_type: orderData.order_type,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        table_number: orderData.table_number,
        status: orderData.status,
        subtotal: Number(orderData.subtotal),
        discount: Number(orderData.discount),
        total: Number(orderData.total),
        coupon_code: orderData.coupon_code,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at
      }

      // Buscar itens do pedido
      const { data: itemsData, error: itemsError } = await this.supabase
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        throw new Error(`Erro ao buscar itens: ${itemsError.message}`)
      }

      // Buscar opcionais de cada item
      const items: OrderItem[] = await Promise.all(
        (itemsData || []).map(async (item) => {
          const { data: optionsData, error: optionsError } = await this.supabase
            .from('order_item_options')
            .select('*')
            .eq('order_item_id', item.id)
            .order('created_at', { ascending: true })

          if (optionsError) {
            console.warn('electron-orders:getOrderDetails-optionsError', {
              itemId: item.id,
              error: optionsError.message
            })
          }

          const options: OrderItemOption[] = (optionsData || []).map((opt) => ({
            id: opt.id,
            order_item_id: opt.order_item_id,
            option_group_id: opt.option_group_id,
            option_group_name: opt.option_group_name,
            option_id: opt.option_id,
            option_name: opt.option_name,
            additional_price: Number(opt.additional_price)
          }))

          return {
            id: item.id,
            order_id: item.order_id,
            product_id: item.product_id,
            product_name: item.product_name,
            product_price: Number(item.product_price),
            quantity: item.quantity,
            notes: item.notes,
            total_price: Number(item.total_price),
            options
          }
        })
      )

      console.log('electron-orders:getOrderDetails-success', {
        orderId,
        itemsCount: items.length
      })

      return { order, items }
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('electron-orders:getOrderDetails-timeout', { orderId })
        throw new Error('TIMEOUT')
      }
      console.error('electron-orders:getOrderDetails-error', {
        orderId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  
  async getOrdersByStatus(
    status: 'Recebido' | 'Em Preparo' | 'Pronto',
    limit: number = 50
  ): Promise<Order[]> {
    console.log('electron-orders:getOrdersByStatus-start', { status, limit })

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<Order[]> => {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

      const { data, error } = await this.supabase
        .from('orders')
        .select('*')
        .eq('status', status)
        .gte('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: false })
        .order('total', { ascending: false })
        .limit(limit)

      if (error) {
        throw new Error(`Erro ao buscar pedidos: ${error.message}`)
      }

      const orders: Order[] = (data || []).map((row) => ({
        id: row.id,
        order_type: row.order_type,
        customer_name: row.customer_name,
        customer_phone: row.customer_phone,
        table_number: row.table_number,
        status: row.status,
        subtotal: Number(row.subtotal),
        discount: Number(row.discount),
        total: Number(row.total),
        coupon_code: row.coupon_code,
        created_at: row.created_at,
        updated_at: row.updated_at
      }))

      console.log('electron-orders:getOrdersByStatus-success', {
        status,
        count: orders.length
      })

      return orders
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('electron-orders:getOrdersByStatus-timeout', { status })
        throw new Error('TIMEOUT')
      }
      console.error('electron-orders:getOrdersByStatus-error', {
        status,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }
}

