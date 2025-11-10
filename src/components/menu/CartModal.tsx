'use client'

import * as Dialog from '@radix-ui/react-dialog'
import { useEffect } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { CartItem } from '@/src/types/cart'
import { CartItemList } from './CartItemList'
import { CartSummary } from './CartSummary'
import { CouponField } from './CouponField'
import { useToast } from '@/src/components/ui/Toast'
import { Toast } from '@/src/components/ui/Toast'
import { useRouter } from 'next/navigation'

interface CartModalProps {
  isOpen: boolean
  onClose: () => void
  onEditItem: (item: CartItem) => void
}

export function CartModal({ isOpen, onClose, onEditItem }: CartModalProps) {
  const {
    items,
    appliedCoupon,
    removeFromCart,
    getCartTotal,
    getDiscount,
    getTotal,
    applyCoupon,
    removeCoupon,
    couponRemovedNotification,
    clearCouponNotification,
  } = useCart()
  const toast = useToast()
  const router = useRouter()

  useEffect(() => {
    if (couponRemovedNotification.show && couponRemovedNotification.code) {
      toast.showToast(
        'Cupom removido',
        `O cupom ${couponRemovedNotification.code} foi removido pois não está mais ativo.`
      )
      clearCouponNotification()
    }
  }, [couponRemovedNotification, toast, clearCouponNotification])

  const handleRemove = (itemId: string) => {
    const item = items.find((i) => i.id === itemId)
    removeFromCart(itemId)
    if (item) {
      toast.showToast('Item removido', `${item.productName} removido do carrinho`)
    }
  }

  const handleFinalizeOrder = () => {
    onClose()
    router.push('/checkout')
  }

  const subtotal = getCartTotal()
  const discount = getDiscount()
  const total = getTotal()

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden z-50 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <Dialog.Title className="text-2xl font-bold text-gray-900">
                Carrinho
              </Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600">
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
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <CartItemList
                items={items}
                onEdit={onEditItem}
                onRemove={handleRemove}
              />

              {items.length > 0 && (
                <>
                  <CouponField
                    appliedCoupon={appliedCoupon}
                    onApplyCoupon={applyCoupon}
                    onRemoveCoupon={removeCoupon}
                  />

                  <CartSummary
                    subtotal={subtotal}
                    discount={discount}
                    total={total}
                  />
                </>
              )}
            </div>

            {items.length > 0 && (
              <div className="p-6 border-t border-gray-200">
                <button
                  onClick={handleFinalizeOrder}
                  className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
                >
                  Finalizar Pedido
                </button>
              </div>
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

