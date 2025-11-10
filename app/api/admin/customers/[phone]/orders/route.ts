import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Order } from '@/src/domain/entities/Order'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ phone: string }> }
) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { phone } = await params

    if (!phone) {
      return NextResponse.json(
        { error: 'Telefone do cliente é obrigatório' },
        { status: 400 }
      )
    }

    // Decodificar o telefone (pode vir codificado na URL)
    const decodedPhone = decodeURIComponent(phone)

    console.log(JSON.stringify({
      prefix: 'admin-customers',
      action: 'get_customer_orders_start',
      phone: decodedPhone,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
    }))

    // Buscar pedidos do cliente
    const orders = await Order.getCustomerOrders(decodedPhone, supabase)

    // Log estruturado
    console.log(JSON.stringify({
      prefix: 'admin-customers',
      action: 'get_customer_orders',
      customerPhone: decodedPhone,
      ordersCount: orders.length,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: true,
    }))

    return NextResponse.json({
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
  } catch (error) {
    console.error('❌ [admin-customers:get-customer-orders] Error:', error)

    const phoneParam = await params
    const decodedPhone = phoneParam.phone ? decodeURIComponent(phoneParam.phone) : 'unknown'

    // Log estruturado de erro
    console.error(JSON.stringify({
      prefix: 'admin-customers',
      action: 'get_customer_orders',
      customerPhone: decodedPhone,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }))

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao buscar pedidos do cliente'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

