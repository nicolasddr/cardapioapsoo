'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface CouponModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editCoupon?: {
    id: string
    code: string
    discountType: 'percentage' | 'fixed'
    discountValue: number
    status: 'Ativo' | 'Inativo'
  } | null
  showToast: (title: string, description: string) => void
}

export function CouponModal({
  isOpen,
  onClose,
  onSuccess,
  editCoupon,
  showToast,
}: CouponModalProps) {
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [discountValue, setDiscountValue] = useState('')
  const [status, setStatus] = useState<'Ativo' | 'Inativo'>('Ativo')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (editCoupon) {
        setCode(editCoupon.code)
        setDiscountType(editCoupon.discountType)
        setDiscountValue(editCoupon.discountValue.toString())
        setStatus(editCoupon.status)
      } else {
        setCode('')
        setDiscountType('percentage')
        setDiscountValue('')
        setStatus('Ativo')
      }
      setErrors({})
    }
  }, [isOpen, editCoupon])

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {}

    const trimmedCode = code.trim()
    if (!trimmedCode) {
      newErrors.code = 'Código é obrigatório'
    } else if (trimmedCode.length < 3 || trimmedCode.length > 20) {
      newErrors.code = 'Código deve ter entre 3 e 20 caracteres'
    }

    const value = parseFloat(discountValue)
    if (isNaN(value)) {
      newErrors.discountValue = 'Valor inválido'
    } else if (discountType === 'percentage') {
      if (value < 1 || value > 100) {
        newErrors.discountValue = 'Desconto percentual deve estar entre 1% e 100%'
      }
    } else if (value <= 0) {
      newErrors.discountValue = 'Desconto fixo deve ser maior que zero'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleCodeChange(value: string) {
    setCode(value)
  }

  function handleValueChange(value: string) {
    const cleaned = value.replace(/[^\d.,]/g, '')
    setDiscountValue(cleaned)
  }

  function handleValueBlur() {
    const value = parseFloat(discountValue)
    if (!isNaN(value)) {
      if (discountType === 'percentage') {
        setDiscountValue(Math.round(value).toString())
      } else {
        setDiscountValue(value.toFixed(2))
      }
    }
    validateForm()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm() || isSubmitting) return

    setSubmitting(true)

    try {
      const url = '/api/admin/coupons'
      const method = editCoupon ? 'PATCH' : 'POST'

      const body = {
        ...(editCoupon && { id: editCoupon.id }),
        code: code.trim(),
        discountType,
        discountValue: parseFloat(discountValue),
        status,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        if (data.details) {
          setErrors(data.details)
        }
        throw new Error(data.error || 'Erro ao salvar cupom')
      }

      showToast(
        'Sucesso!',
        editCoupon ? 'Cupom atualizado com sucesso' : 'Cupom criado com sucesso'
      )
      onSuccess()
      onClose()
    } catch (error) {
      showToast('Erro', error instanceof Error ? error.message : 'Erro ao salvar cupom')
    } finally {
      setSubmitting(false)
    }
  }

  const codePreview = code.trim().toUpperCase()
  const valueUnit = discountType === 'percentage' ? '%' : 'R$'

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-md z-50">
          <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
            {editCoupon ? 'Editar Cupom' : 'Novo Cupom'}
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
                Código *
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onBlur={() => validateForm()}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.code ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Ex: PROMO10"
                disabled={isSubmitting}
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? 'code-error' : undefined}
              />
              {codePreview && !errors.code && (
                <p className="text-sm text-gray-600 mt-1">Preview: {codePreview}</p>
              )}
              {errors.code && (
                <p id="code-error" className="text-sm text-red-600 mt-1">
                  {errors.code}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Desconto *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="percentage"
                    checked={discountType === 'percentage'}
                    onChange={() => {
                      setDiscountType('percentage')
                      setDiscountValue('')
                      setErrors({})
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Percentual (%)
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="fixed"
                    checked={discountType === 'fixed'}
                    onChange={() => {
                      setDiscountType('fixed')
                      setDiscountValue('')
                      setErrors({})
                    }}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Fixo (R$)
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-1">
                Valor ({valueUnit}) *
              </label>
              <input
                id="value"
                type="text"
                inputMode="decimal"
                value={discountValue}
                onChange={(e) => handleValueChange(e.target.value)}
                onBlur={handleValueBlur}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.discountValue ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={discountType === 'percentage' ? '10' : '10.00'}
                disabled={isSubmitting}
                aria-invalid={!!errors.discountValue}
                aria-describedby={errors.discountValue ? 'value-error' : undefined}
              />
              {errors.discountValue && (
                <p id="value-error" className="text-sm text-red-600 mt-1">
                  {errors.discountValue}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Ativo"
                    checked={status === 'Ativo'}
                    onChange={() => setStatus('Ativo')}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Ativo
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="Inativo"
                    checked={status === 'Inativo'}
                    onChange={() => setStatus('Inativo')}
                    disabled={isSubmitting}
                    className="mr-2"
                  />
                  Inativo
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || Object.keys(errors).length > 0}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvando...' : editCoupon ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

