'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { ShoppingBag, DollarSign, TrendingUp, Medal } from 'lucide-react'

interface MetricsSummary {
  totalOrders: number
  totalRevenue: number
  averageOrdersPerDay?: number
}

interface TopProduct {
  productId: string
  productName: string
  totalQuantity: number
  totalRevenue: number
  position: number
}

type Period = 'today' | 'last7days'

export default function DashboardPage() {
  const toast = useToast()
  const toastRef = useRef(toast)
  const [period, setPeriod] = useState<Period>('today')
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null)
  const [errorProducts, setErrorProducts] = useState<string | null>(null)

  useEffect(() => {
    toastRef.current = toast
  }, [toast])

  const loadMetrics = useCallback(async (selectedPeriod: Period) => {
    setLoadingMetrics(true)
    setErrorMetrics(null)
    try {
      const response = await fetch(`/api/admin/metrics?period=${selectedPeriod}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar métricas')
      }

      setMetrics(data.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar métricas'
      setErrorMetrics(message)
      toastRef.current.showToast('Erro', message)
      console.error('admin-dashboard:loadMetrics-error', error)
    } finally {
      setLoadingMetrics(false)
    }
  }, [])

  const loadTopProducts = useCallback(async (selectedPeriod: Period) => {
    setLoadingProducts(true)
    setErrorProducts(null)
    try {
      const response = await fetch(`/api/admin/metrics/top-products?period=${selectedPeriod}&limit=10`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar produtos mais vendidos')
      }

      setTopProducts(data.data || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar produtos mais vendidos'
      setErrorProducts(message)
      toastRef.current.showToast('Erro', message)
      console.error('admin-dashboard:loadTopProducts-error', error)
    } finally {
      setLoadingProducts(false)
    }
  }, [])

  useEffect(() => {
    loadMetrics(period)
  }, [period, loadMetrics])

  useEffect(() => {
    loadTopProducts(period)
  }, [period, loadTopProducts])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value)
  }

  const formatAverage = (value: number) => {
    const rounded = Math.round(value * 10) / 10
    if (rounded % 1 === 0) {
      return rounded.toString()
    }
    return rounded.toFixed(1)
  }

  const getPositionBadgeClass = (position: number) => {
    if (position === 1) {
      return 'bg-yellow-500 text-white'
    }
    if (position === 2) {
      return 'bg-gray-400 text-white'
    }
    if (position === 3) {
      return 'bg-orange-600 text-white'
    }
    return 'bg-gray-200 text-gray-700'
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="text-sm text-gray-600">
            {period === 'today' ? 'Métricas de Hoje' : 'Métricas dos Últimos 7 Dias'}
          </div>
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex gap-2" role="tablist" aria-label="Seletor de período">
            <button
              type="button"
              role="tab"
              aria-selected={period === 'today'}
              onClick={() => setPeriod('today')}
              className={`px-4 py-2 rounded-md transition-colors ${
                period === 'today'
                  ? 'bg-green-600 text-white font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={period === 'last7days'}
              onClick={() => setPeriod('last7days')}
              className={`px-4 py-2 rounded-md transition-colors ${
                period === 'last7days'
                  ? 'bg-green-600 text-white font-semibold'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Últimos 7 dias
            </button>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Total de Pedidos */}
          <div className="bg-white rounded-lg border border-gray-200 p-6" role="region" aria-label="Total de Pedidos">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Total de Pedidos</h2>
              <ShoppingBag className="w-8 h-8 text-blue-600" aria-hidden="true" />
            </div>
            {loadingMetrics ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse" />
            ) : errorMetrics ? (
              <p className="text-red-600 text-sm">{errorMetrics}</p>
            ) : (
              <p className="text-3xl font-bold text-gray-900" aria-live="polite">
                {formatNumber(metrics?.totalOrders || 0)}
              </p>
            )}
          </div>

          {/* Card Receita Total */}
          <div className="bg-white rounded-lg border border-gray-200 p-6" role="region" aria-label="Receita Total">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Receita Total</h2>
              <DollarSign className="w-8 h-8 text-green-600" aria-hidden="true" />
            </div>
            {loadingMetrics ? (
              <div className="h-12 bg-gray-200 rounded animate-pulse" />
            ) : errorMetrics ? (
              <p className="text-red-600 text-sm">{errorMetrics}</p>
            ) : (
              <p className="text-3xl font-bold text-gray-900" aria-live="polite">
                {formatCurrency(metrics?.totalRevenue || 0)}
              </p>
            )}
          </div>

          {/* Card Média Diária (apenas para últimos 7 dias) */}
          {period === 'last7days' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6" role="region" aria-label="Média Diária">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Média Diária</h2>
                <TrendingUp className="w-8 h-8 text-purple-600" aria-hidden="true" />
              </div>
              {loadingMetrics ? (
                <div className="h-12 bg-gray-200 rounded animate-pulse" />
              ) : errorMetrics ? (
                <p className="text-red-600 text-sm">{errorMetrics}</p>
              ) : (
                <p className="text-3xl font-bold text-gray-900" aria-live="polite">
                  {formatAverage(metrics?.averageOrdersPerDay || 0)} <span className="text-lg text-gray-600">pedidos/dia</span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Seção Produtos Mais Vendidos */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Produtos Mais Vendidos</h2>
          
          {loadingProducts ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : errorProducts ? (
            <div className="py-8 text-center">
              <p className="text-red-600">{errorProducts}</p>
            </div>
          ) : topProducts.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-600">Nenhum produto vendido neste período.</p>
            </div>
          ) : (
            <div className="space-y-3" role="list" aria-label="Lista de produtos mais vendidos">
              {topProducts.map((product) => (
                <div
                  key={product.productId}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-600 transition-colors"
                  role="listitem"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getPositionBadgeClass(product.position)}`}
                      aria-label={`Posição ${product.position}`}
                    >
                      #{product.position}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{product.productName}</h3>
                      <p className="text-sm text-gray-600">
                        {formatNumber(product.totalQuantity)} {product.totalQuantity === 1 ? 'unidade' : 'unidades'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{formatCurrency(product.totalRevenue)}</p>
                    <p className="text-xs text-gray-600">receita total</p>
                  </div>
                </div>
              ))}
            </div>
          )}
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
