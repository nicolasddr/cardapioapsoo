import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Product } from './Product'

export class CategoryValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Category validation failed')
    this.name = 'CategoryValidationError'
  }
}

export interface CreateCategoryPayload {
  name: string
}

export interface UpdateCategoryPayload {
  name: string
}

export class Category {
  constructor(
    public id: string,
    public name: string,
    public order: number,
    public active: boolean,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  isActive(): boolean {
    return this.active
  }

  async hasActiveProducts(): Promise<boolean> {
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .eq('category_id', this.id)
      .eq('status', 'Ativo')
      .limit(1)

    if (error) {
      throw new Error(`Error checking active products: ${error.message}`)
    }

    return (data?.length ?? 0) > 0
  }

  async getProducts(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category_id', this.id)
      .eq('status', 'Ativo')
      .order('order', { ascending: true })

    if (error) {
      throw new Error(`Error fetching products: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new Product(
          row.id,
          row.name,
          Number(row.price),
          row.category_id,
          row.status,
          row.order ?? 0,
          new Date(row.created_at),
          new Date(row.updated_at),
          row.description ?? undefined,
          row.photo_url ?? undefined
        )
    )
  }

  static async getAllActive(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('active', true)
      .order('order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new Category(
          row.id,
          row.name,
          row.order ?? 0,
          row.active,
          new Date(row.created_at),
          new Date(row.updated_at)
        )
    )
  }

  static async getAll(client?: SupabaseClient): Promise<Category[]> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('categories')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error fetching categories: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new Category(
          row.id,
          row.name,
          row.order ?? 0,
          row.active,
          new Date(row.created_at),
          new Date(row.updated_at)
        )
    )
  }

  static async create(
    payload: CreateCategoryPayload,
    client?: SupabaseClient
  ): Promise<Category> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createPromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateCategoryInput(trimmedName)
      if (Object.keys(errors).length > 0) {
        throw new CategoryValidationError(errors)
      }

      const { data: maxOrderData } = await supabaseClient
        .from('categories')
        .select('order')
        .order('order', { ascending: false })
        .limit(1)
        .single()

      const nextOrder = (maxOrderData?.order ?? -1) + 1

      const { data, error } = await supabaseClient
        .from('categories')
        .insert({
          name: trimmedName,
          order: nextOrder,
          active: true,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao criar categoria')
      }

      return new Category(
        data.id,
        data.name,
        data.order ?? 0,
        data.active,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    })()

    try {
      return await Promise.race([createPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:category-create-timeout')
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof CategoryValidationError) {
        throw error
      }

      console.error('admin-products:category-create-error', error)
      throw error instanceof Error ? error : new Error('Erro ao criar categoria')
    }
  }

  static async update(
    id: string,
    payload: UpdateCategoryPayload,
    client?: SupabaseClient
  ): Promise<Category> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateCategoryInput(trimmedName)
      if (Object.keys(errors).length > 0) {
        throw new CategoryValidationError(errors)
      }

      const { data, error } = await supabaseClient
        .from('categories')
        .update({ name: trimmedName })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao atualizar categoria')
      }

      return new Category(
        data.id,
        data.name,
        data.order ?? 0,
        data.active,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    })()

    try {
      return await Promise.race([updatePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:category-update-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof CategoryValidationError) {
        throw error
      }

      console.error('admin-products:category-update-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao atualizar categoria')
    }
  }

  static async delete(id: string, client?: SupabaseClient): Promise<void> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const deletePromise = (async () => {
      const { error } = await supabaseClient.from('categories').delete().eq('id', id)

      if (error) {
        throw new Error(error.message || 'Erro ao excluir categoria')
      }
    })()

    try {
      await Promise.race([deletePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:category-delete-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-products:category-delete-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao excluir categoria')
    }
  }

  static async reorder(
    orderedIds: string[],
    client?: SupabaseClient
  ): Promise<void> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const reorderPromise = (async () => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabaseClient
          .from('categories')
          .update({ order: i })
          .eq('id', orderedIds[i])

        if (error) {
          throw new Error(error.message || 'Erro ao reordenar categorias')
        }
      }
    })()

    try {
      await Promise.race([reorderPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:category-reorder-timeout', { count: orderedIds.length })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-products:category-reorder-error', { count: orderedIds.length, error })
      throw error instanceof Error ? error : new Error('Erro ao reordenar categorias')
    }
  }
}

function validateCategoryInput(name: string): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!name) {
    errors.name = 'Nome é obrigatório'
  } else if (name.length < 3 || name.length > 40) {
    errors.name = 'Nome deve ter entre 3 e 40 caracteres'
  }

  return errors
}

export { validateCategoryInput }

