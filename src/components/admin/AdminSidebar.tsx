'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function AdminSidebar() {
  const pathname = usePathname()

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard' },
    { href: '/admin/products', label: 'Produtos & Categorias' },
    { href: '/admin/options', label: 'Opcionais' },
    { href: '/admin/coupons', label: 'Cupons' },
    { href: '/admin/orders', label: 'Pedidos' },
    { href: '/admin/customers', label: 'Clientes' },
    { href: '/admin/settings', label: 'Configurações da Loja' },
  ]

  return (
    <aside className="bg-gray-800 text-white w-64 min-h-screen fixed left-0 top-0">
      <nav className="p-4 pt-20">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-gray-700 text-white font-semibold'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

