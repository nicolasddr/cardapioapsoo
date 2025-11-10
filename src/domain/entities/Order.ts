import { CartItem } from '@/src/types/cart'
import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface CustomerInfo {
  name?: string
  phone?: string
  tableNumber?: number
}

export interface OrderFilters {
  status?: 'Recebido' | 'Em Preparo' | 'Pronto'
  orderType?: 'Retirada' | 'Consumo no Local'
  startDate?: string
  endDate?: string
  limit?: number
}

export interface CustomerSummary {
  name: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: Date
  lastOrderStatus: 'Recebido' | 'Em Preparo' | 'Pronto'
}

export interface MetricsSummary {
  totalOrders: number
  totalRevenue: number
  averageOrdersPerDay?: number
}

export interface TopProduct {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
  position: number
}

export interface OrderItem {
  id: string
  productId: string
  productName: string
  productPrice: number
  quantity: number
  notes: string | null
  totalPrice: number
  selectedOptions: OrderItemOption[]
}

export interface OrderItemOption {
  id: string
  optionGroupId: string
  optionGroupName: string
  optionId: string
  optionName: string
  additionalPrice: number
}

export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderValidationError'
  }
}

const validTransitions: Record<string, string[]> = {
  'Recebido': ['Em Preparo'],
  'Em Preparo': ['Pronto'],
  'Pronto': []
}

export class Order {
  constructor(
    public id: string,
    public orderType: 'Retirada' | 'Consumo no Local',
    public customerName: string | null,
    public customerPhone: string | null,
    public tableNumber: number | null,
    public status: 'Recebido' | 'Em Preparo' | 'Pronto',
    public subtotal: number,
    public discount: number,
    public total: number,
    public couponCode: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  getStatus(): string {
    return this.status
  }

  getTotal(): number {
    return this.total
  }

  getOrderType(): 'Retirada' | 'Consumo no Local' {
    return this.orderType
  }

  static async create(
    cartItems: CartItem[],
    customerInfo: CustomerInfo,
    orderType: 'Retirada' | 'Consumo no Local',
    appliedCoupon: { code: string; discountType: string; discountValue: number } | null
  ): Promise<Order> {
    if (cartItems.length === 0) {
      throw new Error('Carrinho vazio')
    }

    const subtotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0)
    const discount = appliedCoupon
      ? appliedCoupon.discountType === 'percentage'
        ? (subtotal * appliedCoupon.discountValue) / 100
        : appliedCoupon.discountValue
      : 0
    const total = Math.max(0, subtotal - discount)

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createOrderPromise = async (): Promise<Order> => {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_type: orderType,
          customer_name: orderType === 'Retirada' ? customerInfo.name : null,
          customer_phone: orderType === 'Retirada' ? customerInfo.phone : null,
          table_number: orderType === 'Consumo no Local' ? customerInfo.tableNumber : null,
          status: 'Recebido',
          subtotal,
          discount,
          total,
          coupon_code: appliedCoupon?.code || null,
        })
        .select()
        .single()

      if (orderError || !orderData) {
        throw new Error(`Erro ao criar pedido: ${orderError?.message || 'Erro desconhecido'}`)
      }

      const order = new Order(
        orderData.id,
        orderData.order_type,
        orderData.customer_name,
        orderData.customer_phone,
        orderData.table_number,
        orderData.status,
        Number(orderData.subtotal),
        Number(orderData.discount),
        Number(orderData.total),
        orderData.coupon_code,
        new Date(orderData.created_at),
        new Date(orderData.updated_at)
      )

      for (const cartItem of cartItems) {
        const { data: itemData, error: itemError } = await supabase
          .from('order_items')
          .insert({
            order_id: order.id,
            product_id: cartItem.productId,
            product_name: cartItem.productName,
            product_price: cartItem.productPrice,
            quantity: cartItem.quantity,
            notes: cartItem.notes || null,
            total_price: cartItem.totalPrice,
          })
          .select()
          .single()

        if (itemError || !itemData) {
          await supabase.from('orders').delete().eq('id', order.id)
          throw new Error(`Erro ao criar item: ${itemError?.message || 'Erro desconhecido'}`)
        }

        if (cartItem.selectedOptions.length > 0) {
          for (const option of cartItem.selectedOptions) {
            const { error: optionError } = await supabase
              .from('order_item_options')
              .insert({
                order_item_id: itemData.id,
                option_group_id: option.optionGroupId,
                option_group_name: option.optionGroupName,
                option_id: option.optionId,
                option_name: option.optionName,
                additional_price: option.additionalPrice,
              })

            if (optionError) {
              await supabase.from('orders').delete().eq('id', order.id)
              throw new Error(`Erro ao criar opcional: ${optionError.message}`)
            }
          }
        }
      }

      return order
    }

    try {
      const order = await Promise.race([createOrderPromise(), timeoutPromise])
      return order
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new Error('TIMEOUT')
      }
      throw error
    }
  }

  static async findById(id: string): Promise<Order | null> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const findOrderPromise = async (): Promise<Order | null> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return null
      }

      return new Order(
        data.id,
        data.order_type,
        data.customer_name,
        data.customer_phone,
        data.table_number,
        data.status,
        Number(data.subtotal),
        Number(data.discount),
        Number(data.total),
        data.coupon_code,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    }

    try {
      const order = await Promise.race([findOrderPromise(), timeoutPromise])
      return order
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new Error('TIMEOUT')
      }
      throw error
    }
  }

  static async findByPhone(phone: string): Promise<Order[]> {
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const findOrdersPromise = async (): Promise<Order[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .in('status', ['Recebido', 'Em Preparo'])
        .order('created_at', { ascending: false })

      if (error || !data) {
        return []
      }

      const { data: readyOrders, error: readyError } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_phone', phone)
        .eq('status', 'Pronto')
        .gte('created_at', twoHoursAgo.toISOString())
        .order('created_at', { ascending: false })

      if (!readyError && readyOrders) {
        data.push(...readyOrders)
      }

      const orders = data.map(
        (row) =>
          new Order(
            row.id,
            row.order_type,
            row.customer_name,
            row.customer_phone,
            row.table_number,
            row.status,
            Number(row.subtotal),
            Number(row.discount),
            Number(row.total),
            row.coupon_code,
            new Date(row.created_at),
            new Date(row.updated_at)
          )
      )

      return orders.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    }

    try {
      const orders = await Promise.race([findOrdersPromise(), timeoutPromise])
      return orders
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        throw new Error('TIMEOUT')
      }
      throw error
    }
  }

  static async getAll(filters: OrderFilters = {}, client?: SupabaseClient): Promise<Order[]> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<Order[]> => {
      let query = db
        .from('orders')
        .select('*')

      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.orderType) {
        query = query.eq('order_type', filters.orderType)
      }
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate)
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate)
      }

      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(filters.limit || 50)

      if (error) {
        throw new Error(error.message)
      }

      if (!data) {
        return []
      }

      return data.map(
        (row) =>
          new Order(
            row.id,
            row.order_type,
            row.customer_name,
            row.customer_phone,
            row.table_number,
            row.status,
            Number(row.subtotal),
            Number(row.discount),
            Number(row.total),
            row.coupon_code,
            new Date(row.created_at),
            new Date(row.updated_at)
          )
      )
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-orders:getAll-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-orders:getAll-error', error)
      throw error
    }
  }

  static async updateStatus(
    orderId: string,
    newStatus: 'Recebido' | 'Em Preparo' | 'Pronto',
    client?: SupabaseClient
  ): Promise<Order> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = async (): Promise<Order> => {
      // Buscar pedido atual
      const { data: currentOrder, error: fetchError } = await db
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (fetchError) {
        throw new Error(fetchError.message || 'Erro ao buscar pedido')
      }

      if (!currentOrder) {
        throw new Error('Pedido não encontrado')
      }

      const currentStatus = currentOrder.status

      // Validar transição
      if (currentStatus === newStatus) {
        // Noop, mas sem erro
        return new Order(
          currentOrder.id,
          currentOrder.order_type,
          currentOrder.customer_name,
          currentOrder.customer_phone,
          currentOrder.table_number,
          currentOrder.status,
          Number(currentOrder.subtotal),
          Number(currentOrder.discount),
          Number(currentOrder.total),
          currentOrder.coupon_code,
          new Date(currentOrder.created_at),
          new Date(currentOrder.updated_at)
        )
      }

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new OrderValidationError('Transição de status inválida')
      }

      // Atualizar status (sem select, pois RLS pode bloquear)
      const { error: updateError, count, data: updateData } = await db
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)
        .select('id, status') // Tentar retornar pelo menos alguns campos para debug

      if (updateError) {
        console.error('admin-orders:updateStatus-updateError', {
          orderId,
          newStatus,
          error: updateError,
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
        })
        throw new Error(updateError.message || 'Erro ao atualizar status')
      }

      console.log('admin-orders:updateStatus-updateSuccess', {
        orderId,
        newStatus,
        rowsUpdated: count,
        updateData,
        updateDataLength: updateData?.length,
      })

      // Se o update retornou dados, verificar se o status foi atualizado
      if (updateData && updateData.length > 0) {
        const returnedStatus = updateData[0].status
        console.log('admin-orders:updateStatus-updateReturnedData', {
          orderId,
          expectedStatus: newStatus,
          returnedStatus,
          match: returnedStatus === newStatus,
        })
        if (returnedStatus === newStatus) {
          // Se o status já está correto, buscar dados completos
          const { data: fullData, error: fullError } = await db
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle()
          
          if (!fullError && fullData) {
            return new Order(
              fullData.id,
              fullData.order_type,
              fullData.customer_name,
              fullData.customer_phone,
              fullData.table_number,
              fullData.status,
              Number(fullData.subtotal),
              Number(fullData.discount),
              Number(fullData.total),
              fullData.coupon_code,
              new Date(fullData.created_at),
              new Date(fullData.updated_at)
            )
          }
        }
      }

      // Aguardar um pouco para garantir que o update foi commitado
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Buscar pedido atualizado separadamente (necessário devido a RLS)
      const { data: updatedData, error: fetchUpdatedError } = await db
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .maybeSingle()

      if (fetchUpdatedError) {
        console.error('admin-orders:updateStatus-fetchUpdatedError', fetchUpdatedError)
        throw new Error(fetchUpdatedError.message || 'Erro ao buscar pedido atualizado')
      }

      if (!updatedData) {
        throw new Error('Pedido não encontrado após atualização')
      }

      console.log('admin-orders:updateStatus-fetchedData', {
        orderId,
        newStatus,
        returnedStatus: updatedData.status,
        match: updatedData.status === newStatus,
      })

      // Verificar se o status foi realmente atualizado
      if (updatedData.status !== newStatus) {
        console.warn('admin-orders:updateStatus-statusMismatch', {
          orderId,
          expected: newStatus,
          actual: updatedData.status,
        })
        // Tentar buscar novamente após um delay maior
        await new Promise((resolve) => setTimeout(resolve, 300))
        const { data: retryData, error: retryError } = await db
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .maybeSingle()
        
        if (!retryError && retryData) {
          console.log('admin-orders:updateStatus-retryData', {
            orderId,
            status: retryData.status,
            expected: newStatus,
            match: retryData.status === newStatus,
          })
          if (retryData.status === newStatus) {
            return new Order(
              retryData.id,
              retryData.order_type,
              retryData.customer_name,
              retryData.customer_phone,
              retryData.table_number,
              retryData.status,
              Number(retryData.subtotal),
              Number(retryData.discount),
              Number(retryData.total),
              retryData.coupon_code,
              new Date(retryData.created_at),
              new Date(retryData.updated_at)
            )
          }
        }
        // Se ainda não corresponde, lançar erro
        throw new Error(`Status não foi atualizado corretamente. Esperado: ${newStatus}, Retornado: ${updatedData.status}`)
      }

      return new Order(
        updatedData.id,
        updatedData.order_type,
        updatedData.customer_name,
        updatedData.customer_phone,
        updatedData.table_number,
        updatedData.status,
        Number(updatedData.subtotal),
        Number(updatedData.discount),
        Number(updatedData.total),
        updatedData.coupon_code,
        new Date(updatedData.created_at),
        new Date(updatedData.updated_at)
      )
    }

    try {
      return await Promise.race([updatePromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-orders:updateStatus-timeout')
        throw new Error('TIMEOUT')
      }
      if (error instanceof OrderValidationError) {
        throw error
      }
      console.error('admin-orders:updateStatus-error', error)
      throw error
    }
  }

  static async getOrderItems(orderId: string, client?: SupabaseClient): Promise<OrderItem[]> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<OrderItem[]> => {
      const { data: items, error: itemsError } = await db
        .from('order_items')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true })

      if (itemsError) {
        throw new Error(itemsError.message)
      }

      if (!items || items.length === 0) {
        return []
      }

      const orderItems: OrderItem[] = []

      for (const item of items) {
        const { data: options, error: optionsError } = await db
          .from('order_item_options')
          .select('*')
          .eq('order_item_id', item.id)

        if (optionsError) {
          console.error('admin-orders:getOrderItems-options-error', optionsError)
        }

        orderItems.push({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productPrice: Number(item.product_price),
          quantity: item.quantity,
          notes: item.notes,
          totalPrice: Number(item.total_price),
          selectedOptions: (options ?? []).map((opt) => ({
            id: opt.id,
            optionGroupId: opt.option_group_id,
            optionGroupName: opt.option_group_name,
            optionId: opt.option_id,
            optionName: opt.option_name,
            additionalPrice: Number(opt.additional_price),
          })),
        })
      }

      return orderItems
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-orders:getOrderItems-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-orders:getOrderItems-error', error)
      throw error
    }
  }

  static async findByCustomer(
    searchTerm?: string,
    client?: SupabaseClient
  ): Promise<CustomerSummary[]> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const searchPromise = async (): Promise<CustomerSummary[]> => {
      // Buscar pedidos de "Retirada" com customer_phone preenchido
      let query = db
        .from('orders')
        .select('customer_phone, customer_name, total, status, created_at')
        .eq('order_type', 'Retirada')
        .not('customer_phone', 'is', null)
        .not('customer_name', 'is', null)

      // Se não há termo de busca, retornar os últimos 50 clientes
      if (!searchTerm || (!searchTerm.trim() && !searchTerm.replace(/[^\d]/g, ''))) {
        // Buscar todos os pedidos de retirada ordenados por data (mais recentes primeiro)
        query = query.order('created_at', { ascending: false })
      } else {
        // Normalizar telefone (remover caracteres especiais)
        const normalizedSearchTerm = searchTerm.replace(/[^\d]/g, '')
        const trimmedSearchTerm = searchTerm.trim()
        
        // Se o termo contém apenas dígitos, buscar apenas por telefone
        if (normalizedSearchTerm && normalizedSearchTerm.length > 0 && !trimmedSearchTerm.match(/[a-zA-ZÀ-ÿ]/)) {
          // Apenas números - buscar apenas por telefone
          query = query.ilike('customer_phone', `%${normalizedSearchTerm}%`)
        } else if (trimmedSearchTerm) {
          // Contém texto - buscar por nome e telefone (se houver dígitos)
          if (normalizedSearchTerm && normalizedSearchTerm.length > 0) {
            // Contém texto E números - buscar por nome OU telefone
            query = query.or(`customer_name.ilike.%${trimmedSearchTerm}%,customer_phone.ilike.%${normalizedSearchTerm}%`)
          } else {
            // Apenas texto - buscar apenas por nome
            query = query.ilike('customer_name', `%${trimmedSearchTerm}%`)
          }
        } else {
          // Termo inválido
          return []
        }
      }

      const { data: orders, error } = await query

      if (error) {
        console.error('admin-customers:findByCustomer-query-error', {
          searchTerm,
          normalizedSearchTerm: searchTerm ? searchTerm.replace(/[^\d]/g, '') : null,
          trimmedSearchTerm: searchTerm ? searchTerm.trim() : null,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw new Error(error.message)
      }

      console.log('admin-customers:findByCustomer-query-success', {
        searchTerm,
        ordersFound: orders?.length || 0,
      })

      if (!orders || orders.length === 0) {
        return []
      }

      // Agrupar por customer_phone e calcular métricas
      // Normalizar telefones para agrupar corretamente (mesmo cliente pode ter telefones formatados diferentes)
      const customerMap = new Map<string, CustomerSummary>()

      for (const order of orders) {
        // Normalizar telefone para agrupar (remover formatação)
        const phone = order.customer_phone!.replace(/[^\d]/g, '')
        const name = order.customer_name!
        const total = Number(order.total)
        const createdAt = new Date(order.created_at)
        const status = order.status as 'Recebido' | 'Em Preparo' | 'Pronto'
        const originalPhone = order.customer_phone! // Manter formato original para exibição

        if (!customerMap.has(phone)) {
          customerMap.set(phone, {
            name,
            phone: originalPhone, // Usar formato original do primeiro pedido encontrado
            totalOrders: 0,
            totalSpent: 0,
            lastOrderDate: createdAt,
            lastOrderStatus: status,
          })
        }

        const customer = customerMap.get(phone)!
        customer.totalOrders += 1
        customer.totalSpent += total

        // Atualizar último pedido se este for mais recente
        if (createdAt > customer.lastOrderDate) {
          customer.lastOrderDate = createdAt
          customer.lastOrderStatus = status
        }
      }

      // Converter para array e ordenar
      const customers = Array.from(customerMap.values())
      
      // Ordenar por data do último pedido (mais recentes primeiro), depois por nome
      customers.sort((a, b) => {
        const dateDiff = b.lastOrderDate.getTime() - a.lastOrderDate.getTime()
        if (dateDiff !== 0) return dateDiff
        return a.name.localeCompare(b.name)
      })

      // Limitar a 50 resultados (já ordenados por data do último pedido)
      return customers.slice(0, 50)
    }

    try {
      return await Promise.race([searchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-customers:findByCustomer-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-customers:findByCustomer-error', error)
      throw error
    }
  }

  static async getCustomerOrders(
    customerPhone: string,
    client?: SupabaseClient
  ): Promise<Order[]> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<Order[]> => {
      // Normalizar telefone para busca (remover formatação)
      const normalizedPhone = customerPhone.replace(/[^\d]/g, '')

      console.log('admin-customers:getCustomerOrders-query-start', {
        customerPhone,
        normalizedPhone,
      })

      if (!normalizedPhone || normalizedPhone.length === 0) {
        console.log('admin-customers:getCustomerOrders-empty-phone', {
          customerPhone,
        })
        return []
      }

      // Buscar TODOS os pedidos de retirada (sem filtro de telefone)
      // Depois filtrar em memória para garantir correspondência exata
      const { data: allOrders, error } = await db
        .from('orders')
        .select('*')
        .eq('order_type', 'Retirada')
        .not('customer_phone', 'is', null)
        .order('created_at', { ascending: false })
        .limit(500) // Limitar para performance, mas buscar mais para garantir

      if (error) {
        console.error('admin-customers:getCustomerOrders-query-error', {
          customerPhone,
          normalizedPhone,
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        })
        throw new Error(error.message)
      }

      if (!allOrders || allOrders.length === 0) {
        console.log('admin-customers:getCustomerOrders-no-orders-in-db', {
          customerPhone,
          normalizedPhone,
        })
        return []
      }

      console.log('admin-customers:getCustomerOrders-query-fetched', {
        customerPhone,
        normalizedPhone,
        totalOrdersFetched: allOrders.length,
      })

      // Filtrar em memória comparando telefones normalizados
      const matchingOrders = allOrders.filter((order) => {
        if (!order.customer_phone) return false
        const orderPhoneNormalized = order.customer_phone.replace(/[^\d]/g, '')
        // Comparar telefones normalizados (apenas dígitos) - correspondência exata
        const matches = orderPhoneNormalized === normalizedPhone
        if (matches) {
          console.log('admin-customers:getCustomerOrders-match-found', {
            customerPhone,
            normalizedPhone,
            orderPhone: order.customer_phone,
            orderPhoneNormalized,
            orderId: order.id,
          })
        }
        return matches
      })

      console.log('admin-customers:getCustomerOrders-query-success', {
        customerPhone,
        normalizedPhone,
        totalOrders: allOrders.length,
        matchingOrders: matchingOrders.length,
      })

      return matchingOrders.map(
        (row) =>
          new Order(
            row.id,
            row.order_type,
            row.customer_name,
            row.customer_phone,
            row.table_number,
            row.status,
            Number(row.subtotal),
            Number(row.discount),
            Number(row.total),
            row.coupon_code,
            new Date(row.created_at),
            new Date(row.updated_at)
          )
      )
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-customers:getCustomerOrders-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-customers:getCustomerOrders-error', error)
      throw error
    }
  }

  static async getMetrics(
    period: 'today' | 'last7days',
    client?: SupabaseClient
  ): Promise<MetricsSummary> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<MetricsSummary> => {
      // Calcular período em UTC
      const now = new Date()
      const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()))
      
      let startDate: Date
      if (period === 'today') {
        // Início do dia atual em UTC (00:00:00 UTC)
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
      } else {
        // 7 dias atrás em UTC (00:00:00 UTC)
        const sevenDaysAgo = new Date(nowUTC)
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6) // -6 para incluir hoje (total 7 dias)
        startDate = new Date(Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), sevenDaysAgo.getUTCDate(), 0, 0, 0))
      }

      console.log('admin-metrics:getMetrics-query', {
        period,
        startDate: startDate.toISOString(),
        endDate: nowUTC.toISOString(),
      })

      // Buscar pedidos no período
      const { data: orders, error } = await db
        .from('orders')
        .select('id, total, created_at')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', nowUTC.toISOString())

      if (error) {
        console.error('admin-metrics:getMetrics-query-error', {
          period,
          error: error.message,
          code: error.code,
        })
        throw new Error(error.message)
      }

      const totalOrders = orders?.length || 0
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0
      
      let averageOrdersPerDay: number | undefined
      if (period === 'last7days') {
        averageOrdersPerDay = totalOrders / 7
      }

      console.log('admin-metrics:getMetrics-success', {
        period,
        totalOrders,
        totalRevenue,
        averageOrdersPerDay,
      })

      return {
        totalOrders,
        totalRevenue,
        averageOrdersPerDay,
      }
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-metrics:getMetrics-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-metrics:getMetrics-error', error)
      throw error
    }
  }

  static async getTopProducts(
    period: 'today' | 'last7days',
    limit: number = 10,
    client?: SupabaseClient
  ): Promise<TopProduct[]> {
    const db = client ?? supabase

    // Validar limit
    if (limit < 1 || limit > 50) {
      throw new Error('Limit deve estar entre 1 e 50')
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<TopProduct[]> => {
      // Calcular período em UTC
      const now = new Date()
      const nowUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds()))
      
      let startDate: Date
      if (period === 'today') {
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0))
      } else {
        const sevenDaysAgo = new Date(nowUTC)
        sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6)
        startDate = new Date(Date.UTC(sevenDaysAgo.getUTCFullYear(), sevenDaysAgo.getUTCMonth(), sevenDaysAgo.getUTCDate(), 0, 0, 0))
      }

      console.log('admin-metrics:getTopProducts-query', {
        period,
        limit,
        startDate: startDate.toISOString(),
        endDate: nowUTC.toISOString(),
      })

      // Primeiro, buscar IDs de produtos ativos
      const { data: activeProducts, error: productsError } = await db
        .from('products')
        .select('id')
        .eq('status', 'Ativo')

      if (productsError) {
        console.error('admin-metrics:getTopProducts-products-error', {
          period,
          limit,
          error: productsError.message,
        })
        throw new Error(productsError.message)
      }

      const activeProductIds = new Set(activeProducts?.map(p => p.id) || [])

      if (activeProductIds.size === 0) {
        console.log('admin-metrics:getTopProducts-no-active-products', {
          period,
          limit,
        })
        return []
      }

      // Buscar order_items de pedidos no período
      const { data: orders, error: ordersError } = await db
        .from('orders')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', nowUTC.toISOString())

      if (ordersError) {
        console.error('admin-metrics:getTopProducts-orders-error', {
          period,
          limit,
          error: ordersError.message,
        })
        throw new Error(ordersError.message)
      }

      if (!orders || orders.length === 0) {
        console.log('admin-metrics:getTopProducts-no-orders', {
          period,
          limit,
        })
        return []
      }

      const orderIds = orders.map(o => o.id)

      // Buscar order_items dos pedidos encontrados
      const { data: orderItems, error: itemsError } = await db
        .from('order_items')
        .select('product_id, product_name, quantity, total_price')
        .in('order_id', orderIds)

      if (itemsError) {
        console.error('admin-metrics:getTopProducts-items-error', {
          period,
          limit,
          error: itemsError.message,
        })
        throw new Error(itemsError.message)
      }

      if (!orderItems || orderItems.length === 0) {
        console.log('admin-metrics:getTopProducts-no-items', {
          period,
          limit,
        })
        return []
      }

      // Agrupar por product_id em memória, filtrando apenas produtos ativos
      const productMap = new Map<string, { productId: string; productName: string; totalQuantity: number; totalRevenue: number }>()

      for (const item of orderItems) {
        const productId = item.product_id
        
        // Filtrar apenas produtos ativos
        if (!activeProductIds.has(productId)) {
          continue
        }

        const productName = item.product_name
        const quantity = Number(item.quantity)
        const totalPrice = Number(item.total_price)

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            productName,
            totalQuantity: 0,
            totalRevenue: 0,
          })
        }

        const product = productMap.get(productId)!
        product.totalQuantity += quantity
        product.totalRevenue += totalPrice
      }

      // Converter para array e ordenar
      const products = Array.from(productMap.values())
      
      // Ordenar por quantidade (DESC), depois por receita (DESC), depois por nome (ASC)
      products.sort((a, b) => {
        if (b.totalQuantity !== a.totalQuantity) {
          return b.totalQuantity - a.totalQuantity
        }
        if (b.totalRevenue !== a.totalRevenue) {
          return b.totalRevenue - a.totalRevenue
        }
        return a.productName.localeCompare(b.productName)
      })

      // Limitar resultados e adicionar posição
      const topProducts = products.slice(0, limit).map((product, index) => ({
        ...product,
        position: index + 1,
      }))

      console.log('admin-metrics:getTopProducts-success', {
        period,
        limit,
        productsFound: topProducts.length,
      })

      return topProducts
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-metrics:getTopProducts-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-metrics:getTopProducts-error', error)
      throw error
    }
  }
}
