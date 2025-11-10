'use client'

export function LoadingIndicator() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="text-gray-600">Carregando cardápio...</p>
      </div>
    </div>
  )
}

