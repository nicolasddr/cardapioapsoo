'use client'

import Image from 'next/image'

interface StoreConfigData {
  id: string
  name: string
  logoUrl: string | null
  coverUrl: string | null
  description: string | null
  openingHours: string | null
}

interface HeaderProps {
  storeConfig: StoreConfigData
}

export function Header({ storeConfig }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {storeConfig.logoUrl ? (
            <div className="relative w-16 h-16 flex-shrink-0">
              <Image
                src={storeConfig.logoUrl}
                alt={`Logo ${storeConfig.name}`}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 font-semibold">
              {storeConfig.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {storeConfig.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {storeConfig.openingHours?.trim()
                ? storeConfig.openingHours
                : 'Horário não configurado'}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}

