'use client'

import { Order } from '@/src/domain/entities/Order'

interface OrderInfoProps {
  order: Order
}

export function OrderInfo({ order }: OrderInfoProps) {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Informações do Pedido</h2>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Pedido:</span>
          <span className="font-medium text-gray-900">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Data/Hora:</span>
          <span className="font-medium text-gray-900">{formatDateTime(order.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Modalidade:</span>
          <span className="font-medium text-gray-900">{order.orderType}</span>
        </div>
        {order.tableNumber && (
          <div className="flex justify-between">
            <span className="text-gray-600">Mesa:</span>
            <span className="font-medium text-gray-900">{order.tableNumber}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
          <span className="text-gray-900">Total:</span>
          <span className="text-green-600">{formatPrice(order.total)}</span>
        </div>
      </div>
    </div>
  )
}

