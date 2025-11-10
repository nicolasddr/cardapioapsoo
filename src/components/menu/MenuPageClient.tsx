'use client'

import { useState } from 'react'
import { Category } from '@/src/domain/entities/Category'
import { CartItem } from '@/src/types/cart'
import { Header } from '@/src/components/menu/Header'
import { CoverSection } from '@/src/components/menu/CoverSection'
import { CategoryNavigation } from '@/src/components/menu/CategoryNavigation'
import { MenuContent } from '@/src/components/menu/MenuContent'
import { LoadingIndicator } from '@/src/components/menu/LoadingIndicator'
import { ProductDetailModal } from '@/src/components/menu/ProductDetailModal'
import { FloatingCartButton } from '@/src/components/menu/FloatingCartButton'
import { CartModal } from '@/src/components/menu/CartModal'

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

interface StoreConfigData {
  id: string
  name: string
  logoUrl: string | null
  coverUrl: string | null
  description: string | null
  openingHours: string | null
}

interface MenuPageClientProps {
  categories: CategoryData[]
  categoryProducts: Map<string, ProductData[]>
  storeConfig: StoreConfigData
}

export function MenuPageClient({
  categories,
  categoryProducts,
  storeConfig,
}: MenuPageClientProps) {
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<CartItem | null>(null)

  const handleProductClick = (productId: string) => {
    setSelectedProductId(productId)
    setEditItem(null)
    setIsProductModalOpen(true)
  }

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false)
    setSelectedProductId(null)
    setEditItem(null)
  }

  const handleEditItem = (item: CartItem) => {
    setSelectedProductId(item.productId)
    setEditItem(item)
    setIsCartModalOpen(false)
    setIsProductModalOpen(true)
  }

  return (
    <>
      <Header storeConfig={storeConfig} />
      <CoverSection storeConfig={storeConfig} />
      <CategoryNavigation categories={categories} />
      <MenuContent
        categories={categories}
        categoryProducts={categoryProducts}
        onProductClick={handleProductClick}
      />
      <FloatingCartButton onClick={() => setIsCartModalOpen(true)} />
      <ProductDetailModal
        productId={selectedProductId}
        isOpen={isProductModalOpen}
        onClose={handleCloseProductModal}
        onProductLoad={() => {}}
        editItem={editItem}
      />
      <CartModal
        isOpen={isCartModalOpen}
        onClose={() => setIsCartModalOpen(false)}
        onEditItem={handleEditItem}
      />
    </>
  )
}
