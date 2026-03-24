'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Level } from '@prisma/client'
import { Einstein } from '@/components/einstein/Einstein'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { useGeneration } from '@/app/GenerationProvider'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }
interface Course { id: string; title: string; topic: string; level: Level; status: string; lessons: Lesson[] }

const MESSAGES = [
  'Organizando os conceitos...',
  'Escrevendo as aulas...',
  'Preparando exemplos práticos...',
  'Revisando o conteúdo...',
  'Quase pronto...',
]

export default function CoursePage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { status: sessionStatus } = useSession()
  const { generation, startTracking } = useGeneration()
  const msgIndex = useRef(0)
  const msgIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const isThisCourse = generation?.courseId === params.id

  // Redirect once lesson 1 is ready
  useEffect(() => {
    if (isThisCourse && generation?.firstReady) {
      router.replace(`/course/${params.id}/lesson/1`)
    }
  }, [isThisCourse, generation?.firstReady, params.id, router])

  // Boot: fetch course, start tracking if needed
  useEffect(() => {
    if (sessionStatus === 'loading') return
    if (isThisCourse) return // already tracking

    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        if (c.status === 'READY') {
          router.replace(`/course/${params.id}/lesson/1`)
          return
        }
        if (c.status !== 'GENERATING') return

        // Request notification permission
        if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
          Notification.requestPermission()
        }

        const lesson1Ready = c.lessons?.some((l: Lesson) => l.order === 1 && l.status === 'READY')
        startTracking(params.id, c.title || c.topic, c.lessons ?? [])

        // If lesson 1 already done, go straight to it without showing generation screen
        if (lesson1Ready) {
          router.replace(`/course/${params.id}/lesson/1`)
        }
      })
  }, [params.id, sessionStatus, isThisCourse, startTracking, router])

  if (!isThisCourse && !generation) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-4">
        <Einstein state="thinking" size={90} />
        <p className="text-text-muted text-sm animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (generation?.failed && isThisCourse) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 px-6 text-center">
        <Einstein state="idle" size={90} />
        <div>
          <p className="text-text-primary font-semibold mb-1">Algo deu errado</p>
          <p className="text-text-muted text-sm mb-5">Einstein não conseguiu terminar o curso.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/" className="text-sm text-text-muted border border-subtle px-4 py-2 rounded-xl">Explorar</Link>
            <button
              onClick={async () => {
                await fetch(`/api/courses/${params.id}/retry`, { method: 'POST' })
                startTracking(params.id, generation.courseTitle)
              }}
              className="bg-accent text-base text-sm font-semibold px-5 py-2 rounded-xl"
            >
              Continuar geração
            </button>
          </div>
        </div>
      </div>
    )
  }

  const lessons = isThisCourse ? generation!.lessons : []
  const readyCount = lessons.filter(l => l.status === 'READY').length
  const msgI = lessons.length > 0 ? Math.min(Math.floor((readyCount / Math.max(lessons.length, 1)) * MESSAGES.length), MESSAGES.length - 1) : 0

  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-8 px-6 py-12">
      {/* Header */}
      {isThisCourse && generation && (
        <div className="flex flex-col items-center gap-1.5 text-center max-w-xs">
          <h1 className="text-lg font-bold text-text-primary">{generation.courseTitle}</h1>
        </div>
      )}

      <Einstein state="thinking" size={120} />

      <div className="flex flex-col items-center gap-4 text-center w-full max-w-xs">
        <p className="text-accent text-sm font-medium animate-pulse">{MESSAGES[msgI]}</p>

        {lessons.length > 0 && (
          <div className="flex flex-col gap-1.5 w-full">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors ${
                  l.status === 'READY' ? 'bg-accent' : 'bg-accent/30 animate-pulse'
                }`} />
                <span className={`text-xs truncate transition-colors text-left ${
                  l.status === 'READY' ? 'text-text-secondary' : 'text-text-muted'
                }`}>
                  {l.title || 'Preparando...'}
                  {l.status === 'PENDING' && <span className="ml-1 opacity-40 animate-pulse">·</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Allow navigation while generating */}
        <Link
          href="/"
          className="mt-2 text-xs text-text-muted border border-subtle px-4 py-2 rounded-xl hover:border-accent/30 transition-colors"
        >
          Explorar outros cursos →
        </Link>
        <p className="text-[10px] text-text-muted opacity-60">
          A geração continua em segundo plano
        </p>
      </div>
    </div>
  )
}
