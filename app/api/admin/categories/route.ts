import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  Category,
  CategoryValidationError,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/src/domain/entities/Category'

export async function GET() {
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

    const categories = await Category.getAll(supabase)

    return NextResponse.json({
      data: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        order: cat.order,
        active: cat.active,
        createdAt: cat.createdAt.toISOString(),
        updatedAt: cat.updatedAt.toISOString(),
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-categories:get] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar categorias'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

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
    const payload: CreateCategoryPayload = {
      name: body.name ?? '',
    }

    const category = await Category.create(payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-categories:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: category.id,
          name: category.name,
          order: category.order,
          active: category.active,
          createdAt: category.createdAt.toISOString(),
          updatedAt: category.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [admin-categories:post] Error:', error)

    if (error instanceof CategoryValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao criar categoria'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
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
    const id = body.id ?? ''
    const payload: UpdateCategoryPayload = {
      name: body.name ?? '',
    }

    const category = await Category.update(id, payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-categories:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        id: category.id,
        name: category.name,
        order: category.order,
        active: category.active,
        createdAt: category.createdAt.toISOString(),
        updatedAt: category.updatedAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-categories:patch] Error:', error)

    if (error instanceof CategoryValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar categoria'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') ?? ''

    if (!id) {
      return NextResponse.json({ error: 'ID da categoria é obrigatório' }, { status: 400 })
    }

    await Category.delete(id, supabase)

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
    console.error('❌ [admin-categories:delete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao excluir categoria'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

