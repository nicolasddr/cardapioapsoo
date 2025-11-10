'use client'

import { CartItem } from '@/src/types/cart'
import { CartItemCard } from './CartItemCard'

interface CartItemListProps {
  items: CartItem[]
  onEdit: (item: CartItem) => void
  onRemove: (itemId: string) => void
}

export function CartItemList({
  items,
  onEdit,
  onRemove,
}: CartItemListProps) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-gray-600">
          Seu carrinho está vazio. Adicione itens para continuar.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {items.map((item) => (
        <CartItemCard
          key={item.id}
          item={item}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

