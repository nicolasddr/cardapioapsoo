import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { AdminHeader } from '@/src/components/admin/AdminHeader'
import { AdminSidebar } from '@/src/components/admin/AdminSidebar'

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()

  // Usar getUser() diretamente para verificação real no servidor
  // getSession() pode retornar dados não autenticados do cookie
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect('/admin/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError || !profile || profile.role !== 'admin') {
    redirect('/admin/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="pl-64">
        <AdminHeader userName={user.email || undefined} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}


