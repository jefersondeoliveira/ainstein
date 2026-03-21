// app/layout.tsx
import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI.nstein — Cursos com IA',
  description: 'Gere cursos completos com inteligência artificial',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="pt-BR">
      <body className="bg-base text-text-primary antialiased">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
