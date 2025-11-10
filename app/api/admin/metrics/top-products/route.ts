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
    const limitParam = searchParams.get('limit')

    // Validar período
    if (period !== 'today' && period !== 'last7days') {
      return NextResponse.json(
        { error: 'Período inválido. Use "today" ou "last7days"' },
        { status: 400 }
      )
    }

    // Validar limit
    let limit = 10 // padrão
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10)
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        return NextResponse.json(
          { error: 'Limit deve estar entre 1 e 50' },
          { status: 400 }
        )
      }
      limit = parsedLimit
    }

    const topProducts = await Order.getTopProducts(period as 'today' | 'last7days', limit, supabase)

    console.log(JSON.stringify({
      prefix: 'admin-metrics',
      action: 'get_top_products',
      period,
      limit,
      productsCount: topProducts.length,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: true,
    }))

    return NextResponse.json({
      data: topProducts.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        totalQuantity: product.totalQuantity,
        totalRevenue: product.totalRevenue,
        position: product.position,
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-metrics:get-top-products] Error:', error)

    const url = new URL(request.url)
    console.error(JSON.stringify({
      prefix: 'admin-metrics',
      action: 'get_top_products',
      period: url.searchParams.get('period') || 'today',
      limit: url.searchParams.get('limit') || '10',
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

    const message = error instanceof Error ? error.message : 'Erro ao buscar produtos mais vendidos'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

