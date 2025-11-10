import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const { id: productId } = await params

    const { data, error } = await supabase
      .from('product_option_links')
      .select('option_group_id, option_groups(id, name, selection_type)')
      .eq('product_id', productId)

    if (error) {
      throw new Error(error.message)
    }

    const optionGroups = (data ?? [])
      .map((row: any) => row.option_groups)
      .filter((group: any) => group !== null)

    return NextResponse.json({
      data: optionGroups,
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-products-option-groups:get] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao buscar grupos de opcionais do produto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createServerClient()

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const { id: productId } = await params
    const body = await request.json()
    const optionGroupIds: string[] = body.optionGroupIds ?? []

    await supabase.from('product_option_links').delete().eq('product_id', productId)

    if (optionGroupIds.length > 0) {
      const links = optionGroupIds.map((groupId) => ({
        product_id: productId,
        option_group_id: groupId,
      }))

      const { error: insertError } = await supabase.from('product_option_links').insert(links)

      if (insertError) {
        throw new Error(insertError.message)
      }
    }

    try {
      await revalidatePath('/menu')
      await revalidatePath(`/api/products/${productId}`)
    } catch (error) {
      console.error('admin-products-option-groups:revalidate-error', error)
    }

    return NextResponse.json({
      data: { success: true, productId, optionGroupIds },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-products-option-groups:put] Error:', error)
    const message =
      error instanceof Error ? error.message : 'Erro ao atualizar grupos de opcionais do produto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

