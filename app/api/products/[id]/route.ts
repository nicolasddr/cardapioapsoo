import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message, product: null },
        { status: 404 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Produto não encontrado', product: null },
        { status: 404 }
      )
    }

    return NextResponse.json({ product: data, error: null })
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Erro ao buscar produto',
        product: null,
      },
      { status: 500 }
    )
  }
}

