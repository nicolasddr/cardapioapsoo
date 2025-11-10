'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { OrderDetailsModal } from '@/src/components/admin/OrderDetailsModal'
import { ChevronDown, ChevronRight, Star } from 'lucide-react'

interface CustomerOrder {
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
  updatedAt: string
}

// Tipo para resposta da API (lastOrderDate vem como string)
interface CustomerSummaryFromAPI {
  name: string
  phone: string
  totalOrders: number
  totalSpent: number
  lastOrderDate: string // ISO string da API
  lastOrderStatus: 'Recebido' | 'Em Preparo' | 'Pronto'
}

export default function CustomersPage() {
  const toast = useToast()
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<CustomerSummaryFromAPI[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCustomerPhone, setExpandedCustomerPhone] = useState<string | null>(null)
  const [customerOrders, setCustomerOrders] = useState<Map<string, CustomerOrder[]>>(new Map())
  const [loadingOrders, setLoadingOrders] = useState<Set<string>>(new Set())
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false)

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toastRef = useRef(toast)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const performSearch = useCallback(async (term: string) => {
    setLoading(true)
    try {
      // Se termo vazio, buscar últimos clientes (sem parâmetro search)
      const url = term.trim() 
        ? `/api/admin/customers?search=${encodeURIComponent(term.trim())}`
        : '/api/admin/customers'
      
      const response = await fetch(url)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao buscar clientes')
      }

      const data = await response.json()
      setCustomers(data.data ?? [])
    } catch (error) {
      toastRef.current.showToast('Erro', error instanceof Error ? error.message : 'Erro ao buscar clientes')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)

    // Debounce de 500ms apenas se houver termo de busca
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(value)
      }, 500)
    } else {
      // Se campo ficou vazio, buscar últimos clientes
      searchTimeoutRef.current = setTimeout(() => {
        performSearch('')
      }, 500)
    }
  }

  // Carregar últimos clientes ao montar componente
  useEffect(() => {
    performSearch('')
  }, [performSearch])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    performSearch(searchTerm)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchSubmit(e)
    }
  }

  const loadCustomerOrders = async (phone: string) => {
    if (customerOrders.has(phone)) {
      return // Já carregado
    }

    setLoadingOrders((prev) => new Set(prev).add(phone))
    try {
      console.log('admin-customers:loadCustomerOrders-start', { phone })
      const response = await fetch(`/api/admin/customers/${encodeURIComponent(phone)}/orders`)

      if (!response.ok) {
        const data = await response.json()
        console.error('admin-customers:loadCustomerOrders-error', {
          phone,
          status: response.status,
          error: data.error,
        })
        throw new Error(data.error || 'Erro ao carregar pedidos')
      }

      const data = await response.json()
      console.log('admin-customers:loadCustomerOrders-success', {
        phone,
        ordersCount: data.data?.length || 0,
      })
      setCustomerOrders((prev) => new Map(prev).set(phone, data.data ?? []))
    } catch (error) {
      console.error('admin-customers:loadCustomerOrders-catch', {
        phone,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      toastRef.current.showToast('Erro', error instanceof Error ? error.message : 'Erro ao carregar pedidos')
    } finally {
      setLoadingOrders((prev) => {
        const next = new Set(prev)
        next.delete(phone)
        return next
      })
    }
  }

  const handleCustomerClick = (phone: string) => {
    if (expandedCustomerPhone === phone) {
      setExpandedCustomerPhone(null)
    } else {
      setExpandedCustomerPhone(phone)
      loadCustomerOrders(phone)
    }
  }

  const handleOrderClick = (orderId: string) => {
    setSelectedOrderId(orderId)
    setDetailsModalOpen(true)
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

  const formatPhone = (phone: string) => {
    // Formatar telefone brasileiro: (XX) XXXXX-XXXX
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
    }
    return phone
  }

  const isLoyalCustomer = (customer: CustomerSummaryFromAPI) => {
    return customer.totalOrders >= 5 || customer.totalSpent >= 500
  }

  const getStatusBadgeClass = (status: string) => {
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
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciar Clientes</h1>
          {!searchTerm.trim() && customers.length > 0 && (
            <p className="text-sm text-gray-600">
              Mostrando os 50 últimos clientes que fizeram pedido
            </p>
          )}
        </div>

        {/* Campo de Busca */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="sr-only">
                Campo de busca para nome ou telefone do cliente (deixe vazio para ver últimos clientes)
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Buscar por nome ou telefone... (deixe vazio para ver últimos clientes)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-600"
                aria-label="Campo de busca para nome ou telefone do cliente (deixe vazio para ver últimos clientes)"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {searchTerm.trim() ? 'Buscar' : 'Atualizar'}
            </button>
          </form>
        </div>

        {/* Resultados */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12">
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <p className="text-gray-600">
              {searchTerm.trim() 
                ? `Nenhum cliente encontrado para "${searchTerm}"`
                : 'Nenhum cliente encontrado'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {customers.map((customer) => {
              const isExpanded = expandedCustomerPhone === customer.phone
              const orders = customerOrders.get(customer.phone) || []
              const isLoadingOrders = loadingOrders.has(customer.phone)
              const isLoyal = isLoyalCustomer(customer)

              return (
                <div
                  key={customer.phone}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div
                    onClick={() => handleCustomerClick(customer.phone)}
                    className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{customer.name}</h3>
                          {isLoyal && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                              <Star className="w-3 h-3 fill-current" />
                              Cliente Fiel
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{formatPhone(customer.phone)}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Total de Pedidos:</span>
                            <span className="ml-2 font-semibold text-gray-900">{customer.totalOrders}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor Total:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {formatCurrency(customer.totalSpent)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Último Pedido:</span>
                            <span className="ml-2 font-semibold text-gray-900">
                              {formatDateTime(customer.lastOrderDate)}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Status:</span>
                            <span
                              className={`ml-2 px-2 py-1 text-xs rounded ${getStatusBadgeClass(
                                customer.lastOrderStatus
                              )}`}
                            >
                              {customer.lastOrderStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                      {isLoadingOrders ? (
                        <div className="py-8 text-center">
                          <p className="text-gray-600">Carregando pedidos...</p>
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="py-8 text-center">
                          <p className="text-gray-600">Este cliente ainda não possui pedidos registrados.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="font-semibold text-gray-900 mb-4">Pedidos Anteriores</h4>
                          {orders.map((order) => (
                            <div
                              key={order.id}
                              onClick={() => handleOrderClick(order.id)}
                              className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-green-600 transition-colors"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <span className="text-sm font-mono text-gray-600">
                                      #{order.id.slice(-8)}
                                    </span>
                                    <span
                                      className={`px-2 py-1 text-xs rounded ${getStatusBadgeClass(order.status)}`}
                                    >
                                      {order.status}
                                    </span>
                                    <span className="text-xs text-gray-600">{order.orderType}</span>
                                  </div>
                                  <p className="text-sm text-gray-600">
                                    {formatDateTime(order.createdAt)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold text-gray-900">
                                    {formatCurrency(order.total)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />

      {selectedOrderId && (
        <OrderDetailsModal
          isOpen={isDetailsModalOpen}
          onClose={() => {
            setDetailsModalOpen(false)
            setSelectedOrderId(null)
          }}
          orderId={selectedOrderId}
          showToast={toast.showToast}
        />
      )}
    </>
  )
}

