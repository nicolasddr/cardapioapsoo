'use client'

import { CategorySection } from './CategorySection'

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

interface MenuContentProps {
  categories: CategoryData[]
  categoryProducts: Map<string, ProductData[]>
  onProductClick?: (productId: string) => void
}

export function MenuContent({
  categories,
  categoryProducts,
  onProductClick,
}: MenuContentProps) {
  if (categories.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-lg text-gray-600">
          Cardápio em atualização. Em breve teremos novidades!
        </p>
      </div>
    )
  }

  return (
    <main className="min-h-screen">
      {categories.map((category) => {
        const products = categoryProducts.get(category.id) ?? []
        return (
          <CategorySection
            key={category.id}
            category={category}
            products={products}
            onProductClick={onProductClick}
          />
        )
      })}
    </main>
  )
}
