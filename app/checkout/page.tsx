'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/src/contexts/CartContext'
import { Order } from '@/src/domain/entities/Order'
import { OrderTypeSelector } from '@/src/components/checkout/OrderTypeSelector'
import { CustomerNameField } from '@/src/components/checkout/CustomerNameField'
import { CustomerPhoneField } from '@/src/components/checkout/CustomerPhoneField'
import { TableNumberField } from '@/src/components/checkout/TableNumberField'
import { OrderSummary } from '@/src/components/checkout/OrderSummary'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { validatePhoneNumber } from '@/src/utils/phoneFormatter'

export default function CheckoutPage() {
  const {
    items,
    appliedCoupon,
    getCartTotal,
    getDiscount,
    getTotal,
    clearCart,
  } = useCart()
  const router = useRouter()
  const toast = useToast()

  const [orderType, setOrderType] = useState<'Retirada' | 'Consumo no Local' | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [tableNumber, setTableNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (items.length === 0) {
      router.push('/menu')
      toast.showToast('Carrinho vazio', 'Adicione itens ao carrinho para finalizar o pedido')
    }
  }, [items.length, router, toast])

  const validateForm = (updateErrors: boolean = false): boolean => {
    const newErrors: Record<string, string> = {}

    if (!orderType) {
      newErrors.orderType = 'Selecione a modalidade'
    }

    if (orderType === 'Retirada') {
      const trimmedName = customerName.trim()
      if (!trimmedName || trimmedName.length < 2) {
        newErrors.customerName = 'Nome deve ter no mínimo 2 caracteres'
      }
      if (trimmedName.length > 100) {
        newErrors.customerName = 'Nome deve ter no máximo 100 caracteres'
      }
      if (!customerPhone || !validatePhoneNumber(customerPhone)) {
        newErrors.customerPhone = 'Telefone inválido'
      }
    }

    if (orderType === 'Consumo no Local') {
      if (!tableNumber || tableNumber < 1 || tableNumber > 999) {
        newErrors.tableNumber = 'Número da mesa deve ser entre 1 e 999'
      }
    }

    if (updateErrors) {
      setErrors(newErrors)
    }
    return Object.keys(newErrors).length === 0
  }

  const handleOrderTypeChange = (type: 'Retirada' | 'Consumo no Local') => {
    setOrderType(type)
    setCustomerName('')
    setCustomerPhone('')
    setTableNumber(null)
    setErrors({})
  }

  const handleSubmit = async () => {
    if (!validateForm(true)) return

    setLoading(true)

    try {
      const order = await Order.create(
        items,
        {
          name: orderType === 'Retirada' ? customerName : undefined,
          phone: orderType === 'Retirada' ? customerPhone : undefined,
          tableNumber: orderType === 'Consumo no Local' ? (tableNumber ?? undefined) : undefined,
        },
        orderType!,
        appliedCoupon
      )

      clearCart()
      toast.showToast(
        'Pedido confirmado!',
        'Seu pedido foi enviado para a cozinha'
      )

      setTimeout(() => {
        router.push(`/tracking/${order.id}`)
      }, 500)
    } catch (error) {
      let errorMessage = 'Erro ao finalizar pedido. Tente novamente.'
      if (error instanceof Error && error.message === 'TIMEOUT') {
        errorMessage = 'Tempo de espera esgotado. Tente novamente.'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      toast.showToast(
        'Erro ao finalizar pedido',
        errorMessage
      )
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return null
  }

  const subtotal = getCartTotal()
  const discount = getDiscount()
  const total = getTotal()
  const isFormValid = validateForm(false)

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            Finalizar Pedido
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <OrderTypeSelector value={orderType} onChange={handleOrderTypeChange} />
                {errors.orderType && (
                  <p className="mt-2 text-sm text-red-600">{errors.orderType}</p>
                )}
              </div>

              {orderType === 'Retirada' && (
                <div className="bg-white rounded-lg shadow p-6 space-y-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Informações para Retirada
                  </h2>
                  <CustomerNameField
                    value={customerName}
                    onChange={setCustomerName}
                    error={errors.customerName}
                  />
                  <CustomerPhoneField
                    value={customerPhone}
                    onChange={setCustomerPhone}
                    error={errors.customerPhone}
                  />
                </div>
              )}

              {orderType === 'Consumo no Local' && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Informações da Mesa
                  </h2>
                  <TableNumberField
                    value={tableNumber}
                    onChange={setTableNumber}
                    error={errors.tableNumber}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6 sticky top-4">
                <OrderSummary
                  items={items}
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                />
                <button
                  onClick={handleSubmit}
                  disabled={loading || !isFormValid}
                  className="w-full mt-6 px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                      Processando...
                    </span>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}
