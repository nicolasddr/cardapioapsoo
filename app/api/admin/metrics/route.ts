import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Order } from '@/src/domain/entities/Order'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

export async function GET(request: Request) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'today'

    // Validar período
    if (period !== 'today' && period !== 'last7days') {
      return NextResponse.json(
        { error: 'Período inválido. Use "today" ou "last7days"' },
        { status: 400 }
      )
    }

    const metrics = await Order.getMetrics(period as 'today' | 'last7days', supabase)

    console.log(JSON.stringify({
      prefix: 'admin-metrics',
      action: 'get_metrics',
      period,
      totalOrders: metrics.totalOrders,
      totalRevenue: metrics.totalRevenue,
      averageOrdersPerDay: metrics.averageOrdersPerDay,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: true,
    }))

    return NextResponse.json({
      data: {
        totalOrders: metrics.totalOrders,
        totalRevenue: metrics.totalRevenue,
        averageOrdersPerDay: metrics.averageOrdersPerDay,
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-metrics:get-metrics] Error:', error)

    console.error(JSON.stringify({
      prefix: 'admin-metrics',
      action: 'get_metrics',
      period: new URL(request.url).searchParams.get('period') || 'today',
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

    const message = error instanceof Error ? error.message : 'Erro ao buscar métricas'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

