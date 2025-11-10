'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { OrderDetailsModal } from '@/src/components/admin/OrderDetailsModal'

interface OrderData {
  id: string
  orderType: 'Retirada' | 'Consumo no Local'
  customerName: string | null
  customerPhone: string | null
  tableNumber: number | null
  status: 'Recebido' | 'Em Preparo' | 'Pronto'
  subtotal: number
  discount: number
  total: number
  couponCode: string | null
  createdAt: string
}

type FilterStatus = 'all' | 'Recebido' | 'Em Preparo' | 'Pronto'
type FilterOrderType = 'all' | 'Retirada' | 'Consumo no Local'
type FilterPeriod = 'today' | '7days' | '30days' | 'custom'

export default function OrdersPage() {
  const toast = useToast()
  const [orders, setOrders] = useState<OrderData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterOrderType, setFilterOrderType] = useState<FilterOrderType>('all')
  const [filterPeriod, setFilterPeriod] = useState<FilterPeriod>('today')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false)

  // Refs para evitar múltiplas requisições simultâneas e manter estado estável
  const isLoadingRef = useRef(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const filtersRef = useRef({ filterStatus, filterOrderType, filterPeriod, customStartDate, customEndDate })
  const toastRef = useRef(toast)

  // Atualizar refs quando valores mudam
  useEffect(() => {
    filtersRef.current = { filterStatus, filterOrderType, filterPeriod, customStartDate, customEndDate }
  }, [filterStatus, filterOrderType, filterPeriod, customStartDate, customEndDate])

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  // Função de carregamento estável que não muda
  const loadData = useCallback(async () => {
    // Evitar múltiplas requisições simultâneas
    if (isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setLoading(true)
    
    try {
      const filters = filtersRef.current
      const params = new URLSearchParams()

      if (filters.filterStatus !== 'all') {
        params.append('status', filters.filterStatus)
      }
      if (filters.filterOrderType !== 'all') {
        params.append('orderType', filters.filterOrderType)
      }

      // Calcular datas baseado no período
      const now = new Date()
      let startDate: Date | null = null
      let endDate: Date | null = null

      if (filters.filterPeriod === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      } else if (filters.filterPeriod === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      } else if (filters.filterPeriod === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      } else if (filters.filterPeriod === 'custom') {
        if (filters.customStartDate) startDate = new Date(filters.customStartDate)
        if (filters.customEndDate) endDate = new Date(filters.customEndDate)
      }

      if (startDate) {
        params.append('startDate', startDate.toISOString())
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString())
      }

      const response = await fetch(`/api/admin/orders?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Erro ao carregar pedidos')
      }

      const data = await response.json()
      setOrders(data.data ?? [])
      setLastUpdate(new Date())
    } catch (error) {
      toastRef.current.showToast('Erro', 'Não foi possível carregar os pedidos')
      console.error(error)
    } finally {
      setLoading(false)
      isLoadingRef.current = false
    }
  }, []) // Array vazio - função nunca muda

  const isInitialLoadRef = useRef(true)

  // Carregar dados inicialmente e quando filtros mudam (com debounce)
  useEffect(() => {
    // Na primeira carga, carregar imediatamente
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      loadData()
      return
    }

    // Para mudanças de filtros, usar debounce
    const timeoutId = setTimeout(() => {
      loadData()
    }, 300) // 300ms de debounce

    return () => clearTimeout(timeoutId)
  }, [filterStatus, filterOrderType, filterPeriod, customStartDate, customEndDate, loadData])

  // Polling automático a cada 60 segundos - SEM dependência de loadData
  useEffect(() => {
    // Limpar intervalo anterior se existir
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && !isLoadingRef.current) {
        loadData()
      }
    }, 60000) // 60 segundos

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Array vazio - só executa uma vez no mount

  // Page Visibility listener - SEM dependência de loadData
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isLoadingRef.current) {
        loadData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Array vazio - só executa uma vez no mount

  async function handleUpdateStatus(orderId: string, newStatus: 'Em Preparo' | 'Pronto') {
    setUpdatingStatus(orderId)

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status')
      }

      // Verificar se o status foi realmente atualizado
      const updatedStatus = data.data?.status || newStatus

      // Verificar se precisamos mudar o filtro antes de atualizar
      const needsFilterChange = filterStatus !== 'all' && filterStatus !== updatedStatus
      
      // Atualização otimista: atualizar estado local imediatamente
      setOrders((prevOrders) => {
        const updated = prevOrders.map((order) =>
          order.id === orderId
            ? { ...order, status: updatedStatus }
            : order
        )
        console.log('🔄 Atualização otimista:', {
          orderId,
          oldStatus: prevOrders.find((o) => o.id === orderId)?.status,
          newStatus: updatedStatus,
          updatedOrder: updated.find((o) => o.id === orderId),
        })
        // Atualizar lastUpdate para forçar re-render
        setLastUpdate(new Date())
        return updated
      })

      // Se o filtro atual esconder o pedido atualizado, ajustar o filtro após um pequeno delay
      // para garantir que a atualização otimista seja renderizada primeiro
      if (needsFilterChange) {
        setTimeout(() => {
          setFilterStatus('all')
        }, 100) // Pequeno delay para garantir renderização da atualização otimista
      }

      if (data.warning) {
        toastRef.current.showToast('Aviso', data.warning)
      } else {
        toastRef.current.showToast('Sucesso!', `Status atualizado para ${updatedStatus}`)
      }

      // Se mudamos o filtro, o useEffect vai recarregar automaticamente
      // Se não mudamos, recarregar após um delay para garantir sincronização
      if (!needsFilterChange) {
        setTimeout(() => {
          loadData()
        }, 1000) // 1 segundo de delay
      }
      // Se mudamos o filtro, não precisa chamar loadData() manualmente
    } catch (error) {
      toastRef.current.showToast('Erro', error instanceof Error ? error.message : 'Erro ao atualizar status')
      // Em caso de erro, recarregar para garantir estado correto
      loadData()
    } finally {
      setUpdatingStatus(null)
    }
  }

  function handleViewDetails(orderId: string) {
    setSelectedOrderId(orderId)
    setDetailsModalOpen(true)
  }

  function handleClearCustomDates() {
    setCustomStartDate('')
    setCustomEndDate('')
    setFilterPeriod('today')
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatTime = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  const getTimeSinceUpdate = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdate.getTime()) / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    return `${minutes}min`
  }

  const counters = {
    recebido: orders.filter((o) => o.status === 'Recebido').length,
    emPreparo: orders.filter((o) => o.status === 'Em Preparo').length,
    pronto: orders.filter((o) => o.status === 'Pronto').length,
  }

  if (loading) {
    return (
      <>
        <div className="max-w-7xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Pedidos</h1>
          <div className="bg-white rounded-lg border border-gray-200 p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
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

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Pedidos</h1>
          <span className="text-sm text-gray-500">Atualizado há {getTimeSinceUpdate()}</span>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <p className="text-sm font-medium text-blue-700">Recebidos</p>
            <p className="text-3xl font-bold text-blue-900">{counters.recebido}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <p className="text-sm font-medium text-yellow-700">Em Preparo</p>
            <p className="text-3xl font-bold text-yellow-900">{counters.emPreparo}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <p className="text-sm font-medium text-green-700">Prontos</p>
            <p className="text-3xl font-bold text-green-900">{counters.pronto}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Filtro de Status */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="flex gap-2">
                {(['all', 'Recebido', 'Em Preparo', 'Pronto'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filterStatus === status
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' ? 'Todos' : status}
                  </button>
                ))}
              </div>
            </div>

            {/* Filtro de Tipo */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
              <div className="flex gap-2">
                {(['all', 'Retirada', 'Consumo no Local'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilterOrderType(type)}
                    className={`px-3 py-1 text-sm rounded-md ${
                      filterOrderType === type
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {type === 'all' ? 'Todos' : type}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Filtro de Período */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <div className="flex flex-wrap gap-2">
              {(['today', '7days', '30days', 'custom'] as const).map((period) => (
                <button
                  key={period}
                  onClick={() => setFilterPeriod(period)}
                  className={`px-3 py-1 text-sm rounded-md ${
                    filterPeriod === period
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {period === 'today'
                    ? 'Hoje'
                    : period === '7days'
                    ? 'Últimos 7 dias'
                    : period === '30days'
                    ? 'Últimos 30 dias'
                    : 'Personalizado'}
                </button>
              ))}
            </div>

            {filterPeriod === 'custom' && (
              <div className="mt-3 flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-600 mb-1">Data Final</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <button
                  onClick={handleClearCustomDates}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Limpar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Pedidos */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">Nenhum pedido encontrado com os filtros aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Cliente/Mesa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Horário
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm text-gray-900">
                        {order.id.slice(-8)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900">
                        {order.orderType === 'Retirada'
                          ? `${order.customerName}`
                          : `Mesa ${order.tableNumber}`}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-600">{order.orderType}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.status === 'Recebido'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'Em Preparo'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatTime(order.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleViewDetails(order.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Ver Detalhes
                      </button>
                      {order.status === 'Recebido' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Em Preparo')}
                          disabled={updatingStatus === order.id}
                          className="text-yellow-600 hover:text-yellow-900 disabled:opacity-50"
                        >
                          {updatingStatus === order.id ? 'Atualizando...' : 'Iniciar Preparo'}
                        </button>
                      )}
                      {order.status === 'Em Preparo' && (
                        <button
                          onClick={() => handleUpdateStatus(order.id, 'Pronto')}
                          disabled={updatingStatus === order.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                        >
                          {updatingStatus === order.id ? 'Atualizando...' : 'Marcar Pronto'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrderId && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => setDetailsModalOpen(false)}
          orderId={selectedOrderId}
          showToast={toast.showToast}
        />
      )}

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

