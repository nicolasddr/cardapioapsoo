import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  OptionGroup,
  OptionGroupValidationError,
  type CreateOptionGroupPayload,
  type UpdateOptionGroupPayload,
} from '@/src/domain/entities/OptionGroup'

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

    const optionGroups = await OptionGroup.getAll(supabase)

    return NextResponse.json({
      data: optionGroups.map((group) => ({
        id: group.id,
        name: group.name,
        selectionType: group.selectionType,
        createdAt: group.createdAt.toISOString(),
        updatedAt: group.updatedAt.toISOString(),
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-option-groups:get] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar grupos de opcionais'
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
    const payload: CreateOptionGroupPayload = {
      name: body.name ?? '',
      selectionType: body.selectionType ?? 'single',
    }

    const optionGroup = await OptionGroup.create(payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-option-groups:revalidate-error', error)
    }

    return NextResponse.json(
      {
        data: {
          id: optionGroup.id,
          name: optionGroup.name,
          selectionType: optionGroup.selectionType,
          createdAt: optionGroup.createdAt.toISOString(),
          updatedAt: optionGroup.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [admin-option-groups:post] Error:', error)

    if (error instanceof OptionGroupValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao criar grupo de opcionais'
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
    const payload: UpdateOptionGroupPayload = {
      name: body.name ?? '',
      selectionType: body.selectionType ?? 'single',
    }

    const optionGroup = await OptionGroup.update(id, payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-option-groups:revalidate-error', error)
    }

    return NextResponse.json({
      data: {
        id: optionGroup.id,
        name: optionGroup.name,
        selectionType: optionGroup.selectionType,
        createdAt: optionGroup.createdAt.toISOString(),
        updatedAt: optionGroup.updatedAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-option-groups:patch] Error:', error)

    if (error instanceof OptionGroupValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar grupo de opcionais'
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
      return NextResponse.json({ error: 'ID do grupo é obrigatório' }, { status: 400 })
    }

    const optionCount = await OptionGroup.delete(id, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-option-groups:revalidate-error', error)
    }

    return NextResponse.json({
      data: { success: true, deletedOptionsCount: optionCount },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-option-groups:delete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao excluir grupo de opcionais'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

