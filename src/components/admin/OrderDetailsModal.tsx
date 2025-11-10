'use client'

import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { OrderItem } from '@/src/domain/entities/Order'

interface OrderDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  orderId: string
  showToast: (title: string, description: string) => void
}

interface OrderData {
  order: {
    id: string
    orderType: 'Retirada' | 'Consumo no Local'
    customerName: string | null
    customerPhone: string | null
    tableNumber: number | null
    status: string
    subtotal: number
    discount: number
    total: number
    couponCode: string | null
    createdAt: string
  }
  items: OrderItem[]
}

export function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  showToast,
}: OrderDetailsModalProps) {
  const [orderData, setOrderData] = useState<OrderData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrderDetails()
    }
  }, [isOpen, orderId])

  async function loadOrderDetails() {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do pedido')
      }

      const data = await response.json()
      setOrderData(data.data)
    } catch (error) {
      showToast('Erro', error instanceof Error ? error.message : 'Erro ao carregar detalhes')
    } finally {
      setLoading(false)
    }
  }

  if (!orderData && !loading) {
    return null
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDateTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            Detalhes do Pedido
          </Dialog.Title>

          {loading ? (
            <div className="py-8 text-center">
              <p className="text-gray-600">Carregando...</p>
            </div>
          ) : orderData ? (
            <div className="space-y-6">
              {/* Informações do Pedido */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">ID:</span>
                  <span className="text-sm text-gray-900 font-mono">
                    {orderData.order.id.slice(-8)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Tipo:</span>
                  <span className="text-sm text-gray-900">{orderData.order.orderType}</span>
                </div>
                {orderData.order.orderType === 'Retirada' ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Cliente:</span>
                      <span className="text-sm text-gray-900">{orderData.order.customerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700">Telefone:</span>
                      <span className="text-sm text-gray-900">{orderData.order.customerPhone}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Mesa:</span>
                    <span className="text-sm text-gray-900">Mesa {orderData.order.tableNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span
                    className={`text-xs px-2 py-1 rounded ${
                      orderData.order.status === 'Recebido'
                        ? 'bg-blue-100 text-blue-800'
                        : orderData.order.status === 'Em Preparo'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {orderData.order.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Horário:</span>
                  <span className="text-sm text-gray-900">
                    {formatDateTime(orderData.order.createdAt)}
                  </span>
                </div>
              </div>

              {/* Itens do Pedido */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Itens</h3>
                <div className="space-y-4">
                  {orderData.items.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.quantity}x {item.productName}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatCurrency(item.productPrice)} cada
                          </p>
                        </div>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(item.totalPrice)}
                        </p>
                      </div>

                      {item.selectedOptions.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200">
                          <p className="text-xs font-medium text-gray-700 mb-1">Opcionais:</p>
                          {item.selectedOptions.map((option) => (
                            <div key={option.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">• {option.optionName}</span>
                              {option.additionalPrice > 0 && (
                                <span className="text-gray-600">
                                  +{formatCurrency(option.additionalPrice)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {item.notes && (
                        <div className="mt-2 text-sm text-gray-600 italic">
                          <span className="font-medium">Obs:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-900">{formatCurrency(orderData.order.subtotal)}</span>
                </div>
                {orderData.order.discount > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700">
                        Desconto {orderData.order.couponCode && `(${orderData.order.couponCode})`}:
                      </span>
                      <span className="text-green-600">
                        -{formatCurrency(orderData.order.discount)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span className="text-gray-900">Total:</span>
                  <span className="text-gray-900">{formatCurrency(orderData.order.total)}</span>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Fechar
                </button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

