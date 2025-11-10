import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { Coupon, CouponValidationError, CreateCouponPayload, UpdateCouponPayload } from '@/src/domain/entities/Coupon'
import { revalidatePath } from 'next/cache'
import { checkAdminAuth } from '@/lib/supabase/admin-auth'

async function handleRevalidation() {
  try {
    revalidatePath('/menu')
    console.log('✅ [admin-coupons] revalidatePath(/menu) successful')
  } catch (revalidateError) {
    console.error('❌ [admin-coupons] revalidatePath failed:', revalidateError)
    return {
      error: 'Não foi possível atualizar o cache. As alterações podem demorar até 60s para aparecer.',
      details: revalidateError instanceof Error ? revalidateError.message : 'Unknown revalidation error',
    }
  }
  return null
}

export async function GET() {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const coupons = await Coupon.getAll(supabase)

    return NextResponse.json({
      data: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        status: coupon.status,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      })),
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-coupons:get] Error:', error)

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao buscar cupons'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json()

    const payload: CreateCouponPayload = {
      code: body.code ?? '',
      discountType: body.discountType ?? 'percentage',
      discountValue: typeof body.discountValue === 'number' ? body.discountValue : 0,
      status: body.status === 'Inativo' ? 'Inativo' : 'Ativo',
    }

    const coupon = await Coupon.create(payload, supabase)

    const revalidationError = await handleRevalidation()
    if (revalidationError) {
      return NextResponse.json(revalidationError, { status: 500 })
    }

    return NextResponse.json(
      {
        data: {
          id: coupon.id,
          code: coupon.code,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          status: coupon.status,
          createdAt: coupon.createdAt.toISOString(),
          updatedAt: coupon.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ [admin-coupons:post] Error:', error)

    if (error instanceof CouponValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        return NextResponse.json(
          { error: 'Tempo de espera esgotado. Tente novamente.' },
          { status: 504 }
        )
      }
      if (error.message === 'Código de cupom já existe') {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    const message = error instanceof Error ? error.message : 'Erro ao criar cupom'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const body = await request.json()
    const id = body.id ?? ''

    if (!id) {
      return NextResponse.json({ error: 'ID do cupom é obrigatório' }, { status: 400 })
    }

    const payload: UpdateCouponPayload = {}

    if (body.code !== undefined) {
      payload.code = body.code
    }
    if (body.discountType !== undefined) {
      payload.discountType = body.discountType
    }
    if (body.discountValue !== undefined) {
      payload.discountValue = body.discountValue
    }
    if (body.status !== undefined) {
      payload.status = body.status
    }

    const coupon = await Coupon.update(id, payload, supabase)

    const revalidationError = await handleRevalidation()
    if (revalidationError) {
      return NextResponse.json(revalidationError, { status: 500 })
    }

    return NextResponse.json({
      data: {
        id: coupon.id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        status: coupon.status,
        createdAt: coupon.createdAt.toISOString(),
        updatedAt: coupon.updatedAt.toISOString(),
      },
      error: null,
    })
  } catch (error) {
    console.error('❌ [admin-coupons:patch] Error:', error)

    if (error instanceof CouponValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      if (error.message === 'TIMEOUT') {
        return NextResponse.json(
          { error: 'Tempo de espera esgotado. Tente novamente.' },
          { status: 504 }
        )
      }
      if (error.message === 'Código de cupom já existe') {
        return NextResponse.json({ error: error.message }, { status: 409 })
      }
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar cupom'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const supabase = createServerClient()
  const auth = await checkAdminAuth(supabase)

  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id') ?? ''

    if (!id) {
      return NextResponse.json({ error: 'ID do cupom é obrigatório' }, { status: 400 })
    }

    await Coupon.delete(id, supabase)

    const revalidationError = await handleRevalidation()
    if (revalidationError) {
      return NextResponse.json(revalidationError, { status: 500 })
    }

    return NextResponse.json({ message: 'Cupom desativado com sucesso' })
  } catch (error) {
    console.error('❌ [admin-coupons:delete] Error:', error)

    if (error instanceof Error && error.message === 'TIMEOUT') {
      return NextResponse.json(
        { error: 'Tempo de espera esgotado. Tente novamente.' },
        { status: 504 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao desativar cupom'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

