'use client'

import { useEffect, useState } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { CategoryModal } from '@/src/components/admin/CategoryModal'
import { ProductModal } from '@/src/components/admin/ProductModal'
import { DeleteConfirmModal } from '@/src/components/admin/DeleteConfirmModal'

interface CategoryData {
  id: string
  name: string
  order: number
  active: boolean
  productCount?: number
}

interface ProductData {
  id: string
  name: string
  description: string | null
  price: number
  categoryId: string
  status: 'Ativo' | 'Inativo'
  order: number
  photoUrl: string | null
}

interface OptionGroupData {
  id: string
  name: string
  selectionType: 'single' | 'multiple'
}

export default function ProductsPage() {
  const toast = useToast()
  const [categories, setCategories] = useState<CategoryData[]>([])
  const [products, setProducts] = useState<ProductData[]>([])
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryData | null>(null)

  const [isProductModalOpen, setProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductData | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'category' | 'product'
    id: string
    name: string
  }>({
    isOpen: false,
    type: 'category',
    id: '',
    name: '',
  })
  const [isDeleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [categoriesRes, productsRes, optionGroupsRes] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/products'),
        fetch('/api/admin/option-groups'),
      ])

      if (!categoriesRes.ok || !productsRes.ok || !optionGroupsRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const categoriesData = await categoriesRes.json()
      const productsData = await productsRes.json()
      const optionGroupsData = await optionGroupsRes.json()

      const categoriesWithCount = (categoriesData.data ?? []).map((cat: CategoryData) => ({
        ...cat,
        productCount: (productsData.data ?? []).filter((p: ProductData) => p.categoryId === cat.id).length,
      }))

      setCategories(categoriesWithCount)
      setProducts(productsData.data ?? [])
      setOptionGroups(optionGroupsData.data ?? [])
    } catch (error) {
      toast.showToast('Erro', 'Não foi possível carregar os dados')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = selectedCategoryId
    ? products.filter((p) => p.categoryId === selectedCategoryId)
    : products

  function handleCreateCategory() {
    setEditingCategory(null)
    setCategoryModalOpen(true)
  }

  function handleEditCategory(category: CategoryData) {
    setEditingCategory(category)
    setCategoryModalOpen(true)
  }

  function handleDeleteCategory(category: CategoryData) {
    setDeleteConfirm({
      isOpen: true,
      type: 'category',
      id: category.id,
      name: category.name,
    })
  }

  function handleCreateProduct() {
    if (categories.length === 0) {
      toast.showToast('Aviso', 'Crie uma categoria primeiro')
      return
    }
    setEditingProduct(null)
    setProductModalOpen(true)
  }

  function handleEditProduct(product: ProductData) {
    setEditingProduct(product)
    setProductModalOpen(true)
  }

  function handleDeleteProduct(product: ProductData) {
    setDeleteConfirm({
      isOpen: true,
      type: 'product',
      id: product.id,
      name: product.name,
    })
  }

  async function confirmDelete() {
    setDeleting(true)

    try {
      const url =
        deleteConfirm.type === 'category'
          ? `/api/admin/categories?id=${deleteConfirm.id}`
          : `/api/admin/products?id=${deleteConfirm.id}`

      const response = await fetch(url, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir')
      }

      toast.showToast(
        'Sucesso!',
        deleteConfirm.type === 'category'
          ? 'Categoria excluída com sucesso'
          : 'Produto excluído com sucesso'
      )
      loadData()
      setDeleteConfirm({ isOpen: false, type: 'category', id: '', name: '' })
    } catch (error) {
      toast.showToast('Erro', error instanceof Error ? error.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Produtos & Categorias</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Toast
          open={toast.open}
          onOpenChange={toast.onOpenChange}
          title={toast.title}
          description={toast.description}
        />
      </>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Produtos & Categorias</h1>
          <div className="space-x-2">
            <button
              onClick={handleCreateCategory}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Nova Categoria
            </button>
            <button
              onClick={handleCreateProduct}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Novo Produto
            </button>
          </div>
        </div>

        {categories.length === 0 && products.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma categoria criada</h3>
            <p className="text-gray-600 mb-4">Comece criando uma categoria para organizar seus produtos.</p>
            <button
              onClick={handleCreateCategory}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Criar primeira categoria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Categorias</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      selectedCategoryId === null
                        ? 'bg-green-100 text-green-900 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    Todas ({products.length})
                  </button>
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategoryId(cat.id)}
                        className={`w-full text-left px-3 py-2 rounded-md ${
                          selectedCategoryId === cat.id
                            ? 'bg-green-100 text-green-900 font-medium'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="space-y-2">
                          <div>
                            {cat.name} ({cat.productCount ?? 0})
                          </div>
                          {selectedCategoryId === cat.id && (
                            <div className="flex gap-1 pt-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditCategory(cat)
                                }}
                                className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                              >
                                Editar
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteCategory(cat)
                                }}
                                className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                              >
                                Excluir
                              </button>
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Produtos {selectedCategoryId && `- ${categories.find((c) => c.id === selectedCategoryId)?.name}`}
                </h2>
                {filteredProducts.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Nenhum produto encontrado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                      <div
                        key={product.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors"
                      >
                        <div className="flex gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                              }).format(product.price)}
                            </p>
                            <div className="mt-2">
                              <span
                                className={`text-xs px-2 py-1 rounded ${
                                  product.status === 'Ativo'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {product.status}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="flex-1 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product)}
                            className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        onSuccess={loadData}
        editCategory={editingCategory}
        showToast={toast.showToast}
      />

      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSuccess={loadData}
        categories={categories}
        optionGroups={optionGroups}
        editProduct={editingProduct}
        showToast={toast.showToast}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: 'category', id: '', name: '' })}
        onConfirm={confirmDelete}
        title={`Excluir ${deleteConfirm.type === 'category' ? 'Categoria' : 'Produto'}`}
        message={`Tem certeza que deseja excluir ${
          deleteConfirm.type === 'category' ? 'a categoria' : 'o produto'
        } "${deleteConfirm.name}"? Esta ação não pode ser desfeita.`}
        isDeleting={isDeleting}
      />

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

