import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Option } from './Option'

export class OptionGroupValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Option group validation failed')
    this.name = 'OptionGroupValidationError'
  }
}

export interface CreateOptionGroupPayload {
  name: string
  selectionType: 'single' | 'multiple'
}

export interface UpdateOptionGroupPayload {
  name: string
  selectionType: 'single' | 'multiple'
}

export class OptionGroup {
  constructor(
    public id: string,
    public name: string,
    public selectionType: 'single' | 'multiple',
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  getName(): string {
    return this.name
  }

  getSelectionType(): 'single' | 'multiple' {
    return this.selectionType
  }

  async getOptions(): Promise<Option[]> {
    const { data, error } = await supabase
      .from('options')
      .select('*')
      .eq('option_group_id', this.id)
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

  static async getByProductId(productId: string): Promise<OptionGroup[]> {
    const { data, error } = await supabase
      .from('product_option_links')
      .select('option_group_id, option_groups(*)')
      .eq('product_id', productId)

    if (error) {
      throw new Error(`Error fetching option groups: ${error.message}`)
    }

    if (!data || data.length === 0) {
      return []
    }

    return data
      .map((row: any) => {
        const group = row.option_groups
        if (!group) return null
        return new OptionGroup(
          group.id,
          group.name,
          group.selection_type,
          new Date(group.created_at),
          new Date(group.updated_at)
        )
      })
      .filter((group): group is OptionGroup => group !== null)
  }

  static async getAll(client?: SupabaseClient): Promise<OptionGroup[]> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('option_groups')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Error fetching option groups: ${error.message}`)
    }

    return (data ?? []).map(
      (row) =>
        new OptionGroup(
          row.id,
          row.name,
          row.selection_type,
          new Date(row.created_at),
          new Date(row.updated_at)
        )
    )
  }

  static async create(
    payload: CreateOptionGroupPayload,
    client?: SupabaseClient
  ): Promise<OptionGroup> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createPromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateOptionGroupInput(trimmedName, payload.selectionType)
      if (Object.keys(errors).length > 0) {
        throw new OptionGroupValidationError(errors)
      }

      const { data, error } = await supabaseClient
        .from('option_groups')
        .insert({
          name: trimmedName,
          selection_type: payload.selectionType,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao criar grupo de opcionais')
      }

      return new OptionGroup(
        data.id,
        data.name,
        data.selection_type,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    })()

    try {
      return await Promise.race([createPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:optiongroup-create-timeout')
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof OptionGroupValidationError) {
        throw error
      }

      console.error('admin-options:optiongroup-create-error', error)
      throw error instanceof Error ? error : new Error('Erro ao criar grupo de opcionais')
    }
  }

  static async update(
    id: string,
    payload: UpdateOptionGroupPayload,
    client?: SupabaseClient
  ): Promise<OptionGroup> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = (async () => {
      const trimmedName = payload.name.trim()

      const errors = validateOptionGroupInput(trimmedName, payload.selectionType)
      if (Object.keys(errors).length > 0) {
        throw new OptionGroupValidationError(errors)
      }

      const { data, error } = await supabaseClient
        .from('option_groups')
        .update({
          name: trimmedName,
          selection_type: payload.selectionType,
        })
        .eq('id', id)
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao atualizar grupo de opcionais')
      }

      return new OptionGroup(
        data.id,
        data.name,
        data.selection_type,
        new Date(data.created_at),
        new Date(data.updated_at)
      )
    })()

    try {
      return await Promise.race([updatePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:optiongroup-update-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof OptionGroupValidationError) {
        throw error
      }

      console.error('admin-options:optiongroup-update-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao atualizar grupo de opcionais')
    }
  }

  static async delete(id: string, client?: SupabaseClient): Promise<number> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const deletePromise = (async () => {
      const { data: options } = await supabaseClient
        .from('options')
        .select('id')
        .eq('option_group_id', id)

      const optionCount = options?.length ?? 0

      const { error } = await supabaseClient.from('option_groups').delete().eq('id', id)

      if (error) {
        throw new Error(error.message || 'Erro ao excluir grupo de opcionais')
      }

      return optionCount
    })()

    try {
      return await Promise.race([deletePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-options:optiongroup-delete-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-options:optiongroup-delete-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao excluir grupo de opcionais')
    }
  }
}

function validateOptionGroupInput(
  name: string,
  selectionType: string
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!name) {
    errors.name = 'Nome é obrigatório'
  } else if (name.length < 3 || name.length > 40) {
    errors.name = 'Nome deve ter entre 3 e 40 caracteres'
  }

  if (selectionType !== 'single' && selectionType !== 'multiple') {
    errors.selectionType = 'Tipo de seleção deve ser "single" ou "multiple"'
  }

  return errors
}

export { validateOptionGroupInput }

