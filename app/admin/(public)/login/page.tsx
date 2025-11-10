'use client'

import { LoginForm } from '@/src/components/admin/LoginForm'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Painel de Administração</h1>
          <p className="mt-2 text-sm text-gray-600">Faça login para continuar</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8">
          <LoginForm />
        </div>
      </div>
    </div>
  )
}


