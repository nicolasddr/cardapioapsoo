import { Category } from '@/src/domain/entities/Category'
import { Product } from '@/src/domain/entities/Product'
import { StoreConfig } from '@/src/domain/entities/StoreConfig'
import { LoadingIndicator } from '@/src/components/menu/LoadingIndicator'
import { MenuPageClient } from '@/src/components/menu/MenuPageClient'
import { Suspense } from 'react'

async function MenuPageContent() {
  const categories = await Category.getAllActive()
  const categoriesWithProducts = await Promise.all(
    categories.map(async (category) => {
      const hasProducts = await category.hasActiveProducts()
      return { category, hasProducts }
    })
  )

  const activeCategories = categoriesWithProducts
    .filter(({ hasProducts }) => hasProducts)
    .map(({ category }) => category)

  const categoryProductsMap = new Map<string, Product[]>()

  await Promise.all(
    activeCategories.map(async (category) => {
      const products = await category.getProducts()
      categoryProductsMap.set(category.id, products)
    })
  )

  const storeConfig = await StoreConfig.getSettings().catch(() => {
    return new StoreConfig(
      'default',
      'Restaurante',
      null,
      null,
      null,
      null,
      new Date(),
      new Date()
    )
  })

  // Converter classes para objetos simples para passar para Client Components
  const storeConfigData = {
    id: storeConfig.id,
    name: storeConfig.getName(),
    logoUrl: storeConfig.getLogoUrl(),
    coverUrl: storeConfig.getCoverUrl(),
    description: storeConfig.getDescription(),
    openingHours: storeConfig.getOpeningHours(),
  }

  const categoriesData = activeCategories.map((category) => ({
    id: category.id,
    name: category.name,
    order: category.order,
    active: category.active,
  }))

  const productsData = new Map<string, Array<{
    id: string
    name: string
    price: number
    categoryId: string
    status: string
    order: number
    displayPrice: string
    description?: string
    photoUrl?: string
  }>>()

  activeCategories.forEach((category) => {
    const products = categoryProductsMap.get(category.id) ?? []
    productsData.set(
      category.id,
      products.map((product) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        categoryId: product.categoryId,
        status: product.status,
        order: product.order,
        displayPrice: product.getDisplayPrice(),
        description: product.description,
        photoUrl: product.photoUrl,
      }))
    )
  })

  return (
    <MenuPageClient
      categories={categoriesData as any}
      categoryProducts={productsData as any}
      storeConfig={storeConfigData as any}
    />
  )
}

export default function MenuPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <MenuPageContent />
    </Suspense>
  )
}

