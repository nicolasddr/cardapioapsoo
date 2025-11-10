import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export class OptionValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Option validation failed')
    this.name = 'OptionValidationError'
  }
}

export interface CreateOptionPayload {
  name: string
  additionalPrice: number
  optionGroupId: string
}

export interface UpdateOptionPayload {
  name: string
  additionalPrice: number
  optionGroupId: string
}

export class Option {
  constructor(
    public id: string,
    public name: string,
    public additionalPrice: number,
    public optionGroupId: string,
    public createdAt: Date,
    public updatedAt: Date,
    public deletedAt?: Date | null
  ) {}

  getName(): string {
    return this.name
  }

  getAdditionalPrice(): number {
    return this.additionalPrice
  }

  getDisplayPrice(): string {
    if (this.additionalPrice === 0) {
      return 'Sem custo adicional'
    }
    return `+${new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.additionalPrice)}`
  }

  isDeleted(): boolean {
    return this.deletedAt !== null && this.deletedAt !== undefined
  }

  static async getAll(client?: SupabaseClient): Promise<Option[]> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('options')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching options: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new Option(
          row.id,
          row.name,
          Number(row.additional_price),
          row.option_group_id,
          new Date(row.created_at),
          new Date(row.updated_at),
          row.deleted_at ? new Date(row.deleted_at) : null
        )
    )
  }

  static async getByGroupId(
    groupId: string,
    client?: SupabaseClient
  ): Promise<Option[]> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('options')
      .select('*')
      .eq('option_group_id', groupId)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching options: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new Option(
          row.id,
          row.name,
          Number(row.additional_price),
          row.option_group_id,
          new Date(row.created_at),
          new Date(row.updated_at),
          row.deleted_at ? new Date(row.deleted_at) : null
        )
    )
  }

  static async create(
    payload: CreateOptionPayload,
    client?: SupabaseClient
  ): Promise<Option> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createPromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateOptionInput(
        trimmedName,
        payload.additionalPrice,
        payload.optionGroupId
      )
      if (Object.keys(errors).length > 0) {
        throw new OptionValidationError(errors)
      }

      const { data, error } = await supabaseClient
        .from('options')
        .insert({
          name: trimmedName,
          additional_price: payload.additionalPrice,
          option_group_id: payload.optionGroupId,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao criar opcional')
      }

      return new Option(
        data.id,
        data.name,
        Number(data.additional_price),
        data.option_group_id,
        new Date(data.created_at),
        new Date(data.updated_at),
        data.deleted_at ? new Date(data.deleted_at) : null
      )
    })()

    try {
      return await Promise.race([createPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:option-create-timeout')
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof OptionValidationError) {
        throw error
      }

      console.error('admin-options:option-create-error', error)
      throw error instanceof Error ? error : new Error('Erro ao criar opcional')
    }
  }

  static async update(
    id: string,
    payload: UpdateOptionPayload,
    client?: SupabaseClient
  ): Promise<Option> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateOptionInput(
        trimmedName,
        payload.additionalPrice,
        payload.optionGroupId
      )
      if (Object.keys(errors).length > 0) {
        throw new OptionValidationError(errors)
      }

      const { data, error } = await supabaseClient
        .from('options')
        .update({
          name: trimmedName,
          additional_price: payload.additionalPrice,
          option_group_id: payload.optionGroupId,
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao atualizar opcional')
      }

      return new Option(
        data.id,
        data.name,
        Number(data.additional_price),
        data.option_group_id,
        new Date(data.created_at),
        new Date(data.updated_at),
        data.deleted_at ? new Date(data.deleted_at) : null
      )
    })()

    try {
      return await Promise.race([updatePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:option-update-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof OptionValidationError) {
        throw error
      }

      console.error('admin-options:option-update-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao atualizar opcional')
    }
  }

  static async delete(id: string, client?: SupabaseClient): Promise<void> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const deletePromise = (async () => {
      const { data: usageCheck } = await supabaseClient
        .from('order_item_options')
        .select('id')
        .eq('option_id', id)
        .limit(1)
        .single()

      if (usageCheck) {
        const { error } = await supabaseClient
          .from('options')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', id)

        if (error) {
          throw new Error(error.message || 'Erro ao desativar opcional')
        }
      } else {
        const { error } = await supabaseClient.from('options').delete().eq('id', id)

        if (error) {
          throw new Error(error.message || 'Erro ao excluir opcional')
        }
      }
    })()

    try {
      await Promise.race([deletePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:option-delete-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-options:option-delete-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao excluir opcional')
    }
  }
}

function validateOptionInput(
  name: string,
  additionalPrice: number,
  optionGroupId: string
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!name) {
    errors.name = 'Nome é obrigatório'
  } else if (name.length < 3 || name.length > 60) {
    errors.name = 'Nome deve ter entre 3 e 60 caracteres'
  }

  if (additionalPrice < 0) {
    errors.additionalPrice = 'Preço adicional não pode ser negativo'
  }

  if (!optionGroupId) {
    errors.optionGroupId = 'Grupo de opcionais é obrigatório'
  }

  return errors
}

export { validateOptionInput }

