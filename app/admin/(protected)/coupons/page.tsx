'use client'

import { useEffect, useState } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { CouponModal } from '@/src/components/admin/CouponModal'
import { DeleteConfirmModal } from '@/src/components/admin/DeleteConfirmModal'

interface CouponData {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  status: 'Ativo' | 'Inativo'
  createdAt: string
}

type FilterStatus = 'all' | 'active' | 'inactive'

export default function CouponsPage() {
  const toast = useToast()
  const [coupons, setCoupons] = useState<CouponData[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [isCouponModalOpen, setCouponModalOpen] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    id: string
    code: string
  }>({
    isOpen: false,
    id: '',
    code: '',
  })
  const [isDeleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/coupons')

      if (!response.ok) {
        throw new Error('Erro ao carregar cupons')
      }

      const data = await response.json()
      setCoupons(data.data ?? [])
    } catch (error) {
      toast.showToast('Erro', 'Não foi possível carregar os cupons')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  function handleCreateCoupon() {
    setEditingCoupon(null)
    setCouponModalOpen(true)
  }

  function handleEditCoupon(coupon: CouponData) {
    setEditingCoupon(coupon)
    setCouponModalOpen(true)
  }

  function handleDeleteCoupon(coupon: CouponData) {
    setDeleteConfirm({
      isOpen: true,
      id: coupon.id,
      code: coupon.code,
    })
  }

  async function confirmDelete() {
    setDeleting(true)

    try {
      const response = await fetch(`/api/admin/coupons?id=${deleteConfirm.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao desativar cupom')
      }

      toast.showToast('Sucesso!', 'Cupom desativado com sucesso')
      loadData()
      setDeleteConfirm({ isOpen: false, id: '', code: '' })
    } catch (error) {
      toast.showToast('Erro', error instanceof Error ? error.message : 'Erro ao desativar cupom')
    } finally {
      setDeleting(false)
    }
  }

  const filteredCoupons = coupons
    .filter((coupon) => {
      if (filterStatus === 'active') return coupon.status === 'Ativo'
      if (filterStatus === 'inactive') return coupon.status === 'Inativo'
      return true
    })
    .filter((coupon) => {
      if (!searchTerm) return true
      return coupon.code.toLowerCase().includes(searchTerm.toLowerCase())
    })

  if (loading) {
    return (
      <>
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Cupons de Desconto</h1>
          </div>
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
          <h1 className="text-3xl font-bold text-gray-900">Cupons de Desconto</h1>
          <button
            onClick={handleCreateCoupon}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Novo Cupom
          </button>
        </div>

        {coupons.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum cupom criado
            </h3>
            <p className="text-gray-600 mb-4">
              Comece criando seu primeiro cupom de desconto.
            </p>
            <button
              onClick={handleCreateCoupon}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Criar Primeiro Cupom
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por código..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-md ${
                      filterStatus === 'all'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Todos ({coupons.length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('active')}
                    className={`px-4 py-2 rounded-md ${
                      filterStatus === 'active'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Ativos ({coupons.filter((c) => c.status === 'Ativo').length})
                  </button>
                  <button
                    onClick={() => setFilterStatus('inactive')}
                    className={`px-4 py-2 rounded-md ${
                      filterStatus === 'inactive'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Inativos ({coupons.filter((c) => c.status === 'Inativo').length})
                  </button>
                </div>
              </div>
            </div>

            {filteredCoupons.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                <p className="text-gray-600">Nenhum cupom encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data de Criação
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCoupons.map((coupon) => (
                      <tr key={coupon.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono font-semibold text-gray-900">
                            {coupon.code}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {coupon.discountType === 'percentage' ? 'Percentual' : 'Fixo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">
                            {coupon.discountType === 'percentage'
                              ? `${coupon.discountValue}%`
                              : new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(coupon.discountValue)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              coupon.status === 'Ativo'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {coupon.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(coupon.createdAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditCoupon(coupon)}
                            className="text-green-600 hover:text-green-900 mr-4"
                          >
                            Editar
                          </button>
                          {coupon.status === 'Ativo' && (
                            <button
                              onClick={() => handleDeleteCoupon(coupon)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Desativar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <CouponModal
        isOpen={isCouponModalOpen}
        onClose={() => setCouponModalOpen(false)}
        onSuccess={loadData}
        editCoupon={editingCoupon}
        showToast={toast.showToast}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, id: '', code: '' })}
        onConfirm={confirmDelete}
        title="Desativar Cupom"
        message={`Tem certeza que deseja desativar o cupom "${deleteConfirm.code}"? Ele não poderá mais ser usado pelos clientes.`}
        isDeleting={isDeleting}
      />

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

