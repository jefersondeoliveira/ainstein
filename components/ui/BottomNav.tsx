'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function BottomNav() {
  const { data: session } = useSession()
  const path = usePathname()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-subtle flex justify-around py-2 z-50">
      <Link href="/" className={`flex flex-col items-center gap-0.5 text-[10px] ${path === '/' ? 'text-accent' : 'text-text-muted'}`}>
        <span className="text-lg">🏠</span>Início
      </Link>
      <Link href={session ? '/generate' : '/login'} className={`flex flex-col items-center gap-0.5 text-[10px] ${path === '/generate' ? 'text-accent' : 'text-text-muted'}`}>
        <span className="text-lg">✨</span>Gerar
      </Link>
      <Link href="/login" className="flex flex-col items-center gap-0.5 text-[10px] text-text-muted">
        <span className="text-lg">👤</span>Perfil
      </Link>
    </nav>
  )
}
