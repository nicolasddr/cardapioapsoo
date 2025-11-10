'use client'

interface CategoryData {
  id: string
  name: string
  order: number
  active: boolean
}

interface CategoryNavigationProps {
  categories: CategoryData[]
}

export function CategoryNavigation({ categories }: CategoryNavigationProps) {
  const handleCategoryClick = (categoryId: string) => {
    const element = document.getElementById(`category-${categoryId}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (categories.length === 0) {
    return null
  }

  return (
    <nav className="sticky top-[73px] z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex gap-4 overflow-x-auto py-3 scrollbar-hide snap-x snap-mandatory">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className="flex-shrink-0 px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors whitespace-nowrap snap-start"
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

