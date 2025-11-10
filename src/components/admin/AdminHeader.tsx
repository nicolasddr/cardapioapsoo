'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useToast, Toast } from '@/src/components/ui/Toast'
import Link from 'next/link'

export function AdminHeader({ userName }: { userName?: string }) {
  const router = useRouter()
  const toast = useToast()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)

    try {
      await supabase.auth.signOut()
      toast.showToast('Desconectado', 'Você foi desconectado com sucesso!')

      setTimeout(() => {
        router.push('/admin/login')
      }, 500)
    } catch (error) {
      toast.showToast('Erro', 'Erro ao fazer logout. Tente novamente.')
      setLoggingOut(false)
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
              Painel de Administração
            </Link>
          </div>
          <div className="flex items-center gap-4">
            {userName && <span className="text-sm text-gray-600 hidden sm:block">{userName}</span>}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loggingOut ? 'Saindo...' : 'Logout'}
            </button>
          </div>
        </div>
      </header>
      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

