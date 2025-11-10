import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import { Category } from '@/src/domain/entities/Category'

export async function POST(request: Request) {
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

    const body = await request.json()
    const orderedIds: string[] = body.orderedIds ?? []

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'Lista de IDs é obrigatória' }, { status: 400 })
    }

    await Category.reorder(orderedIds, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-categories:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (error) {
    console.error('❌ [admin-categories:reorder] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao reordenar categorias'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

