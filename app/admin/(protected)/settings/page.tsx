import { StoreConfig } from '@/src/domain/entities/StoreConfig'
import { StoreSettingsForm } from '@/src/components/admin/StoreSettingsForm'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function StoreSettingsPage() {
  const supabase = createServerClient()

  let storeConfig: StoreConfig | null = null

  try {
    storeConfig = await StoreConfig.getSettings(supabase)
  } catch (error) {
    console.error('store-settings:load-error', error)
  }

  if (!storeConfig) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Configurações da Loja</h1>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-lg p-4">
          Não foi possível carregar as configurações da loja. Tente novamente mais tarde.
        </div>
      </div>
    )
  }

  return (
    <StoreSettingsForm
      initialData={{
        id: storeConfig.id,
        name: storeConfig.getName(),
        description: storeConfig.getDescription(),
        openingHours: storeConfig.getOpeningHours(),
        logoUrl: storeConfig.getLogoUrl(),
        coverUrl: storeConfig.getCoverUrl(),
        updatedAt: storeConfig.updatedAt.toISOString(),
      }}
    />
  )
}
