import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export class CouponValidationError extends Error {
  constructor(public fieldErrors: Record<string, string>) {
    super('Validation error')
    this.name = 'CouponValidationError'
  }
}

export interface CreateCouponPayload {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  status: 'Ativo' | 'Inativo'
}

export interface UpdateCouponPayload {
  code?: string
  discountType?: 'percentage' | 'fixed'
  discountValue?: number
  status?: 'Ativo' | 'Inativo'
}

function validateCouponInput(
  code: string,
  discountType: 'percentage' | 'fixed',
  discountValue: number
): Record<string, string> {
  const errors: Record<string, string> = {}

  const trimmedCode = code.trim()
  if (!trimmedCode) {
    errors.code = 'Código é obrigatório'
  } else if (trimmedCode.length < 3 || trimmedCode.length > 20) {
    errors.code = 'Código deve ter entre 3 e 20 caracteres'
  }

  if (discountType === 'percentage') {
    if (discountValue < 1 || discountValue > 100) {
      errors.discountValue = 'Desconto percentual deve estar entre 1% e 100%'
    }
  } else if (discountType === 'fixed') {
    if (discountValue <= 0) {
      errors.discountValue = 'Desconto fixo deve ser maior que zero'
    }
  }

  return errors
}

export class Coupon {
  constructor(
    public id: string,
    public code: string,
    public discountType: 'percentage' | 'fixed',
    public discountValue: number,
    public status: 'Ativo' | 'Inativo',
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  getDiscountType(): 'percentage' | 'fixed' {
    return this.discountType
  }

  getDiscountValue(): number {
    return this.discountValue
  }

  isActive(): boolean {
    return this.status === 'Ativo'
  }

  calculateDiscount(subtotal: number): number {
    if (this.discountType === 'percentage') {
      const discount = (subtotal * this.discountValue) / 100
      return Math.min(discount, subtotal)
    } else {
      return Math.min(this.discountValue, subtotal)
    }
  }

  getDisplayValue(): string {
    if (this.discountType === 'percentage') {
      return `${this.discountValue}%`
    }
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.discountValue)
  }

  static async validate(code: string): Promise<Coupon | null> {
    const { data, error} = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .eq('status', 'Ativo')
      .single()

    if (error || !data) {
      return null
    }

    return new Coupon(
      data.id,
      data.code,
      data.discount_type,
      Number(data.discount_value),
      data.status,
      new Date(data.created_at),
      new Date(data.updated_at)
    )
  }

  static async getAll(client?: SupabaseClient): Promise<Coupon[]> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const fetchPromise = async (): Promise<Coupon[]> => {
      const { data, error } = await db
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(error.message)
      }

      return (data ?? []).map(
        (row) =>
          new Coupon(
            row.id,
            row.code,
            row.discount_type,
            Number(row.discount_value),
            row.status,
            new Date(row.created_at),
            new Date(row.updated_at)
          )
      )
    }

    try {
      return await Promise.race([fetchPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-coupons:getAll-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-coupons:getAll-error', error)
      throw error
    }
  }

  static async create(payload: CreateCouponPayload, client?: SupabaseClient): Promise<Coupon> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createPromise = async (): Promise<Coupon> => {
      const normalizedCode = payload.code.trim().toUpperCase()
      
      const errors = validateCouponInput(
        normalizedCode,
        payload.discountType,
        payload.discountValue
      )

      if (Object.keys(errors).length > 0) {
        throw new CouponValidationError(errors)
      }

      const { data, error } = await db
        .from('coupons')
        .insert({
          code: normalizedCode,
          discount_type: payload.discountType,
          discount_value: payload.discountValue,
          status: payload.status,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Código de cupom já existe')
        }
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('Erro ao criar cupom')
      }

      return new Coupon(
        data.id,
        data.code,
        data.discount_type,
        Number(data.discount_value),
        data.status,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    }

    try {
      return await Promise.race([createPromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-coupons:create-timeout')
        throw new Error('TIMEOUT')
      }
      if (error instanceof CouponValidationError) {
        throw error
      }
      console.error('admin-coupons:create-error', error)
      throw error
    }
  }

  static async update(
    id: string,
    payload: UpdateCouponPayload,
    client?: SupabaseClient
  ): Promise<Coupon> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = async (): Promise<Coupon> => {
      const updates: Record<string, unknown> = {}

      if (payload.code !== undefined) {
        const normalizedCode = payload.code.trim().toUpperCase()
        const errors = validateCouponInput(
          normalizedCode,
          payload.discountType ?? 'percentage',
          payload.discountValue ?? 0
        )
        if (errors.code) {
          throw new CouponValidationError({ code: errors.code })
        }
        updates.code = normalizedCode
      }

      if (payload.discountType !== undefined) {
        updates.discount_type = payload.discountType
      }

      if (payload.discountValue !== undefined) {
        const type = payload.discountType ?? 'percentage'
        const errors = validateCouponInput('VALID', type, payload.discountValue)
        if (errors.discountValue) {
          throw new CouponValidationError({ discountValue: errors.discountValue })
        }
        updates.discount_value = payload.discountValue
      }

      if (payload.status !== undefined) {
        updates.status = payload.status
      }

      const { data, error } = await db
        .from('coupons')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505') {
          throw new Error('Código de cupom já existe')
        }
        throw new Error(error.message)
      }

      if (!data) {
        throw new Error('Cupom não encontrado')
      }

      return new Coupon(
        data.id,
        data.code,
        data.discount_type,
        Number(data.discount_value),
        data.status,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    }

    try {
      return await Promise.race([updatePromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-coupons:update-timeout')
        throw new Error('TIMEOUT')
      }
      if (error instanceof CouponValidationError) {
        throw error
      }
      console.error('admin-coupons:update-error', error)
      throw error
    }
  }

  static async delete(id: string, client?: SupabaseClient): Promise<void> {
    const db = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const deletePromise = async (): Promise<void> => {
      const { error } = await db
        .from('coupons')
        .update({ status: 'Inativo' })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    }

    try {
      await Promise.race([deletePromise(), timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-coupons:delete-timeout')
        throw new Error('TIMEOUT')
      }
      console.error('admin-coupons:delete-error', error)
      throw error
    }
  }
}

