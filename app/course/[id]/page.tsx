'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Level } from '@prisma/client'
import { Einstein } from '@/components/einstein/Einstein'
import { LevelBadge } from '@/components/ui/LevelBadge'

interface Lesson { id: string; title: string; order: number; status: string }
interface Course {
  id: string; title: string; topic: string; level: Level; status: string
  lessons: Lesson[]
}

const MESSAGES = [
  'Organizando os conceitos...',
  'Escrevendo as aulas...',
  'Preparando exemplos práticos...',
  'Revisando o conteúdo...',
  'Quase pronto...',
]

export default function CoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [msgIndex, setMsgIndex] = useState(0)
  const [failed, setFailed] = useState(false)
  const redirected = useRef(false)

  const { status: sessionStatus } = useSession()
  const router = useRouter()

  // Cycle through loading messages
  useEffect(() => {
    if (!course || course.status !== 'GENERATING') return
    const t = setInterval(() => setMsgIndex(i => (i + 1) % MESSAGES.length), 2500)
    return () => clearInterval(t)
  }, [course])

  const startStream = useCallback(() => {
    if (sessionStatus !== 'authenticated') return
    const es = new EventSource(`/api/courses/${params.id}/stream`)

    es.addEventListener('lesson_created', e => {
      const lesson = JSON.parse(e.data) as Lesson
      setLessons(prev => {
        if (prev.find(l => l.id === lesson.id)) return prev
        return [...prev, { ...lesson, status: 'PENDING' }].sort((a, b) => a.order - b.order)
      })
    })

    es.addEventListener('lesson_ready', e => {
      const { id } = JSON.parse(e.data) as { id: string }
      setLessons(prev => {
        const updated = prev.map(l => l.id === id ? { ...l, status: 'READY' } : l)
        // Redirect to lesson 1 as soon as it's ready
        const first = updated.find(l => l.order === 1 && l.status === 'READY')
        if (first && !redirected.current) {
          redirected.current = true
          es.close()
          router.replace(`/course/${params.id}/lesson/1?generating=1`)
        }
        return updated
      })
    })

    es.addEventListener('course_ready', () => {
      es.close()
      if (!redirected.current) {
        redirected.current = true
        router.replace(`/course/${params.id}/lesson/1`)
      }
    })

    es.addEventListener('course_failed', () => {
      setFailed(true)
      es.close()
    })

    es.onerror = () => es.close()
    return es
  }, [params.id, sessionStatus, router])

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        setCourse(c)
        if (c.status === 'READY') {
          router.replace(`/course/${params.id}/lesson/1`)
          return
        }
        if (c.status === 'FAILED') { setFailed(true); return }
        setLessons(c.lessons)
        if (sessionStatus === 'authenticated') startStream()
      })
  }, [params.id, sessionStatus, startStream, router])

  const handleRetry = async () => {
    await fetch(`/api/courses/${params.id}/retry`, { method: 'POST' })
    setFailed(false)
    setLessons([])
    redirected.current = false
    startStream()
  }

  // Loading before course data arrives
  if (!course) return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6">
      <Einstein state="thinking" size={100} />
      <p className="text-text-muted text-sm animate-pulse">Carregando...</p>
    </div>
  )

  if (failed) return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-6 px-6 text-center">
      <Einstein state="idle" size={90} />
      <div>
        <p className="text-text-primary font-semibold mb-1">Algo deu errado</p>
        <p className="text-text-muted text-sm mb-5">Einstein não conseguiu gerar o curso.</p>
        <button onClick={handleRetry} className="bg-accent text-base text-sm font-semibold px-5 py-2.5 rounded-xl">
          Tentar novamente
        </button>
      </div>
    </div>
  )

  // Generation screen
  return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-8 px-6">
      <div className="flex flex-col items-center gap-2 text-center max-w-xs">
        <LevelBadge level={course.level} />
        <h1 className="text-lg font-bold text-text-primary mt-1">{course.title}</h1>
        <p className="text-xs text-text-muted">{course.topic}</p>
      </div>

      <Einstein state="thinking" size={120} />

      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-accent text-sm font-medium animate-pulse">
          {MESSAGES[msgIndex]}
        </p>
        {lessons.length > 0 && (
          <div className="flex flex-col gap-1.5 w-64">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  l.status === 'READY' ? 'bg-accent' : 'bg-accent/30 animate-pulse'
                }`} />
                <span className={`text-xs truncate ${
                  l.status === 'READY' ? 'text-text-secondary' : 'text-text-muted'
                }`}>
                  {l.status === 'PENDING' ? 'Gerando...' : l.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
