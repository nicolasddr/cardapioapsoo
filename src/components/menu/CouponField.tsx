'use client'

import { useState } from 'react'
import { useCart } from '@/src/contexts/CartContext'
import { useToast } from '@/src/components/ui/Toast'

interface CouponFieldProps {
  appliedCoupon: { code: string; discountType: string; discountValue: number } | null
  onApplyCoupon: (code: string) => Promise<{ success: boolean; message: string }>
  onRemoveCoupon: () => void
}

export function CouponField({
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
}: CouponFieldProps) {
  const [couponCode, setCouponCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const toast = useToast()

  const handleApply = async () => {
    if (!couponCode.trim()) return

    setLoading(true)
    setError(null)

    const result = await onApplyCoupon(couponCode.trim().toUpperCase())

    if (result.success) {
      toast.showToast('Cupom aplicado!', result.message)
      setCouponCode('')
    } else {
      setError(result.message)
    }

    setLoading(false)
  }

  if (appliedCoupon) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-md">
          <div>
            <p className="text-sm font-medium text-green-900">
              Cupom aplicado: {appliedCoupon.code}
            </p>
            <p className="text-xs text-green-700">
              Desconto:{' '}
              {appliedCoupon.discountType === 'percentage'
                ? `${appliedCoupon.discountValue}%`
                : new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(appliedCoupon.discountValue)}
            </p>
          </div>
          <button
            onClick={onRemoveCoupon}
            className="text-sm text-red-600 hover:text-red-700 font-medium"
          >
            Remover
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label htmlFor="coupon" className="block text-sm font-medium text-gray-700">
        Cupom de Desconto
      </label>
      <div className="flex gap-2">
        <input
          id="coupon"
          type="text"
          value={couponCode}
          onChange={(e) => {
            setCouponCode(e.target.value.toUpperCase())
            setError(null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) {
              handleApply()
            }
          }}
          placeholder="Digite o código do cupom"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
          disabled={loading}
        />
        <button
          onClick={handleApply}
          disabled={loading || !couponCode.trim()}
          className="px-4 py-2 bg-gray-200 text-gray-900 font-medium rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></span>
              Validando...
            </span>
          ) : (
            'Aplicar'
          )}
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}

