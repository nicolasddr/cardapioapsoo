import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'
import { OptionGroup } from './OptionGroup'

const PRODUCT_MEDIA_BUCKET = 'product-media'
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024

export class ProductValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Product validation failed')
    this.name = 'ProductValidationError'
  }
}

export interface CreateProductPayload {
  name: string
  description?: string | null
  price: number
  categoryId: string
  status: 'Ativo' | 'Inativo'
}

export interface UpdateProductPayload {
  name: string
  description?: string | null
  price: number
  categoryId: string
  status: 'Ativo' | 'Inativo'
  removePhoto?: boolean
}

export interface ProductFiles {
  photo?: File | Blob | null
}

export class Product {
  constructor(
    public id: string,
    public name: string,
    public price: number,
    public categoryId: string,
    public status: 'Ativo' | 'Inativo',
    public order: number,
    public createdAt: Date,
    public updatedAt: Date,
    public description?: string,
    public photoUrl?: string
  ) {}

  isActive(): boolean {
    return this.status === 'Ativo'
  }

  getDisplayPrice(): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(this.price)
  }

  async getOptionGroups(): Promise<OptionGroup[]> {
    return OptionGroup.getByProductId(this.id)
  }

  static async getAll(client?: SupabaseClient): Promise<Product[]> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('order', { ascending: true })
      .order('created_at', { ascending: false })

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

  static async create(
    payload: CreateProductPayload,
    files: ProductFiles = {},
    client?: SupabaseClient
  ): Promise<Product> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const createPromise = (async () => {
      const trimmedName = payload.name.trim()
      const trimmedDescription = payload.description?.trim() ?? ''

      const errors = validateProductInput(
        trimmedName,
        trimmedDescription,
        payload.price,
        payload.categoryId,
        files
      )

      if (Object.keys(errors).length > 0) {
        throw new ProductValidationError(errors)
      }

      const { data: maxOrderData } = await supabaseClient
        .from('products')
        .select('order')
        .eq('category_id', payload.categoryId)
        .order('order', { ascending: false })
        .limit(1)
        .single()

      const nextOrder = (maxOrderData?.order ?? -1) + 1

      const { data, error } = await supabaseClient
        .from('products')
        .insert({
          name: trimmedName,
          description: trimmedDescription || null,
          price: payload.price,
          category_id: payload.categoryId,
          status: payload.status,
          order: nextOrder,
          photo_url: null,
        })
        .select()
        .single()

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao criar produto')
      }

      let photoUrl: string | null = null

      const photoFile = files.photo && 'size' in files.photo ? files.photo : null
      if (photoFile && photoFile.size > 0) {
        const photoPath = buildProductPhotoPath(data.id, photoFile)
        const photoType = getFileType(photoFile)

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from(PRODUCT_MEDIA_BUCKET)
          .upload(photoPath, photoFile, {
            upsert: false,
            contentType: photoType,
          })

        if (uploadError || !uploadData) {
          await supabaseClient.from('products').delete().eq('id', data.id)
          throw new Error(uploadError?.message || 'Erro ao enviar foto do produto')
        }

        const { data: publicUrlData } = supabaseClient.storage
          .from(PRODUCT_MEDIA_BUCKET)
          .getPublicUrl(uploadData.path)

        photoUrl = publicUrlData.publicUrl

        const { error: updateError } = await supabaseClient
          .from('products')
          .update({ photo_url: photoUrl })
          .eq('id', data.id)

        if (updateError) {
          await supabaseClient.storage.from(PRODUCT_MEDIA_BUCKET).remove([uploadData.path])
          await supabaseClient.from('products').delete().eq('id', data.id)
          throw new Error('Erro ao atualizar URL da foto')
        }
      }

      return new Product(
        data.id,
        data.name,
        Number(data.price),
        data.category_id,
        data.status,
        data.order ?? 0,
        new Date(data.created_at),
        new Date(data.updated_at),
        data.description ?? undefined,
        photoUrl ?? undefined
      )
    })()

    try {
      return await Promise.race([createPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:product-create-timeout')
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof ProductValidationError) {
        throw error
      }

      console.error('admin-products:product-create-error', error)
      throw error instanceof Error ? error : new Error('Erro ao criar produto')
    }
  }

  static async update(
    id: string,
    payload: UpdateProductPayload,
    files: ProductFiles = {},
    client?: SupabaseClient
  ): Promise<Product> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = (async () => {
      const trimmedName = payload.name.trim()
      const trimmedDescription = payload.description?.trim() ?? ''

      const errors = validateProductInput(
        trimmedName,
        trimmedDescription,
        payload.price,
        payload.categoryId,
        files
      )

      if (Object.keys(errors).length > 0) {
        throw new ProductValidationError(errors)
      }

      const { data: currentProduct, error: fetchError } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !currentProduct) {
        throw new Error(fetchError?.message || 'Produto não encontrado')
      }

      const updates: Record<string, string | number | null> = {
        name: trimmedName,
        description: trimmedDescription || null,
        price: payload.price,
        category_id: payload.categoryId,
        status: payload.status,
      }

      const newUploads: string[] = []
      const filesToRemoveAfterUpdate: string[] = []

      const currentPhotoPath = extractStoragePath(currentProduct.photo_url)

      const photoFile = files.photo && 'size' in files.photo ? files.photo : null

      if (photoFile && photoFile.size > 0) {
        const photoPath = buildProductPhotoPath(id, photoFile)
        const photoType = getFileType(photoFile)

        const { data: uploadData, error: uploadError } = await supabaseClient.storage
          .from(PRODUCT_MEDIA_BUCKET)
          .upload(photoPath, photoFile, {
            upsert: false,
            contentType: photoType,
          })

        if (uploadError || !uploadData) {
          throw new Error(uploadError?.message || 'Erro ao enviar foto do produto')
        }

        const { data: publicUrlData } = supabaseClient.storage
          .from(PRODUCT_MEDIA_BUCKET)
          .getPublicUrl(uploadData.path)

        updates.photo_url = publicUrlData.publicUrl
        newUploads.push(uploadData.path)

        if (currentPhotoPath) {
          filesToRemoveAfterUpdate.push(currentPhotoPath)
        }
      } else if (payload.removePhoto) {
        updates.photo_url = null
        if (currentPhotoPath) {
          filesToRemoveAfterUpdate.push(currentPhotoPath)
        }
      }

      const { data: updatedRow, error: updateError } = await supabaseClient
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (updateError || !updatedRow) {
        if (newUploads.length > 0) {
          await supabaseClient.storage.from(PRODUCT_MEDIA_BUCKET).remove(newUploads)
        }
        throw new Error(updateError?.message || 'Erro ao atualizar produto')
      }

      if (filesToRemoveAfterUpdate.length > 0) {
        const { error: removeError } = await supabaseClient.storage
          .from(PRODUCT_MEDIA_BUCKET)
          .remove(filesToRemoveAfterUpdate)

        if (removeError) {
          console.warn('admin-products:remove-old-photo', {
            productId: id,
            paths: filesToRemoveAfterUpdate,
            error: removeError.message,
          })
        }
      }

      return new Product(
        updatedRow.id,
        updatedRow.name,
        Number(updatedRow.price),
        updatedRow.category_id,
        updatedRow.status,
        updatedRow.order ?? 0,
        new Date(updatedRow.created_at),
        new Date(updatedRow.updated_at),
        updatedRow.description ?? undefined,
        updatedRow.photo_url ?? undefined
      )
    })()

    try {
      return await Promise.race([updatePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:product-update-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof ProductValidationError) {
        throw error
      }

      console.error('admin-products:product-update-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao atualizar produto')
    }
  }

  static async delete(id: string, client?: SupabaseClient): Promise<void> {
    const supabaseClient = client ?? supabase

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const deletePromise = (async () => {
      const { data: product } = await supabaseClient
        .from('products')
        .select('photo_url')
        .eq('id', id)
        .single()

      const { error } = await supabaseClient.from('products').delete().eq('id', id)

      if (error) {
        throw new Error(error.message || 'Erro ao excluir produto')
      }

      if (product?.photo_url) {
        const photoPath = extractStoragePath(product.photo_url)
        if (photoPath) {
          await supabaseClient.storage.from(PRODUCT_MEDIA_BUCKET).remove([photoPath])
        }
      }
    })()

    try {
      await Promise.race([deletePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:product-delete-timeout', { id })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-products:product-delete-error', { id, error })
      throw error instanceof Error ? error : new Error('Erro ao excluir produto')
    }
  }

  static async reorderWithinCategory(
    categoryId: string,
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
          .from('products')
          .update({ order: i })
          .eq('id', orderedIds[i])
          .eq('category_id', categoryId)

        if (error) {
          throw new Error(error.message || 'Erro ao reordenar produtos')
        }
      }
    })()

    try {
      await Promise.race([reorderPromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('admin-products:product-reorder-timeout', {
          categoryId,
          count: orderedIds.length,
        })
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      console.error('admin-products:product-reorder-error', {
        categoryId,
        count: orderedIds.length,
        error,
      })
      throw error instanceof Error ? error : new Error('Erro ao reordenar produtos')
    }
  }
}

function validateProductInput(
  name: string,
  description: string,
  price: number,
  categoryId: string,
  files: ProductFiles
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (!name) {
    errors.name = 'Nome é obrigatório'
  } else if (name.length < 3 || name.length > 60) {
    errors.name = 'Nome deve ter entre 3 e 60 caracteres'
  }

  if (description && description.length > 500) {
    errors.description = 'Descrição deve ter no máximo 500 caracteres'
  }

  if (price < 0) {
    errors.price = 'Preço deve ser maior ou igual a zero'
  }

  if (!categoryId) {
    errors.categoryId = 'Categoria é obrigatória'
  }

  const photoFile = files.photo && 'size' in files.photo ? files.photo : null
  if (photoFile) {
    const photoType = getFileType(photoFile)
    if (photoType && !ALLOWED_IMAGE_TYPES.includes(photoType)) {
      errors.photo = 'Foto deve ser PNG, JPG ou WebP'
    } else if (photoFile.size > MAX_PHOTO_SIZE_BYTES) {
      errors.photo = 'Foto deve ter no máximo 2 MB'
    }
  }

  return errors
}

function getFileType(file: File | Blob): string | undefined {
  if ('type' in file && typeof file.type === 'string') {
    return file.type || undefined
  }
  return undefined
}

function extractStoragePath(url: string | null): string | null {
  if (!url) {
    return null
  }

  try {
    const parsed = new URL(url)
    const parts = parsed.pathname.split('/object/public/')
    if (parts.length < 2) {
      return null
    }
    const path = parts[1]
    const bucketPrefix = `${PRODUCT_MEDIA_BUCKET}/`
    if (path.startsWith(bucketPrefix)) {
      return path.replace(bucketPrefix, '')
    }
    return path
  } catch {
    return null
  }
}

function buildProductPhotoPath(productId: string, file: File | Blob): string {
  let safeExtension = 'webp'

  if ('name' in file && typeof file.name === 'string' && file.name.includes('.')) {
    const parts = file.name.split('.')
    safeExtension = parts[parts.length - 1] || 'webp'
  }

  return `products/${productId}/${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${safeExtension}`
}

export { validateProductInput }
