'use client'

interface ProductData {
  id: string
  name: string
  price: number
  categoryId: string
  status: string
  order: number
  displayPrice: string
}

interface ProductCardProps {
  product: ProductData
  onClick?: (productId: string) => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const handleClick = () => {
    onClick?.(product.id)
  }

  return (
    <div
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {product.name}
      </h3>
      <p className="text-xl font-bold text-green-600">
        {product.displayPrice}
      </p>
    </div>
  )
}

