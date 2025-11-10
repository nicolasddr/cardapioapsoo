'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface OptionGroupData {
  id: string
  name: string
  selectionType: 'single' | 'multiple'
}

interface ProductModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  categories: Array<{ id: string; name: string }>
  optionGroups: OptionGroupData[]
  editProduct?: {
    id: string
    name: string
    description: string | null
    price: number
    categoryId: string
    status: 'Ativo' | 'Inativo'
    photoUrl: string | null
  } | null
  showToast: (title: string, description: string) => void
}

export function ProductModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
  optionGroups,
  editProduct,
  showToast,
}: ProductModalProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [selectedOptionGroups, setSelectedOptionGroups] = useState<string[]>([])
  const [loadingOptionGroups, setLoadingOptionGroups] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (editProduct) {
      setName(editProduct.name)
      setDescription(editProduct.description ?? '')
      setPrice(editProduct.price.toFixed(2))
      setCategoryId(editProduct.categoryId)
      setStatus(editProduct.status)
      loadProductOptionGroups(editProduct.id)
    } else {
      setName('')
      setDescription('')
      setPrice('0.00')
      setCategoryId(categories[0]?.id ?? '')
      setStatus('Ativo')
      setSelectedOptionGroups([])
    }
    setErrors({})
  }, [editProduct, isOpen, categories])

  async function loadProductOptionGroups(productId: string) {
    setLoadingOptionGroups(true)
    try {
      const response = await fetch(`/api/admin/products/${productId}/option-groups`)
      if (response.ok) {
        const data = await response.json()
        setSelectedOptionGroups(data.optionGroupIds || [])
      }
    } catch (error) {
      console.error('Error loading option groups:', error)
    } finally {
      setLoadingOptionGroups(false)
    }
  }

  function toggleOptionGroup(groupId: string) {
    setSelectedOptionGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    )
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedName = name.trim()
    if (!trimmedName) {
      newErrors.name = 'Nome é obrigatório'
    } else if (trimmedName.length < 3 || trimmedName.length > 120) {
      newErrors.name = 'Nome deve ter entre 3 e 120 caracteres'
    }

    const priceValue = parseFloat(price)
    if (isNaN(priceValue) || priceValue <= 0) {
      newErrors.price = 'Preço deve ser maior que zero'
    }

    if (!categoryId) {
      newErrors.categoryId = 'Categoria é obrigatória'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handlePriceChange(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, '').replace(',', '.')
    setPrice(cleaned)
  }

  function handlePriceBlur() {
    const priceValue = parseFloat(price)
    if (!isNaN(priceValue)) {
      setPrice(priceValue.toFixed(2))
    }
    validateForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || isSubmitting) return

    setSubmitting(true)

    try {
      const url = '/api/admin/products'
      const method = editProduct ? 'PATCH' : 'POST'

      const body = {
        ...(editProduct && { id: editProduct.id }),
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categoryId,
        status,
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
        throw new Error(data.error || 'Erro ao salvar produto')
      }

      // Salvar grupos de opcionais se for edição
      if (editProduct) {
        const optionGroupsResponse = await fetch(
          `/api/admin/products/${editProduct.id}/option-groups`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ optionGroupIds: selectedOptionGroups }),
          }
        )

        if (!optionGroupsResponse.ok) {
          const optionGroupsData = await optionGroupsResponse.json()
          throw new Error(optionGroupsData.error || 'Erro ao salvar grupos de opcionais')
        }
      }

      showToast(
        'Sucesso!',
        editProduct ? 'Produto atualizado com sucesso' : 'Produto criado com sucesso'
      )
      onSuccess()
      onClose()
    } catch (error) {
      showToast('Erro', error instanceof Error ? error.message : 'Erro ao salvar produto')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl z-50 max-h-[90vh] overflow-y-auto">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            {editProduct ? 'Editar Produto' : 'Novo Produto'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
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
                  placeholder="Ex: Hambúrguer Especial"
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

              <div className="md:col-span-2">
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Descrição
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Descreva os ingredientes e características do produto"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Preço (R$) *
                </label>
                <input
                  id="price"
                  type="text"
                  value={price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  onBlur={handlePriceBlur}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.price ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  disabled={isSubmitting}
                  aria-invalid={!!errors.price}
                  aria-describedby={errors.price ? 'price-error' : undefined}
                />
                {errors.price && (
                  <p id="price-error" className="text-sm text-red-600 mt-1">
                    {errors.price}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="categoryId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Categoria *
                </label>
                <select
                  id="categoryId"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors.categoryId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.categoryId}
                  aria-describedby={errors.categoryId ? 'category-error' : undefined}
                >
                  {categories.length === 0 ? (
                    <option value="">Nenhuma categoria disponível</option>
                  ) : (
                    categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))
                  )}
                </select>
                {errors.categoryId && (
                  <p id="category-error" className="text-sm text-red-600 mt-1">
                    {errors.categoryId}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  Status *
                </label>
                <select
                  id="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'Ativo' | 'Inativo')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={isSubmitting}
                >
                  <option value="Ativo">Ativo (visível no cardápio)</option>
                  <option value="Inativo">Inativo (oculto)</option>
                </select>
              </div>
            </div>

            {editProduct && (
              <div className="mt-4 border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grupos de Opcionais
                </label>
                {loadingOptionGroups ? (
                  <p className="text-sm text-gray-500">Carregando...</p>
                ) : optionGroups.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Nenhum grupo de opcionais disponível. Crie grupos em &quot;Opcionais&quot; primeiro.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-md p-3">
                    {optionGroups.map((group) => (
                      <label key={group.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedOptionGroups.includes(group.id)}
                          onChange={() => toggleOptionGroup(group.id)}
                          disabled={isSubmitting}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">
                          {group.name}{' '}
                          <span className="text-xs text-gray-500">
                            ({group.selectionType === 'single' ? 'Única' : 'Múltipla'})
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Selecione os grupos de opcionais que estarão disponíveis para este produto.
                </p>
              </div>
            )}

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
                disabled={
                  isSubmitting || Object.keys(errors).length > 0 || categories.length === 0
                }
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : editProduct ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

