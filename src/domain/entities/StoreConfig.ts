import { supabase } from '@/lib/supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

const STORE_MEDIA_BUCKET = 'store-media'
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_LOGO_SIZE_BYTES = 1 * 1024 * 1024
const MAX_COVER_SIZE_BYTES = 2 * 1024 * 1024

export class StoreConfigValidationError extends Error {
  constructor(public readonly fieldErrors: Record<string, string>) {
    super('Store settings validation failed')
    this.name = 'StoreConfigValidationError'
  }
}

export interface UpdateStoreConfigPayload {
  name: string
  description?: string | null
  openingHours?: string | null
  removeLogo?: boolean
  removeCover?: boolean
}

export interface UpdateStoreConfigFiles {
  logo?: File | Blob | null
  cover?: File | Blob | null
}

interface UpdateOptions {
  files?: UpdateStoreConfigFiles
  client?: SupabaseClient
}

export class StoreConfig {
  constructor(
    public id: string,
    public name: string,
    public logoUrl: string | null,
    public coverUrl: string | null,
    public description: string | null,
    public openingHours: string | null,
    public createdAt: Date,
    public updatedAt: Date
  ) {}

  getLogoUrl(): string | null {
    return this.logoUrl
  }

  getCoverUrl(): string | null {
    return this.coverUrl
  }

  getName(): string {
    return this.name
  }

  getDescription(): string | null {
    return this.description
  }

  getOpeningHours(): string | null {
    return this.openingHours
  }

  static async getSettings(client?: SupabaseClient): Promise<StoreConfig> {
    const supabaseClient = client ?? supabase

    const { data, error } = await supabaseClient
      .from('store_settings')
      .select('*')
      .limit(1)
      .single()

    if (error) {
      throw new Error(`Error fetching store settings: ${error.message}`)
    }

    if (!data) {
      throw new Error('Store settings not found')
    }

    return new StoreConfig(
      data.id,
      data.name,
      data.logo_url ?? null,
      data.cover_url ?? null,
      data.description ?? null,
      data.opening_hours ?? null,
      new Date(data.created_at),
      new Date(data.updated_at)
    )
  }

  static async update(
    payload: UpdateStoreConfigPayload,
    options: UpdateOptions = {}
  ): Promise<StoreConfig> {
    const client = options.client ?? supabase
    const files = options.files ?? {}

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT')), 30000)
    })

    const updatePromise = (async () => {
      const {
        name,
        description = null,
        openingHours = null,
        removeLogo = false,
        removeCover = false,
      } = payload

      const trimmedName = name?.trim() ?? ''
      const trimmedDescription = description?.trim() ?? ''
      const trimmedOpeningHours = openingHours?.trim() ?? ''

      const validationErrors = validateStoreSettingsInput(
        trimmedName,
        trimmedDescription,
        trimmedOpeningHours,
        files
      )

      if (Object.keys(validationErrors).length > 0) {
        throw new StoreConfigValidationError(validationErrors)
      }

      const { data: currentSettings, error: fetchError } = await client
        .from('store_settings')
        .select('*')
        .limit(1)
        .single()

      if (fetchError || !currentSettings) {
        throw new Error(fetchError?.message || 'Configurações não encontradas')
      }

      const updates: Record<string, string | null> = {
        name: trimmedName,
        description: trimmedDescription || null,
        opening_hours: trimmedOpeningHours || null,
      }

      const newUploads: string[] = []
      const filesToRemoveAfterUpdate: string[] = []

      const currentLogoPath = extractStoragePath(currentSettings.logo_url)
      const currentCoverPath = extractStoragePath(currentSettings.cover_url)

      const logoFile = files.logo && 'size' in files.logo ? files.logo : null
      const coverFile = files.cover && 'size' in files.cover ? files.cover : null

      if (logoFile && logoFile.size > 0) {
        const logoPath = buildObjectPath('logo', logoFile)
        const logoType = getFileType(logoFile)
        
        const { data: uploadData, error: uploadError } = await client.storage
          .from(STORE_MEDIA_BUCKET)
          .upload(logoPath, logoFile, {
            upsert: false,
            contentType: logoType,
          })

        if (uploadError || !uploadData) {
          throw new Error(uploadError?.message || 'Erro ao enviar logo')
        }

        const { data: publicUrlData } = client.storage
          .from(STORE_MEDIA_BUCKET)
          .getPublicUrl(uploadData.path)

        updates.logo_url = publicUrlData.publicUrl
        newUploads.push(uploadData.path)

        if (currentLogoPath) {
          filesToRemoveAfterUpdate.push(currentLogoPath)
        }
      } else if (removeLogo) {
        updates.logo_url = null
        if (currentLogoPath) {
          filesToRemoveAfterUpdate.push(currentLogoPath)
        }
      }

      if (coverFile && coverFile.size > 0) {
        const coverPath = buildObjectPath('cover', coverFile)
        const coverType = getFileType(coverFile)
        
        const { data: uploadData, error: uploadError } = await client.storage
          .from(STORE_MEDIA_BUCKET)
          .upload(coverPath, coverFile, {
            upsert: false,
            contentType: coverType,
          })

        if (uploadError || !uploadData) {
          if (newUploads.length > 0) {
            await client.storage.from(STORE_MEDIA_BUCKET).remove(newUploads)
          }
          throw new Error(uploadError?.message || 'Erro ao enviar imagem de capa')
        }

        const { data: publicUrlData } = client.storage
          .from(STORE_MEDIA_BUCKET)
          .getPublicUrl(uploadData.path)

        updates.cover_url = publicUrlData.publicUrl
        newUploads.push(uploadData.path)

        if (currentCoverPath) {
          filesToRemoveAfterUpdate.push(currentCoverPath)
        }
      } else if (removeCover) {
        updates.cover_url = null
        if (currentCoverPath) {
          filesToRemoveAfterUpdate.push(currentCoverPath)
        }
      }

      const { data: updatedRow, error: updateError } = await client
        .from('store_settings')
        .update({
          name: updates.name,
          description: updates.description,
          opening_hours: updates.opening_hours,
          logo_url: updates.logo_url ?? currentSettings.logo_url,
          cover_url: updates.cover_url ?? currentSettings.cover_url,
        })
        .eq('id', currentSettings.id)
        .select()
        .single()

      if (updateError || !updatedRow) {
        if (newUploads.length > 0) {
          await client.storage.from(STORE_MEDIA_BUCKET).remove(newUploads)
        }
        throw new Error(updateError?.message || 'Erro ao atualizar configurações')
      }

      if (filesToRemoveAfterUpdate.length > 0) {
        const { error: removeError } = await client.storage
          .from(STORE_MEDIA_BUCKET)
          .remove(filesToRemoveAfterUpdate)

        if (removeError) {
          console.warn('store-settings:remove-old-files', {
            paths: filesToRemoveAfterUpdate,
            error: removeError.message,
          })
        }
      }

      return new StoreConfig(
        updatedRow.id,
        updatedRow.name,
        updatedRow.logo_url ?? null,
        updatedRow.cover_url ?? null,
        updatedRow.description ?? null,
        updatedRow.opening_hours ?? null,
        new Date(updatedRow.created_at),
        new Date(updatedRow.updated_at)
      )
    })()

    try {
      return await Promise.race([updatePromise, timeoutPromise])
    } catch (error) {
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error('store-settings:update-timeout')
        throw new Error('Tempo de espera esgotado. Tente novamente.')
      }

      if (error instanceof StoreConfigValidationError) {
        throw error
      }

      console.error('store-settings:update-error', error)
      throw error instanceof Error
        ? error
        : new Error('Erro ao atualizar configurações da loja')
    }
  }
}

function getFileType(file: File | Blob): string | undefined {
  if ('type' in file && typeof file.type === 'string') {
    return file.type || undefined
  }
  return undefined
}

function validateStoreSettingsInput(
  name: string,
  description: string,
  openingHours: string,
  files: UpdateStoreConfigFiles
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

  if (openingHours && openingHours.length > 120) {
    errors.openingHours = 'Horário deve ter no máximo 120 caracteres'
  }

  const logoFile = files.logo && 'size' in files.logo ? files.logo : null
  const coverFile = files.cover && 'size' in files.cover ? files.cover : null

  if (logoFile) {
    const logoType = getFileType(logoFile)
    if (logoType && !ALLOWED_IMAGE_TYPES.includes(logoType)) {
      errors.logo = 'Logo deve ser PNG, JPG ou WebP'
    } else if (logoFile.size > MAX_LOGO_SIZE_BYTES) {
      errors.logo = 'Logo deve ter no máximo 1 MB'
    }
  }

  if (coverFile) {
    const coverType = getFileType(coverFile)
    if (coverType && !ALLOWED_IMAGE_TYPES.includes(coverType)) {
      errors.cover = 'Imagem de capa deve ser PNG, JPG ou WebP'
    } else if (coverFile.size > MAX_COVER_SIZE_BYTES) {
      errors.cover = 'Imagem de capa deve ter no máximo 2 MB'
    }
  }

  return errors
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
    const bucketPrefix = `${STORE_MEDIA_BUCKET}/`
    if (path.startsWith(bucketPrefix)) {
      return path.replace(bucketPrefix, '')
    }
    return path
  } catch {
    return null
  }
}

function buildObjectPath(prefix: 'logo' | 'cover', file: File | Blob): string {
  let safeExtension = 'webp'
  
  // Verifica se o objeto tem propriedade 'name' (tipicamente File do browser ou FormData do Node)
  if ('name' in file && typeof file.name === 'string' && file.name.includes('.')) {
    const parts = file.name.split('.')
    safeExtension = parts[parts.length - 1] || 'webp'
  }
  
  return `store-settings/${prefix}-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)}.${safeExtension}`
}

export { validateStoreSettingsInput, extractStoragePath }

