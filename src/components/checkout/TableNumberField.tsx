'use client'

import { useState } from 'react'

interface TableNumberFieldProps {
  value: number | null
  onChange: (value: number | null) => void
  error?: string
}

export function TableNumberField({
  value,
  onChange,
  error,
}: TableNumberFieldProps) {
  const [touched, setTouched] = useState(false)
  const showError = touched && error

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const numValue = e.target.value === '' ? null : parseInt(e.target.value, 10)
    onChange(numValue)
    setTouched(true)
  }

  const handleBlur = () => {
    setTouched(true)
  }

  return (
    <div>
      <label htmlFor="table" className="block text-sm font-medium text-gray-700 mb-1">
        Número da Mesa <span className="text-red-500">*</span>
      </label>
      <input
        id="table"
        type="number"
        value={value ?? ''}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Ex: 5"
        min="1"
        max="999"
        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 ${
          showError
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-green-500 focus:border-green-500'
        }`}
        aria-invalid={!!showError}
        aria-describedby={showError ? 'table-error' : undefined}
      />
      {showError && (
        <p id="table-error" className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

