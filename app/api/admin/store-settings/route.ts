import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createServerClient } from '@/lib/supabase/server'
import {
  StoreConfig,
  StoreConfigValidationError,
  type UpdateStoreConfigPayload,
} from '@/src/domain/entities/StoreConfig'

export async function POST(request: Request) {
  try {
    const supabase = createServerClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    console.log('🔍 [store-settings] User check:', {
      hasUser: !!user,
      userId: user?.id,
      error: userError?.message,
    })

    if (userError || !user) {
      console.log('❌ [store-settings] No user found')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const formData = await request.formData()

    const nameInput = formData.get('name')
    const descriptionInput = formData.get('description')
    const openingHoursInput = formData.get('openingHours')

    const payload: UpdateStoreConfigPayload = {
      name: typeof nameInput === 'string' ? nameInput : '',
      description: typeof descriptionInput === 'string' ? descriptionInput : '',
      openingHours:
        typeof openingHoursInput === 'string' ? openingHoursInput : '',
      removeLogo: formData.get('removeLogo') === 'true',
      removeCover: formData.get('removeCover') === 'true',
    }

    const logoInput = formData.get('logo')
    const coverInput = formData.get('cover')

    // No Node.js, FormData retorna objetos com propriedades de arquivo, não instâncias de File
    const logoFile = logoInput && typeof logoInput === 'object' && 'size' in logoInput && logoInput.size > 0 ? logoInput as File : null
    const coverFile = coverInput && typeof coverInput === 'object' && 'size' in coverInput && coverInput.size > 0 ? coverInput as File : null

    console.log('📝 [store-settings] Update payload:', {
      name: payload.name,
      hasLogo: !!logoFile,
      hasCover: !!coverFile,
      removeLogo: payload.removeLogo,
      removeCover: payload.removeCover,
    })

    const storeConfig = await StoreConfig.update(payload, {
      files: {
        logo: logoFile,
        cover: coverFile,
      },
      client: supabase,
    })

    console.log('✅ [store-settings] Update successful')

    try {
      await revalidatePath('/menu')
    } catch (error) {
      console.error('store-settings:revalidate-error', error)
      return NextResponse.json(
        { error: 'Não foi possível atualizar o cardápio agora. Tente novamente.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        data: {
          id: storeConfig.id,
          name: storeConfig.getName(),
          logoUrl: storeConfig.getLogoUrl(),
          coverUrl: storeConfig.getCoverUrl(),
          description: storeConfig.getDescription(),
          openingHours: storeConfig.getOpeningHours(),
          updatedAt: storeConfig.updatedAt.toISOString(),
        },
        error: null,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('❌ [store-settings] Error:', error)
    
    if (error instanceof StoreConfigValidationError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.fieldErrors },
        { status: 400 }
      )
    }

    const message = error instanceof Error ? error.message : 'Erro ao atualizar configurações'

    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
