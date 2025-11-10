'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editCategory?: {
    id: string
    name: string
    active: boolean
  } | null
  showToast: (title: string, description: string) => void
}

export function CategoryModal({
  isOpen,
  onClose,
  onSuccess,
  editCategory,
  showToast,
}: CategoryModalProps) {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editCategory) {
      setName(editCategory.name)
    } else {
      setName('')
    }
    setErrors({})
  }, [editCategory, isOpen])

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'Nome é obrigatório'
    } else if (trimmedName.length < 3 || trimmedName.length > 60) {
      newErrors.name = 'Nome deve ter entre 3 e 60 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || isSubmitting) return

    setSubmitting(true)

    try {
      const url = '/api/admin/categories'
      const method = editCategory ? 'PATCH' : 'POST'
      const body = editCategory
        ? { id: editCategory.id, name: name.trim(), active: true }
        : { name: name.trim(), active: true }

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
        throw new Error(data.error || 'Erro ao salvar categoria')
      }

      showToast(
        'Sucesso!',
        editCategory ? 'Categoria atualizada com sucesso' : 'Categoria criada com sucesso'
      )
      onSuccess()
      onClose()
    } catch (error) {
      showToast('Erro', error instanceof Error ? error.message : 'Erro ao salvar categoria')
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
            {editCategory ? 'Editar Categoria' : 'Nova Categoria'}
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
                placeholder="Ex: Bebidas, Lanches, Sobremesas"
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
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : editCategory ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

