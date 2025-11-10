'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Product } from '@/src/domain/entities/Product'
import { OptionGroup } from '@/src/domain/entities/OptionGroup'
import { Option } from '@/src/domain/entities/Option'
import { CartItem, CartItemOption } from '@/src/types/cart'
import { useCart } from '@/src/contexts/CartContext'
import { OptionGroupSection } from './OptionGroupSection'
import { QuantitySelector } from './QuantitySelector'
import { NotesField } from './NotesField'
import { Toast, useToast } from '@/src/components/ui/Toast'

interface ProductDetailModalProps {
  productId: string | null
  isOpen: boolean
  onClose: () => void
  onProductLoad: (product: Product) => void
  editItem?: CartItem | null
}

function calculateItemTotal(
  productPrice: number,
  selectedOptions: CartItemOption[],
  quantity: number
): number {
  const optionsTotal = selectedOptions.reduce(
    (sum, option) => sum + option.additionalPrice,
    0
  )
  return (productPrice + optionsTotal) * quantity
}

export function ProductDetailModal({
  productId,
  isOpen,
  onClose,
  onProductLoad,
  editItem,
}: ProductDetailModalProps) {
  const [product, setProduct] = useState<Product | null>(null)
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([])
  const [optionsByGroup, setOptionsByGroup] = useState<
    Map<string, Option[]>
  >(new Map())
  const [selectedOptions, setSelectedOptions] = useState<CartItemOption[]>([])
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { addToCart, updateCartItem } = useCart()
  const toast = useToast()

  useEffect(() => {
    if (isOpen && productId) {
      if (editItem) {
        loadProductDataForEdit(editItem)
      } else {
        loadProductData()
      }
    } else {
      resetModal()
    }
  }, [isOpen, productId, editItem])

  async function loadProductDataForEdit(item: CartItem) {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/products/${item.productId}`)
      const productData = await response.json()

      if (productData.error || !productData.product) {
        throw new Error(productData.error || 'Produto não encontrado')
      }

      const loadedProduct = new Product(
        productData.product.id,
        productData.product.name,
        Number(productData.product.price),
        productData.product.category_id,
        productData.product.status,
        productData.product.order ?? 0,
        new Date(productData.product.created_at),
        new Date(productData.product.updated_at),
        productData.product.description ?? undefined,
        productData.product.photo_url ?? undefined
      )

      setProduct(loadedProduct)
      onProductLoad(loadedProduct)

      const groups = await loadedProduct.getOptionGroups()
      setOptionGroups(groups)

      const optionsMap = new Map<string, Option[]>()
      await Promise.all(
        groups.map(async (group) => {
          const options = await group.getOptions()
          optionsMap.set(group.id, options)
        })
      )
      setOptionsByGroup(optionsMap)

      setQuantity(item.quantity)
      setNotes(item.notes)
      setSelectedOptions(item.selectedOptions)
      setHasUnsavedChanges(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar produto'
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadProductData() {
    if (!productId) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/products/${productId}`)
      const productData = await response.json()

      if (productData.error || !productData.product) {
        throw new Error(productData.error || 'Produto não encontrado')
      }

      const loadedProduct = new Product(
        productData.product.id,
        productData.product.name,
        Number(productData.product.price),
        productData.product.category_id,
        productData.product.status,
        productData.product.order ?? 0,
        new Date(productData.product.created_at),
        new Date(productData.product.updated_at),
        productData.product.description ?? undefined,
        productData.product.photo_url ?? undefined
      )

      setProduct(loadedProduct)
      onProductLoad(loadedProduct)

      const groups = await loadedProduct.getOptionGroups()
      setOptionGroups(groups)

      const optionsMap = new Map<string, Option[]>()
      await Promise.all(
        groups.map(async (group) => {
          const options = await group.getOptions()
          optionsMap.set(group.id, options)

          if (group.getSelectionType() === 'single' && options.length > 0) {
            const firstOption = options[0]
            setSelectedOptions((prev) => [
              ...prev.filter((opt) => opt.optionGroupId !== group.id),
              {
                optionGroupId: group.id,
                optionGroupName: group.getName(),
                optionId: firstOption.id,
                optionName: firstOption.getName(),
                additionalPrice: firstOption.getAdditionalPrice(),
              },
            ])
          }
        })
      )
      setOptionsByGroup(optionsMap)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar produto'
      )
    } finally {
      setLoading(false)
    }
  }

  function resetModal() {
    setProduct(null)
    setOptionGroups([])
    setOptionsByGroup(new Map())
    setSelectedOptions([])
    setQuantity(1)
    setNotes('')
    setError(null)
    setPhotoError(false)
    setHasUnsavedChanges(false)
  }

  function handleOptionChange(optionId: string, selected: boolean) {
    setHasUnsavedChanges(true)
    const group = optionGroups.find((g) =>
      optionsByGroup.get(g.id)?.some((opt) => opt.id === optionId)
    )
    if (!group) return

    const option = optionsByGroup.get(group.id)?.find((opt) => opt.id === optionId)
    if (!option) return

    if (selected) {
      if (group.getSelectionType() === 'single') {
        setSelectedOptions((prev) => [
          ...prev.filter((opt) => opt.optionGroupId !== group.id),
          {
            optionGroupId: group.id,
            optionGroupName: group.getName(),
            optionId: option.id,
            optionName: option.getName(),
            additionalPrice: option.getAdditionalPrice(),
          },
        ])
      } else {
        setSelectedOptions((prev) => [
          ...prev,
          {
            optionGroupId: group.id,
            optionGroupName: group.getName(),
            optionId: option.id,
            optionName: option.getName(),
            additionalPrice: option.getAdditionalPrice(),
          },
        ])
      }
    } else {
      setSelectedOptions((prev) =>
        prev.filter((opt) => opt.optionId !== optionId)
      )
    }
  }

  function handleQuantityChange(newQuantity: number) {
    setHasUnsavedChanges(true)
    setQuantity(newQuantity)
  }

  function handleNotesChange(newNotes: string) {
    setHasUnsavedChanges(true)
    setNotes(newNotes)
  }

  function handleClose() {
    if (hasUnsavedChanges && editItem) {
      resetModal()
    }
    onClose()
  }

  function handleAddToCart() {
    if (!product) return

    const totalPrice = calculateItemTotal(
      product.price,
      selectedOptions,
      quantity
    )

    if (editItem) {
      updateCartItem(editItem.id, {
        quantity,
        selectedOptions,
        notes,
        totalPrice,
      })
      toast.showToast('Item atualizado!', `${product.name} atualizado no carrinho`)
    } else {
      addToCart({
        productId: product.id,
        productName: product.name,
        productPrice: product.price,
        quantity,
        selectedOptions,
        notes,
      })
      toast.showToast('Item adicionado ao carrinho!', `${product.name} adicionado`)
    }

    onClose()
    resetModal()
  }

  const totalPrice = product
    ? calculateItemTotal(product.price, selectedOptions, quantity)
    : 0

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-50 p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              </div>
            )}

            {error && (
              <div className="py-12 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
                >
                  Fechar
                </button>
              </div>
            )}

            {!loading && !error && product && (
              <>
                <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                  <span className="sr-only">Fechar</span>
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </Dialog.Close>

                <div className="space-y-6">
                  {product.photoUrl && !photoError && (
                    <div className="relative w-full h-64 md:h-96 mb-6 rounded-lg overflow-hidden">
                      <Image
                        src={product.photoUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        onError={() => {
                          setPhotoError(true)
                        }}
                      />
                    </div>
                  )}

                  <div>
                    <Dialog.Title className="text-2xl font-bold text-gray-900 mb-2">
                      {product.name}
                    </Dialog.Title>
                    {product.description && (
                      <p className="text-gray-600 mb-4">{product.description}</p>
                    )}
                    <p className="text-2xl font-bold text-green-600">
                      {product.getDisplayPrice()}
                    </p>
                  </div>

                  {optionGroups.length > 0 && (
                    <div className="space-y-6 border-t border-gray-200 pt-6">
                      {optionGroups.map((group) => {
                        const options = optionsByGroup.get(group.id) ?? []
                        return (
                          <OptionGroupSection
                            key={group.id}
                            group={group}
                            options={options}
                            selectedOptions={selectedOptions}
                            onSelectionChange={handleOptionChange}
                          />
                        )
                      })}
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-6 space-y-4">
                    <QuantitySelector
                      value={quantity}
                      onChange={handleQuantityChange}
                    />

                    <NotesField value={notes} onChange={handleNotesChange} />

                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div>
                        <span className="text-sm text-gray-600">Total:</span>
                        <p className="text-2xl font-bold text-green-600">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totalPrice)}
                        </p>
                      </div>
                      <button
                        onClick={handleAddToCart}
                        className="px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                      >
                        {editItem ? 'Salvar Alterações' : 'Adicionar ao Pedido'} -{' '}
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(totalPrice)}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

