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

interface CoverSectionProps {
  storeConfig: StoreConfigData
}

export function CoverSection({ storeConfig }: CoverSectionProps) {
  return (
    <section className="w-full">
      {storeConfig.coverUrl ? (
        <div className="relative w-full h-64 md:h-96">
          <Image
            src={storeConfig.coverUrl}
            alt="Capa do restaurante"
            fill
            className="object-cover"
            priority
          />
        </div>
      ) : (
        <div className="w-full h-48 md:h-72 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 flex items-center justify-center">
          <span className="text-sm text-gray-400">Imagem de capa não configurada</span>
        </div>
      )}
      <div className="container mx-auto px-4 py-6">
        <p className="text-gray-700 text-center max-w-2xl mx-auto">
          {storeConfig.description?.trim()
            ? storeConfig.description
            : 'Descrição não informada'}
        </p>
      </div>
    </section>
  )
}

