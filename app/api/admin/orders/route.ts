import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Order, OrderFilters } from '@/src/domain/entities/Order'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

export async function GET(request: Request) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    
    const filters: OrderFilters = {}
    
    const status = searchParams.get('status')
    if (status && ['Recebido', 'Em Preparo', 'Pronto'].includes(status)) {
      filters.status = status as 'Recebido' | 'Em Preparo' | 'Pronto'
    }
    
    const orderType = searchParams.get('orderType')
    if (orderType && ['Retirada', 'Consumo no Local'].includes(orderType)) {
      filters.orderType = orderType as 'Retirada' | 'Consumo no Local'
    }
    
    const startDate = searchParams.get('startDate')
    if (startDate) {
      filters.startDate = startDate
    }
    
    const endDate = searchParams.get('endDate')
    if (endDate) {
      filters.endDate = endDate
    }
    
    const limit = searchParams.get('limit')
    if (limit) {
      filters.limit = Math.min(parseInt(limit, 10), 100)
    }

    const orders = await Order.getAll(filters, supabase)

    const response = NextResponse.json({
      data: orders.map((order) => ({
        id: order.id,
        orderType: order.orderType,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        tableNumber: order.tableNumber,
        status: order.status,
        subtotal: order.subtotal,
        discount: order.discount,
        total: order.total,
        couponCode: order.couponCode,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      })),
      error: null,
    })

    return response
  } catch (error) {
    console.error('❌ [admin-orders:get] Error:', error)

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao buscar pedidos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

