'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface OptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  optionGroups: Array<{ id: string; name: string }>
  editOption?: {
    id: string
    name: string
    additionalPrice: number
    optionGroupId: string
  } | null
  showToast: (title: string, description: string) => void
}

export function OptionModal({
  isOpen,
  onClose,
  onSuccess,
  optionGroups,
  editOption,
  showToast,
}: OptionModalProps) {
  const [name, setName] = useState('')
  const [additionalPrice, setAdditionalPrice] = useState('')
  const [optionGroupId, setOptionGroupId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editOption) {
      setName(editOption.name)
      setAdditionalPrice(editOption.additionalPrice.toFixed(2))
      setOptionGroupId(editOption.optionGroupId)
    } else {
      setName('')
      setAdditionalPrice('0.00')
      setOptionGroupId(optionGroups[0]?.id ?? '')
    }
    setErrors({})
  }, [editOption, isOpen, optionGroups])

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'Nome é obrigatório'
    } else if (trimmedName.length < 3 || trimmedName.length > 60) {
      newErrors.name = 'Nome deve ter entre 3 e 60 caracteres'
    }

    const price = parseFloat(additionalPrice)
    if (isNaN(price) || price < 0) {
      newErrors.additionalPrice = 'Preço adicional deve ser maior ou igual a zero'
    }

    if (!optionGroupId) {
      newErrors.optionGroupId = 'Grupo é obrigatório'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handlePriceChange(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
    setAdditionalPrice(cleaned)
  }

  function handlePriceBlur() {
    const price = parseFloat(additionalPrice)
    if (!isNaN(price)) {
      setAdditionalPrice(price.toFixed(2))
    }
    validateForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || isSubmitting) return

    setSubmitting(true)

    try {
      const url = '/api/admin/options'
      const method = editOption ? 'PATCH' : 'POST'
      const body = editOption
        ? {
            id: editOption.id,
            name: name.trim(),
            additionalPrice: parseFloat(additionalPrice),
            optionGroupId,
          }
        : {
            name: name.trim(),
            additionalPrice: parseFloat(additionalPrice),
            optionGroupId,
          }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details)
        }
        throw new Error(data.error || 'Erro ao salvar opcional')
      }

      showToast(
        'Sucesso!',
        editOption ? 'Opcional atualizado com sucesso' : 'Opcional criado com sucesso'
      )
      onSuccess()
      onClose()
    } catch (error) {
      showToast('Erro', error instanceof Error ? error.message : 'Erro ao salvar opcional')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            {editOption ? 'Editar Opcional' : 'Novo Opcional'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nome *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => validateForm()}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: Bacon Extra"
                disabled={isSubmitting}
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="text-sm text-red-600 mt-1">
                  {errors.name}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="additionalPrice"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Preço Adicional (R$) *
              </label>
              <input
                id="additionalPrice"
                type="text"
                value={additionalPrice}
                onChange={(e) => handlePriceChange(e.target.value)}
                onBlur={handlePriceBlur}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.additionalPrice ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
                aria-invalid={!!errors.additionalPrice}
                aria-describedby={errors.additionalPrice ? 'price-error' : undefined}
              />
              {errors.additionalPrice && (
                <p id="price-error" className="text-sm text-red-600 mt-1">
                  {errors.additionalPrice}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Use 0.00 para opcionais sem custo adicional
              </p>
            </div>

            <div>
              <label
                htmlFor="optionGroupId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Grupo *
              </label>
              <select
                id="optionGroupId"
                value={optionGroupId}
                onChange={(e) => setOptionGroupId(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.optionGroupId ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
                aria-invalid={!!errors.optionGroupId}
                aria-describedby={errors.optionGroupId ? 'group-error' : undefined}
              >
                {optionGroups.length === 0 ? (
                  <option value="">Nenhum grupo disponível</option>
                ) : (
                  optionGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))
                )}
              </select>
              {errors.optionGroupId && (
                <p id="group-error" className="text-sm text-red-600 mt-1">
                  {errors.optionGroupId}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0 || optionGroups.length === 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : editOption ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

