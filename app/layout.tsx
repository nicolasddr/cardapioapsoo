import type { Metadata } from 'next'
import './globals.css'
import { CartProvider } from '@/src/contexts/CartContext'

export const metadata: Metadata = {
  title: 'Cardápio',
  description: 'Cardápio digital do restaurante',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}

