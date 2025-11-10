'use client'

import { CartItem } from '@/src/types/cart'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
  discount: number
  total: number
}

export function OrderSummary({
  items,
  subtotal,
  discount,
  total,
}: OrderSummaryProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Resumo do Pedido</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex justify-between items-start">
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                {item.productName} x{item.quantity}
              </div>
              {item.selectedOptions.length > 0 && (
                <div className="text-sm text-gray-600 mt-1">
                  {item.selectedOptions.map((opt) => (
                    <span key={opt.optionId} className="block">
                      • {opt.optionName}
                    </span>
                  ))}
                </div>
              )}
              {item.notes && (
                <div className="text-sm text-gray-500 mt-1 italic">
                  Obs: {item.notes}
                </div>
              )}
            </div>
            <div className="text-gray-900 font-medium">
              {formatPrice(item.totalPrice)}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex justify-between text-gray-700">
          <span>Subtotal:</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Desconto:</span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200">
          <span>Total:</span>
          <span className="text-green-600">{formatPrice(total)}</span>
        </div>
      </div>
    </div>
  )
}

