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
    const searchTerm = searchParams.get('search') || ''

    // Se não há termo de busca, retornar os últimos 50 clientes
    // Se há termo de busca, validar que não seja apenas espaços
    if (searchTerm && !searchTerm.trim()) {
      return NextResponse.json(
        { error: 'Termo de busca não pode conter apenas espaços' },
        { status: 400 }
      )
    }

    // Buscar clientes (se searchTerm vazio, retorna últimos 50)
    const customers = await Order.findByCustomer(searchTerm.trim() || undefined, supabase)

    // Log estruturado
    console.log(JSON.stringify({
      prefix: 'admin-customers',
      action: 'search',
      searchTerm: searchTerm.trim(),
      resultsCount: customers.length,
      adminId: auth.userId,
      timestamp: new Date().toISOString(),
      success: true,
    }))

    return NextResponse.json({
      data: customers.map((customer) => ({
        name: customer.name,
        phone: customer.phone,
        totalOrders: customer.totalOrders,
        totalSpent: customer.totalSpent,
        lastOrderDate: customer.lastOrderDate.toISOString(),
        lastOrderStatus: customer.lastOrderStatus,
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-customers:search] Error:', error)

    // Log estruturado de erro
    console.error(JSON.stringify({
      prefix: 'admin-customers',
      action: 'search',
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

    const message = error instanceof Error ? error.message : 'Erro ao buscar clientes'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

