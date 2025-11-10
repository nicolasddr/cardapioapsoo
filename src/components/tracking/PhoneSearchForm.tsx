'use client'

import { useState } from 'react'
import { formatPhoneNumber, validatePhoneNumber } from '@/src/utils/phoneFormatter'

interface PhoneSearchFormProps {
  onSubmit: (phone: string) => Promise<void>
  loading: boolean
}

export function PhoneSearchForm({ onSubmit, loading }: PhoneSearchFormProps) {
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [touched, setTouched] = useState(false)
  const showError = touched && error

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhone(formatted)
    setTouched(true)
    if (error) setError('')
  }

  const handleBlur = () => {
    setTouched(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)

    if (!phone || !validatePhoneNumber(phone)) {
      setError('Telefone inválido')
      return
    }

    setError('')
    await onSubmit(phone)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Número de Telefone <span className="text-red-500">*</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="(11) 98765-4321"
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
            showError
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
          }`}
          aria-invalid={!!showError}
          aria-describedby={showError ? 'phone-error' : undefined}
          disabled={loading}
        />
        {showError && (
          <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
            Buscando...
          </span>
        ) : (
          'Buscar Pedido'
        )}
      </button>
    </form>
  )
}

