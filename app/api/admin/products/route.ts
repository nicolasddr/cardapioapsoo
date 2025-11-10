import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  Product,
  ProductValidationError,
  type CreateProductPayload,
  type UpdateProductPayload,
} from '@/src/domain/entities/Product'

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

    const products = await Product.getAll(supabase)

    return NextResponse.json({
      data: products.map((prod) => ({
        id: prod.id,
        name: prod.name,
        description: prod.description ?? null,
        price: prod.price,
        categoryId: prod.categoryId,
        status: prod.status,
        order: prod.order,
        photoUrl: prod.photoUrl ?? null,
        createdAt: prod.createdAt.toISOString(),
        updatedAt: prod.updatedAt.toISOString(),
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-products:get] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao buscar produtos'
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

    const payload: CreateProductPayload = {
      name: body.name ?? '',
      description: body.description ?? '',
      price: typeof body.price === 'number' ? body.price : 0,
      categoryId: body.categoryId ?? '',
      status: (body.status === 'Ativo' || body.status === 'Inativo') ? body.status : 'Ativo',
    }

    const product = await Product.create(
      payload,
      {},
      supabase
    )

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-products:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: product.id,
          name: product.name,
          description: product.description ?? null,
          price: product.price,
          categoryId: product.categoryId,
          status: product.status,
          order: product.order,
          photoUrl: product.photoUrl ?? null,
          createdAt: product.createdAt.toISOString(),
          updatedAt: product.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [admin-products:post] Error:', error)

    if (error instanceof ProductValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao criar produto'
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

    const payload: UpdateProductPayload = {
      name: body.name ?? '',
      description: body.description ?? '',
      price: typeof body.price === 'number' ? body.price : 0,
      categoryId: body.categoryId ?? '',
      status: (body.status === 'Ativo' || body.status === 'Inativo') ? body.status : 'Ativo',
      removePhoto: false,
    }

    const product = await Product.update(
      id,
      payload,
      {},
      supabase
    )

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-products:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        id: product.id,
        name: product.name,
        description: product.description ?? null,
        price: product.price,
        categoryId: product.categoryId,
        status: product.status,
        order: product.order,
        photoUrl: product.photoUrl ?? null,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-products:patch] Error:', error)

    if (error instanceof ProductValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar produto'
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
      return NextResponse.json({ error: 'ID do produto é obrigatório' }, { status: 400 })
    }

    await Product.delete(id, supabase)

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('admin-products:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data: { success: true }, error: null })
  } catch (error) {
    console.error('❌ [admin-products:delete] Error:', error)
    const message = error instanceof Error ? error.message : 'Erro ao excluir produto'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

