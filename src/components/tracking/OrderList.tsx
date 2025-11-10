'use client'

import { Order } from '@/src/domain/entities/Order'

interface OrderListProps {
  orders: Order[]
  onSelectOrder: (orderId: string) => void
}

export function OrderList({ orders, onSelectOrder }: OrderListProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Recebido':
        return 'bg-blue-100 text-blue-800'
      case 'Em Preparo':
        return 'bg-yellow-100 text-yellow-800'
      case 'Pronto':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        Seus Pedidos Ativos ({orders.length})
      </h2>
      <div className="space-y-3">
        {orders.map((order) => (
          <button
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            className="w-full text-left p-4 border-2 border-gray-200 rounded-lg hover:border-green-600 hover:bg-green-50 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="font-semibold text-gray-900">
                  Pedido #{order.id.slice(0, 8).toUpperCase()}
                </div>
                <div className="text-sm text-gray-600">
                  {formatDateTime(order.createdAt)}
                </div>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">
                {order.orderType} • Mesa {order.tableNumber || 'N/A'}
              </span>
              <span className="font-semibold text-gray-900">
                {formatPrice(order.total)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

