'use client'

import { CartItem } from '@/src/types/cart'

interface CartItemCardProps {
  item: CartItem
  onEdit: (item: CartItem) => void
  onRemove: (itemId: string) => void
}

function formatOptionDisplay(option: CartItem['selectedOptions'][0]): string {
  if (option.additionalPrice === 0) {
    return `${option.optionName} (Grátis)`
  }
  return `${option.optionName} +${new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(option.additionalPrice)}`
}

export function CartItemCard({ item, onEdit, onRemove }: CartItemCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{item.productName}</h3>
          <p className="text-sm text-gray-600 mt-1">
            Quantidade: {item.quantity}
          </p>
        </div>
        <p className="text-lg font-bold text-green-600">
          {new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(item.totalPrice)}
        </p>
      </div>

      {item.selectedOptions.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500">Opcionais:</p>
          <ul className="text-sm text-gray-700 space-y-1">
            {item.selectedOptions.map((option) => (
              <li key={option.optionId} className="flex items-center gap-2">
                <span className="text-gray-400">•</span>
                <span>{formatOptionDisplay(option)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.notes && (
        <div>
          <p className="text-xs font-medium text-gray-500">Observações:</p>
          <p className="text-sm text-gray-700 mt-1">{item.notes}</p>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-200">
        <button
          onClick={() => onEdit(item)}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
        >
          Editar
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="flex-1 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
        >
          Remover
        </button>
      </div>
    </div>
  )
}

