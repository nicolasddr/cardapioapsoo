'use client'

interface OrderTypeSelectorProps {
  value: 'Retirada' | 'Consumo no Local' | null
  onChange: (value: 'Retirada' | 'Consumo no Local') => void
}

export function OrderTypeSelector({ value, onChange }: OrderTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Modalidade <span className="text-red-500">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => onChange('Retirada')}
          className={`p-4 border-2 rounded-lg text-left transition-colors ${
            value === 'Retirada'
              ? 'border-green-600 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                value === 'Retirada' ? 'border-green-600' : 'border-gray-400'
              }`}
            >
              {value === 'Retirada' && (
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900">Retirada</div>
              <div className="text-sm text-gray-600">
                Buscar no restaurante
              </div>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onChange('Consumo no Local')}
          className={`p-4 border-2 rounded-lg text-left transition-colors ${
            value === 'Consumo no Local'
              ? 'border-green-600 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-4 h-4 border-2 rounded-full flex items-center justify-center ${
                value === 'Consumo no Local' ? 'border-green-600' : 'border-gray-400'
              }`}
            >
              {value === 'Consumo no Local' && (
                <div className="w-2 h-2 bg-green-600 rounded-full" />
              )}
            </div>
            <div>
              <div className="font-semibold text-gray-900">Consumo no Local</div>
              <div className="text-sm text-gray-600">Sentar na mesa</div>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}

