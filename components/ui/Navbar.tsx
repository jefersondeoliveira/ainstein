'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useGeneration } from '@/app/GenerationProvider'

export function Navbar() {
  const { data: session } = useSession()
  const router = useRouter()
  const { generation, dismiss } = useGeneration()

  const goHome = () => { router.push('/'); router.refresh() }

  return (
    <>
      <nav className="sticky top-0 z-50 bg-surface border-b border-subtle h-12 flex items-center px-4 sm:px-6 gap-4">
        <button onClick={goHome} className="text-lg font-bold text-accent">
          AI<span className="text-text-primary">.nstein</span>
        </button>

        <div className="hidden sm:flex gap-5 flex-1">
          <button onClick={goHome} className="text-sm text-text-muted hover:text-text-secondary transition-colors">Explorar</button>
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

      {/* Background generation toast */}
      {generation && (
        <div className="fixed bottom-20 sm:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm">
          <div className="bg-surface border border-subtle rounded-xl px-4 py-3 shadow-lg flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              generation.failed ? 'bg-red-400' : generation.firstReady ? 'bg-accent' : 'bg-accent/60 animate-pulse'
            }`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{generation.courseTitle}</p>
              <p className="text-[10px] text-text-muted">
                {generation.failed
                  ? 'Falha na geração'
                  : generation.firstReady
                  ? 'Pronto para começar!'
                  : `Gerando... ${generation.lessons.filter(l => l.status === 'READY').length}/${generation.lessons.length} aulas`}
              </p>
            </div>
            {generation.firstReady && !generation.failed && (
              <Link
                href={`/course/${generation.courseId}/lesson/1`}
                onClick={dismiss}
                className="bg-accent text-base text-[10px] font-bold px-3 py-1.5 rounded-lg flex-shrink-0"
              >
                Começar →
              </Link>
            )}
            <button onClick={dismiss} className="text-text-muted hover:text-text-secondary text-xs flex-shrink-0 ml-1">✕</button>
          </div>
        </div>
      )}
    </>
  )
}
