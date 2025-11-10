'use client'

import { useCart } from '@/src/contexts/CartContext'

interface FloatingCartButtonProps {
  onClick: () => void
}

export function FloatingCartButton({ onClick }: FloatingCartButtonProps) {
  const { getCartItemsCount } = useCart()
  const itemCount = getCartItemsCount()

  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
      aria-label={`Abrir carrinho, ${itemCount} ${itemCount === 1 ? 'item' : 'itens'}`}
      tabIndex={0}
    >
      <div className="relative">
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
        {itemCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </div>
    </button>
  )
}

