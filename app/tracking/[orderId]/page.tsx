'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Order } from '@/src/domain/entities/Order'
import { OrderStatusTracker } from '@/src/components/tracking/OrderStatusTracker'
import { OrderInfo } from '@/src/components/tracking/OrderInfo'
import { supabase } from '@/lib/supabase/client'

function isValidUUID(id: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

export default function OrderTrackingPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realtimeConnected, setRealtimeConnected] = useState(false)
  const [realtimeError, setRealtimeError] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const reconnectAttemptsRef = { current: 0 }

  useEffect(() => {
    const loadOrder = async () => {
      if (!isValidUUID(orderId)) {
        setError('ID do pedido inválido')
        setLoading(false)
        return
      }

      try {
        const foundOrder = await Order.findById(orderId)
        if (!foundOrder) {
          setError('Pedido não encontrado')
          setLoading(false)
          return
        }
        setOrder(foundOrder)
        setLoading(false)
      } catch (err) {
        let errorMessage = 'Erro ao buscar pedido. Tente novamente.'
        if (err instanceof Error && err.message === 'TIMEOUT') {
          errorMessage = 'Tempo de espera esgotado. Tente novamente.'
        } else if (err instanceof Error) {
          errorMessage = err.message
        }
        setError(errorMessage)
        setLoading(false)
      }
    }

    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (!order) return

    const channel = supabase
      .channel(`order-${order.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`,
        },
        (payload) => {
          if (payload.new) {
            const updatedOrder = new Order(
              payload.new.id,
              payload.new.order_type,
              payload.new.customer_name,
              payload.new.customer_phone,
              payload.new.table_number,
              payload.new.status,
              Number(payload.new.subtotal),
              Number(payload.new.discount),
              Number(payload.new.total),
              payload.new.coupon_code,
              new Date(payload.new.created_at),
              new Date(payload.new.updated_at)
            )
            setOrder(updatedOrder)
          }
        }
      )
      .on('system', {}, (payload) => {
        if (payload.status === 'SUBSCRIBED') {
          setRealtimeConnected(true)
          setRealtimeError(false)
          setReconnecting(false)
          reconnectAttemptsRef.current = 0
        } else if (payload.status === 'CHANNEL_ERROR') {
          reconnectAttemptsRef.current++
          if (reconnectAttemptsRef.current <= 3) {
            setReconnecting(true)
            setTimeout(() => {
              channel.subscribe()
            }, 1000 * reconnectAttemptsRef.current)
          } else {
            setRealtimeError(true)
            setReconnecting(false)
          }
        }
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [order])

  const handleManualRefresh = async () => {
    if (!order) return
    setLoading(true)

    try {
      const foundOrder = await Order.findById(order.id)
      if (foundOrder) {
        setOrder(foundOrder)
      }
    } catch (err) {
      let errorMessage = 'Erro ao atualizar pedido. Tente novamente.'
      if (err instanceof Error && err.message === 'TIMEOUT') {
        errorMessage = 'Tempo de espera esgotado. Tente novamente.'
      } else if (err instanceof Error) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-8 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <svg
            className="w-16 h-16 text-red-500 mx-auto mb-4"
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar pedido</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/tracking')}
            className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 transition-colors"
          >
            Buscar outro pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Acompanhar Pedido</h1>
          <button
            onClick={() => router.push('/tracking')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Buscar outro pedido
          </button>
        </div>

        {reconnecting && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <p className="text-sm font-medium text-yellow-900">
                Conexão perdida. Tentando reconectar... ({reconnectAttemptsRef.current}/3)
              </p>
            </div>
          </div>
        )}

        {realtimeError && !reconnecting && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-900">
                    Conexão perdida. Atualizações automáticas não estão disponíveis.
                  </p>
                </div>
              </div>
              <button
                onClick={handleManualRefresh}
                className="text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
              >
                Atualizar
              </button>
            </div>
          </div>
        )}

        <OrderInfo order={order} />

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Status do Pedido</h2>
          <OrderStatusTracker status={order.status} orderType={order.orderType} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Atualizações em tempo real</p>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    realtimeConnected ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
                <span className="text-xs text-gray-600">
                  {realtimeConnected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
            </div>
            <button
              onClick={handleManualRefresh}
              disabled={loading}
              className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

