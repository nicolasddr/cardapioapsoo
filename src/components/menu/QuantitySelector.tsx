'use client'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max = 99,
}: QuantitySelectorProps) {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1)
    }
  }

  const handleIncrease = () => {
    if (value < max) {
      onChange(value + 1)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Quantidade:</span>
      <div className="flex items-center gap-2 border border-gray-300 rounded-md">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={value <= min}
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-l-md transition-colors"
          aria-label="Diminuir quantidade"
        >
          −
        </button>
        <span className="px-4 py-1 text-gray-900 font-medium min-w-[3rem] text-center">
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrease}
          disabled={value >= max}
          className="px-3 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-r-md transition-colors"
          aria-label="Aumentar quantidade"
        >
          +
        </button>
      </div>
    </div>
  )
}

