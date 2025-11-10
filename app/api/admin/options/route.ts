import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  Option,
  OptionValidationError,
  type CreateOptionPayload,
  type UpdateOptionPayload,
} from '@/src/domain/entities/Option'

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

    const options = await Option.getAll(supabase)

    return NextResponse.json({
      data: options.map((option) => ({
        id: option.id,
        name: option.name,
        additionalPrice: option.additionalPrice,
        optionGroupId: option.optionGroupId,
        createdAt: option.createdAt.toISOString(),
        updatedAt: option.updatedAt.toISOString(),
        deletedAt: option.deletedAt?.toISOString() ?? null,
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-options:get] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar opcionais'
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
    const payload: CreateOptionPayload = {
      name: body.name ?? '',
      additionalPrice: parseFloat(body.additionalPrice ?? '0'),
      optionGroupId: body.optionGroupId ?? '',
    }

    const option = await Option.create(payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-options:revalidate-error', error)
    }

    return NextResponse.json(
      {
        data: {
          id: option.id,
          name: option.name,
          additionalPrice: option.additionalPrice,
          optionGroupId: option.optionGroupId,
          createdAt: option.createdAt.toISOString(),
          updatedAt: option.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [admin-options:post] Error:', error)

    if (error instanceof OptionValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao criar opcional'
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
    const payload: UpdateOptionPayload = {
      name: body.name ?? '',
      additionalPrice: parseFloat(body.additionalPrice ?? '0'),
      optionGroupId: body.optionGroupId ?? '',
    }

    const option = await Option.update(id, payload, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-options:revalidate-error', error)
    }

    return NextResponse.json({
      data: {
        id: option.id,
        name: option.name,
        additionalPrice: option.additionalPrice,
        optionGroupId: option.optionGroupId,
        createdAt: option.createdAt.toISOString(),
        updatedAt: option.updatedAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-options:patch] Error:', error)

    if (error instanceof OptionValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar opcional'
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
      return NextResponse.json({ error: 'ID do opcional é obrigatório' }, { status: 400 })
    }

    await Option.delete(id, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-options:revalidate-error', error)
    }

    return NextResponse.json({
      data: { success: true },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-options:delete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao excluir opcional'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

