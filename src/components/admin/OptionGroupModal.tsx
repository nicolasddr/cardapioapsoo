'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface OptionGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editGroup?: {
    id: string
    name: string
    selectionType: 'single' | 'multiple'
  } | null
  showToast: (title: string, description: string) => void
}

export function OptionGroupModal({
  isOpen,
  onClose,
  onSuccess,
  editGroup,
  showToast,
}: OptionGroupModalProps) {
  const [name, setName] = useState('')
  const [selectionType, setSelectionType] = useState<'single' | 'multiple'>('single')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editGroup) {
      setName(editGroup.name)
      setSelectionType(editGroup.selectionType)
    } else {
      setName('')
      setSelectionType('single')
    }
    setErrors({})
  }, [editGroup, isOpen])

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'Nome é obrigatório'
    } else if (trimmedName.length < 3 || trimmedName.length > 40) {
      newErrors.name = 'Nome deve ter entre 3 e 40 caracteres'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || isSubmitting) return

    setSubmitting(true)

    try {
      const url = '/api/admin/option-groups'
      const method = editGroup ? 'PATCH' : 'POST'
      const body = editGroup
        ? { id: editGroup.id, name: name.trim(), selectionType }
        : { name: name.trim(), selectionType }

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
        throw new Error(data.error || 'Erro ao salvar grupo')
      }

      showToast(
        'Sucesso!',
        editGroup ? 'Grupo atualizado com sucesso' : 'Grupo criado com sucesso'
      )
      onSuccess()
      onClose()
    } catch (error) {
      showToast(
        'Erro',
        error instanceof Error ? error.message : 'Erro ao salvar grupo'
      )
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
            {editGroup ? 'Editar Grupo de Opcionais' : 'Novo Grupo de Opcionais'}
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
                placeholder="Ex: Adicionais"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Seleção *
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="single"
                    checked={selectionType === 'single'}
                    onChange={(e) => setSelectionType(e.target.value as 'single')}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    Seleção Única (cliente escolhe apenas uma opção)
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="multiple"
                    checked={selectionType === 'multiple'}
                    onChange={(e) => setSelectionType(e.target.value as 'multiple')}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">
                    Seleção Múltipla (cliente pode escolher várias opções)
                  </span>
                </label>
              </div>
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
                {isSubmitting ? 'Salvando...' : editGroup ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

