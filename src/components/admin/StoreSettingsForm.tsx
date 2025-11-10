'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useToast, Toast } from '@/src/components/ui/Toast'

interface StoreSettingsData {
  id: string
  name: string
  description: string | null
  openingHours: string | null
  logoUrl: string | null
  coverUrl: string | null
  updatedAt: string
}

interface StoreSettingsFormProps {
  initialData: StoreSettingsData
}

interface FieldErrors {
  name?: string
  description?: string
  openingHours?: string
  logo?: string
  cover?: string
  general?: string
}

export function StoreSettingsForm({ initialData }: StoreSettingsFormProps) {
  const toast = useToast()

  const [name, setName] = useState(initialData.name)
  const [description, setDescription] = useState(initialData.description ?? '')
  const [openingHours, setOpeningHours] = useState(initialData.openingHours ?? '')

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(initialData.logoUrl)
  const [coverPreview, setCoverPreview] = useState<string | null>(initialData.coverUrl)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [removeCover, setRemoveCover] = useState(false)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [isSaving, setIsSaving] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null)

  const [baseline, setBaseline] = useState(() => ({
    name: initialData.name,
    description: initialData.description ?? '',
    openingHours: initialData.openingHours ?? '',
    logoUrl: initialData.logoUrl,
    coverUrl: initialData.coverUrl,
    updatedAt: initialData.updatedAt,
  }))

  useEffect(() => {
    const hasChanges =
      name.trim() !== baseline.name.trim() ||
      (description ?? '').trim() !== baseline.description.trim() ||
      (openingHours ?? '').trim() !== baseline.openingHours.trim() ||
      logoFile !== null ||
      coverFile !== null ||
      removeLogo !== false ||
      removeCover !== false

    setHasUnsavedChanges(hasChanges)
  }, [
    name,
    description,
    openingHours,
    logoFile,
    coverFile,
    removeLogo,
    removeCover,
    baseline,
  ])

  useEffect(() => {
    const beforeUnloadHandler = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges && !isSaving) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', beforeUnloadHandler)
    return () => window.removeEventListener('beforeunload', beforeUnloadHandler)
  }, [hasUnsavedChanges, isSaving])

  useEffect(() => {
    if (!hasUnsavedChanges && !isSaving) {
      return
    }

    const handleLinkClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a') as HTMLAnchorElement | null

      if (!anchor) {
        return
      }

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return
      }

      if (href.startsWith('http') && !href.includes(window.location.host)) {
        return
      }

      if (isSaving) {
        event.preventDefault()
        toast.showToast('Upload em andamento', 'Aguarde a conclusão antes de sair da página.')
        return
      }

      event.preventDefault()
      setPendingNavigation(anchor.href)
      setShowLeaveModal(true)
    }

    document.addEventListener('click', handleLinkClick)
    return () => document.removeEventListener('click', handleLinkClick)
  }, [hasUnsavedChanges, isSaving, toast])

  useEffect(() => () => {
    if (logoFile) {
      URL.revokeObjectURL(logoPreview ?? '')
    }
    if (coverFile) {
      URL.revokeObjectURL(coverPreview ?? '')
    }
  }, [logoFile, coverFile, logoPreview, coverPreview])

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setErrors((prev) => ({ ...prev, logo: undefined }))

    if (!file) {
      setLogoFile(null)
      setLogoPreview(baseline.logoUrl)
      setRemoveLogo(false)
      return
    }

    const validationError = validateFile(file, 'logo')
    if (validationError) {
      setErrors((prev) => ({ ...prev, logo: validationError }))
      return
    }

    setLogoFile(file)
    setRemoveLogo(false)
    const previewUrl = URL.createObjectURL(file)
    setLogoPreview(previewUrl)
  }

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setErrors((prev) => ({ ...prev, cover: undefined }))

    if (!file) {
      setCoverFile(null)
      setCoverPreview(baseline.coverUrl)
      setRemoveCover(false)
      return
    }

    const validationError = validateFile(file, 'cover')
    if (validationError) {
      setErrors((prev) => ({ ...prev, cover: validationError }))
      return
    }

    setCoverFile(file)
    setRemoveCover(false)
    const previewUrl = URL.createObjectURL(file)
    setCoverPreview(previewUrl)
  }

  const handleRemoveLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
    setRemoveLogo(true)
  }

  const handleRemoveCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    setRemoveCover(true)
  }

  const resetForm = (nextData?: Partial<StoreSettingsData>) => {
    const data = {
      name: nextData?.name ?? baseline.name,
      description: nextData?.description ?? baseline.description,
      openingHours: nextData?.openingHours ?? baseline.openingHours,
      logoUrl: nextData?.logoUrl ?? baseline.logoUrl,
      coverUrl: nextData?.coverUrl ?? baseline.coverUrl,
      updatedAt: nextData?.updatedAt ?? baseline.updatedAt,
    }

    setBaseline(data)
    setName(data.name)
    setDescription(data.description ?? '')
    setOpeningHours(data.openingHours ?? '')
    setLogoFile(null)
    setCoverFile(null)
    setLogoPreview(data.logoUrl ?? null)
    setCoverPreview(data.coverUrl ?? null)
    setRemoveLogo(false)
    setRemoveCover(false)
    setErrors({})
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSaving) {
      return
    }

    setErrors({})

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const trimmedOpeningHours = openingHours.trim()

    const fieldErrors: FieldErrors = {}

    if (!trimmedName) {
      fieldErrors.name = 'Nome é obrigatório'
    } else if (trimmedName.length < 3 || trimmedName.length > 60) {
      fieldErrors.name = 'Nome deve ter entre 3 e 60 caracteres'
    }

    if (trimmedDescription.length > 500) {
      fieldErrors.description = 'Descrição deve ter no máximo 500 caracteres'
    }

    if (trimmedOpeningHours.length > 120) {
      fieldErrors.openingHours = 'Horário deve ter no máximo 120 caracteres'
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors)
      return
    }

    const formData = new FormData()
    formData.append('name', trimmedName)
    formData.append('description', trimmedDescription)
    formData.append('openingHours', trimmedOpeningHours)
    formData.append('removeLogo', removeLogo ? 'true' : 'false')
    formData.append('removeCover', removeCover ? 'true' : 'false')

    if (logoFile) {
      formData.append('logo', logoFile)
    }

    if (coverFile) {
      formData.append('cover', coverFile)
    }

    setIsSaving(true)
    setStatusMessage(logoFile || coverFile ? 'Enviando arquivos...' : 'Salvando alterações...')

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 31000)

      const response = await fetch('/api/admin/store-settings', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        credentials: 'same-origin',
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const result = await response.json().catch(() => ({ error: 'Erro inesperado' }))

        if (response.status === 400 && result?.details) {
          setErrors(result.details)
        }

        toast.showToast(
          'Erro ao salvar',
          result?.error || 'Não foi possível salvar as alterações. Tente novamente.'
        )
        setIsSaving(false)
        setStatusMessage(null)
        return
      }

      const result = await response.json()
      const data = result?.data

      toast.showToast('Configurações atualizadas', 'O cardápio será atualizado em instantes.')

      resetForm({
        name: data?.name ?? trimmedName,
        description: data?.description ?? trimmedDescription,
        openingHours: data?.openingHours ?? trimmedOpeningHours,
        logoUrl: data?.logoUrl ?? null,
        coverUrl: data?.coverUrl ?? null,
        updatedAt: data?.updatedAt ?? new Date().toISOString(),
      })

      setStatusMessage(null)
      setIsSaving(false)
    } catch (error) {
      console.error('store-settings:submit-error', error)
      setStatusMessage(null)
      setIsSaving(false)
      toast.showToast('Erro ao salvar', 'Não foi possível salvar as alterações. Tente novamente.')
    }
  }

  const confirmLeave = () => {
    if (!pendingNavigation) {
      setShowLeaveModal(false)
      return
    }

    setShowLeaveModal(false)
    setPendingNavigation(null)
    setHasUnsavedChanges(false)
    window.location.href = pendingNavigation
  }

  const cancelLeave = () => {
    setPendingNavigation(null)
    setShowLeaveModal(false)
  }

  const lastUpdatedText = useMemo(() => {
    try {
      const date = new Date(baseline.updatedAt)
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date)
    } catch {
      return 'Não disponível'
    }
  }, [baseline.updatedAt])

  return (
    <>
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações da Loja</h1>
          <p className="text-sm text-gray-600 mt-1">
            Personalize as informações exibidas no cardápio digital.
          </p>
          <p className="text-xs text-gray-500 mt-2">Última atualização: {lastUpdatedText}</p>
          {hasUnsavedChanges && !isSaving && (
            <p className="text-xs text-amber-600 mt-2">
              Existem alterações não salvas.
            </p>
          )}
          {statusMessage && (
            <p className="text-xs text-green-600 mt-2">{statusMessage}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nome do restaurante <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  setErrors((prev) => ({ ...prev, name: undefined }))
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Ex: Restaurante Saboroso"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                disabled={isSaving}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descrição
              </label>
              <textarea
                id="description"
                name="description"
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setErrors((prev) => ({ ...prev, description: undefined }))
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                rows={4}
                placeholder="Apresente seu restaurante em até 500 caracteres"
                aria-invalid={!!errors.description}
                aria-describedby={errors.description ? 'description-error' : undefined}
                disabled={isSaving}
              />
              <p className="mt-1 text-xs text-gray-500">
                {description.trim().length > 0
                  ? `${description.trim().length} / 500`
                  : 'Descrição não informada'}
              </p>
              {errors.description && (
                <p id="description-error" className="mt-1 text-sm text-red-600">
                  {errors.description}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="openingHours" className="block text-sm font-medium text-gray-700">
                Horário de funcionamento
              </label>
              <input
                id="openingHours"
                name="openingHours"
                type="text"
                value={openingHours}
                onChange={(event) => {
                  setOpeningHours(event.target.value)
                  setErrors((prev) => ({ ...prev, openingHours: undefined }))
                }}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-green-500 focus:ring-green-500"
                placeholder="Ex: Seg-Dom: 11h às 22h"
                aria-invalid={!!errors.openingHours}
                aria-describedby={errors.openingHours ? 'openingHours-error' : undefined}
                disabled={isSaving}
              />
              <p className="mt-1 text-xs text-gray-500">
                {openingHours.trim().length > 0
                  ? `${openingHours.trim().length} / 120`
                  : 'Horário não configurado'}
              </p>
              {errors.openingHours && (
                <p id="openingHours-error" className="mt-1 text-sm text-red-600">
                  {errors.openingHours}
                </p>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-6">
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">Logo</h2>
              <p className="text-sm text-gray-500">
                PNG, JPG ou WebP até 1 MB. Proporção sugerida 1:1.
              </p>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Pré-visualização do logo"
                      fill
                      className="object-contain"
                    />
                  ) : (
                    <span className="text-xs text-gray-400 text-center px-2">
                      Logo não configurado
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleLogoChange}
                      disabled={isSaving}
                    />
                    Selecionar logo
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    disabled={isSaving || (!logoPreview && !logoFile && !baseline.logoUrl)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remover logo
                  </button>
                  {errors.logo && (
                    <p className="text-xs text-red-600">{errors.logo}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900">Imagem de capa</h2>
              <p className="text-sm text-gray-500">
                PNG, JPG ou WebP até 2 MB. Proporção sugerida 16:9.
              </p>
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="relative w-full md:w-80 h-40 border border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
                  {coverPreview ? (
                    <Image
                      src={coverPreview}
                      alt="Pré-visualização da capa"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-gray-400 text-center px-2">
                        Capa não configurada
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleCoverChange}
                      disabled={isSaving}
                    />
                    Selecionar capa
                  </label>
                  <button
                    type="button"
                    onClick={handleRemoveCover}
                    disabled={isSaving || (!coverPreview && !coverFile && !baseline.coverUrl)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remover capa
                  </button>
                  {errors.cover && (
                    <p className="text-xs text-red-600">{errors.cover}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {errors.general && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-900">{errors.general}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              onClick={() => resetForm()}
              disabled={isSaving}
            >
              Descartar alterações
            </button>
            <button
              type="submit"
              disabled={isSaving || !hasUnsavedChanges}
              className="inline-flex items-center px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-md shadow-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>

      {showLeaveModal && hasUnsavedChanges && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Descartar alterações?</h3>
            <p className="text-sm text-gray-600">
              Você possui alterações não salvas. Tem certeza de que deseja sair desta página?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                onClick={cancelLeave}
              >
                Continuar editando
              </button>
              <button
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                onClick={confirmLeave}
              >
                Sair sem salvar
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

function validateFile(file: File, type: 'logo' | 'cover') {
  const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return type === 'logo'
      ? 'Logo deve ser PNG, JPG ou WebP'
      : 'Imagem de capa deve ser PNG, JPG ou WebP'
  }

  const maxSize = type === 'logo' ? 1 * 1024 * 1024 : 2 * 1024 * 1024
  if (file.size > maxSize) {
    return type === 'logo'
      ? 'Logo deve ter no máximo 1 MB'
      : 'Imagem de capa deve ter no máximo 2 MB'
  }

  return undefined
}
