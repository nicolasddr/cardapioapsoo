'use client'

import { useCart } from '@/src/contexts/CartContext'

interface CartSummaryProps {
  subtotal: number
  discount: number
  total: number
}

export function CartSummary({ subtotal, discount, total }: CartSummaryProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  return (
    <div className="border-t border-gray-200 pt-4 space-y-3">
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
  )
}

