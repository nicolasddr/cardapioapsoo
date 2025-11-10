'use client'

import { useState } from 'react'

interface CustomerNameFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
}

export function CustomerNameField({
  value,
  onChange,
  error,
}: CustomerNameFieldProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched && error

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setTouched(true)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  return (
    <div>
      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
        Nome <span className="text-red-500">*</span>
      </label>
      <input
        id="name"
        type="text"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Seu nome completo"
        maxLength={100}
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
          showError
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
        }`}
        aria-invalid={!!showError}
        aria-describedby={showError ? 'name-error' : undefined}
      />
      {showError && (
        <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

