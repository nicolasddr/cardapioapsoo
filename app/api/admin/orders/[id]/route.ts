import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Order } from '@/src/domain/entities/Order'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { id } = await params

    const order = await Order.findById(id)
    
    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const items = await Order.getOrderItems(id, supabase)

    return NextResponse.json({
      data: {
        order: {
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
        },
        items,
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-orders:get-by-id] Error:', error)

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao buscar pedido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

