'use client'

import { ProductCard } from './ProductCard'

interface CategoryData {
  id: string
  name: string
  order: number
  active: boolean
}

interface ProductData {
  id: string
  name: string
  price: number
  categoryId: string
  status: string
  order: number
  displayPrice: string
  description?: string
  photoUrl?: string
}

interface CategorySectionProps {
  category: CategoryData
  products: ProductData[]
  onProductClick?: (productId: string) => void
}

export function CategorySection({
  category,
  products,
  onProductClick,
}: CategorySectionProps) {
  if (products.length === 0) {
    return null
  }

  return (
    <section
      id={`category-${category.id}`}
      className="container mx-auto px-4 py-8 scroll-mt-32"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{category.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={onProductClick}
          />
        ))}
      </div>
    </section>
  )
}
