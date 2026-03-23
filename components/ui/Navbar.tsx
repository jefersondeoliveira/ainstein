'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-subtle h-12 flex items-center px-4 sm:px-6 gap-4">
      <Link href="/" className="text-lg font-bold text-accent">
        AI<span className="text-text-primary">.nstein</span>
      </Link>

      <div className="hidden sm:flex gap-5 flex-1">
        <Link href="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Explorar</Link>
        {session && (
          <Link href="/my-courses" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Meus cursos</Link>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {session ? (
          <>
            {session.user?.image && (
              <Image src={session.user.image} alt="" width={28} height={28} className="rounded-full" />
            )}
            <button onClick={() => signOut()} className="text-xs text-text-muted hover:text-text-secondary">Sair</button>
          </>
        ) : (
          <Link href="/login" className="bg-accent text-base text-sm font-semibold px-3 py-1.5 rounded-lg">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
