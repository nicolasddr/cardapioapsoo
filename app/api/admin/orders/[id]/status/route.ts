import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Order, OrderValidationError } from '@/src/domain/entities/Order'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { id: orderId } = await params
    const body = await request.json()
    
    const newStatus = body.status as 'Recebido' | 'Em Preparo' | 'Pronto'

    if (!newStatus || !['Recebido', 'Em Preparo', 'Pronto'].includes(newStatus)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }

    // Buscar status anterior para log
    const previousOrder = await Order.findById(orderId)
    const previousStatus = previousOrder?.status || 'unknown'

    // Atualizar status
    const updatedOrder = await Order.updateStatus(orderId, newStatus, supabase)

    // Log estruturado
    console.log(JSON.stringify({
      prefix: 'admin-orders',
      action: 'update_status',
      orderId,
      previousStatus,
      newStatus,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: true,
    }))

    // Tentar broadcast Realtime
    let warning: string | null = null
    try {
      const channel = supabase.channel(`orders:${orderId}`)
      
      const response = await channel.send({
        type: 'broadcast',
        event: 'status_updated',
        payload: {
          orderId,
          newStatus,
          updatedAt: new Date().toISOString(),
        },
      })

      // Verificar se o broadcast foi bem-sucedido
      if (response !== 'ok') {
        throw new Error('Broadcast failed')
      }

      // Importante: unsubscribe do canal após enviar
      await channel.unsubscribe()
    } catch (broadcastError) {
      console.error(JSON.stringify({
        prefix: 'admin-orders',
        action: 'broadcast_failed',
        orderId,
        error: broadcastError instanceof Error ? broadcastError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }))
      
      warning = 'Status atualizado, mas notificação ao cliente pode ter falhado'
    }

    return NextResponse.json({
      data: {
        id: updatedOrder.id,
        orderType: updatedOrder.orderType,
        customerName: updatedOrder.customerName,
        customerPhone: updatedOrder.customerPhone,
        tableNumber: updatedOrder.tableNumber,
        status: updatedOrder.status,
        subtotal: updatedOrder.subtotal,
        discount: updatedOrder.discount,
        total: updatedOrder.total,
        couponCode: updatedOrder.couponCode,
        createdAt: updatedOrder.createdAt.toISOString(),
        updatedAt: updatedOrder.updatedAt.toISOString(),
      },
      warning,
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-orders:update-status] Error:', error)

    // Log estruturado de erro
    console.error(JSON.stringify({
      prefix: 'admin-orders',
      action: 'update_status',
      orderId: (await params).id,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }))

    if (error instanceof OrderValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

