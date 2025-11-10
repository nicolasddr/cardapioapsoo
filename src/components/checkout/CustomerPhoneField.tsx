'use client'

import { useState } from 'react'
import { formatPhoneNumber, validatePhoneNumber } from '@/src/utils/phoneFormatter'

interface CustomerPhoneFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function CustomerPhoneField({
  value,
  onChange,
  error,
}: CustomerPhoneFieldProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched && error

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    onChange(formatted)
    setTouched(true)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  return (
    <div>
      <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
        Telefone <span className="text-red-500">*</span>
      </label>
      <input
        id="phone"
        type="tel"
        value={value}
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
      />
      {showError && (
        <p id="phone-error" className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

