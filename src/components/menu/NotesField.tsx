'use client'

interface NotesFieldProps {
  value: string
  onChange: (value: string) => void
  maxLength?: number
}

export function NotesField({
  value,
  onChange,
  maxLength = 500,
}: NotesFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    if (newValue.length <= maxLength) {
      onChange(newValue)
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
        Observações
      </label>
      <textarea
        id="notes"
        value={value}
        onChange={handleChange}
        rows={3}
        maxLength={maxLength}
        placeholder="Adicione observações especiais para este item..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>Máximo {maxLength} caracteres</span>
        <span>
          {value.length}/{maxLength}
        </span>
      </div>
    </div>
  )
}

