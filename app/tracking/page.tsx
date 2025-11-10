'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Order } from '@/src/domain/entities/Order'
import { PhoneSearchForm } from '@/src/components/tracking/PhoneSearchForm'
import { OrderList } from '@/src/components/tracking/OrderList'

export default function TrackingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [searchedPhone, setSearchedPhone] = useState('')

  const handleSearch = async (phone: string) => {
    setLoading(true)
    setError(null)
    setSearchedPhone(phone)

    try {
      const foundOrders = await Order.findByPhone(phone)
      
      if (foundOrders.length === 0) {
        setError('Nenhum pedido ativo encontrado para este telefone')
        setOrders([])
      } else if (foundOrders.length === 1) {
        router.push(`/tracking/${foundOrders[0].id}`)
      } else {
        setOrders(foundOrders)
      }
    } catch (err) {
      let errorMessage = 'Erro ao buscar pedido. Tente novamente.'
      if (err instanceof Error && err.message === 'TIMEOUT') {
        errorMessage = 'Tempo de espera esgotado. Tente novamente.'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      setError(errorMessage)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectOrder = (orderId: string) => {
    router.push(`/tracking/${orderId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900 text-center">
          Acompanhar Pedido
        </h1>

        <div className="bg-white rounded-lg shadow p-6">
          <PhoneSearchForm onSubmit={handleSearch} loading={loading} />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-900">{error}</p>
                {error.includes('Tempo de espera') && (
                  <p className="text-sm text-red-700 mt-1">
                    Verifique sua conexão e tente novamente.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {orders.length > 1 && (
          <div className="bg-white rounded-lg shadow p-6">
            <OrderList orders={orders} onSelectOrder={handleSelectOrder} />
          </div>
        )}
      </div>
    </div>
  )
}

