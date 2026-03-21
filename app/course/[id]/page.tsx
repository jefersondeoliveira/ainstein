// app/course/[id]/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Level } from '@prisma/client'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Einstein } from '@/components/einstein/Einstein'
import { LevelBadge } from '@/components/ui/LevelBadge'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }
interface Course {
  id: string; title: string; topic: string; level: Level; status: string
  lessons: Lesson[]; user: { name: string | null; image: string | null }
}

export default function CoursePage({ params }: { params: { id: string } }) {
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [generating, setGenerating] = useState(false)
  const [failed, setFailed] = useState(false)

  const { status: sessionStatus } = useSession()

  const startStream = useCallback(() => {
    if (sessionStatus !== 'authenticated') return
    setGenerating(true)
    const es = new EventSource(`/api/courses/${params.id}/stream`)

    es.addEventListener('lesson_created', e => {
      const lesson = JSON.parse(e.data) as Lesson
      setLessons(prev => {
        if (prev.find(l => l.id === lesson.id)) return prev
        return [...prev, { ...lesson, status: 'PENDING' }].sort((a, b) => a.order - b.order)
      })
    })
    es.addEventListener('lesson_ready', e => {
      const { id, content } = JSON.parse(e.data) as { id: string; content: string }
      setLessons(prev => prev.map(l => l.id === id ? { ...l, status: 'READY', content } : l))
    })
    es.addEventListener('course_ready', () => {
      setGenerating(false)
      es.close()
    })
    es.addEventListener('course_failed', () => {
      setFailed(true)
      setGenerating(false)
      es.close()
    })
    es.onerror = () => es.close()
  }, [params.id, sessionStatus])

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        setCourse(c)
        setLessons(c.lessons)
        if (c.status === 'GENERATING') {
          if (sessionStatus === 'authenticated') startStream()
        }
        if (c.status === 'FAILED') setFailed(true)
      })
  }, [params.id, sessionStatus, startStream])

  const handleRetry = async () => {
    await fetch(`/api/courses/${params.id}/retry`, { method: 'POST' })
    setFailed(false)
    setLessons([])
    startStream()
  }

  if (!course) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="text-text-muted text-sm">Carregando...</div>
    </div>
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6 mb-8">
            <Einstein state={generating ? 'thinking' : 'idle'} size={80} />
            <div className="flex-1">
              <LevelBadge level={course.level} />
              <h1 className="text-xl font-bold text-text-primary mt-2 mb-1">{course.title}</h1>
              <p className="text-xs text-text-muted">{course.topic}</p>
              {generating && <p className="text-xs text-accent mt-2 animate-pulse">Einstein está preparando o curso...</p>}
              {failed && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-xs text-red-400">Falha na geração.</p>
                  <button onClick={handleRetry} className="text-xs text-accent border border-accent/30 px-3 py-1 rounded-lg">Tentar novamente</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-widest text-text-muted mb-2">
              {lessons.length} aulas {generating ? '(gerando...)' : ''}
            </p>
            {lessons.map(lesson => (
              <Link
                key={lesson.id}
                href={lesson.status === 'READY' ? `/course/${params.id}/lesson/${lesson.order}` : '#'}
                className={`flex items-center gap-3 bg-raised border border-subtle rounded-xl px-4 py-3 transition-colors ${
                  lesson.status === 'READY' ? 'hover:border-accent/20' : 'opacity-50 pointer-events-none'
                }`}
              >
                <span className="w-7 h-7 rounded-full border border-subtle flex items-center justify-center text-xs text-text-muted flex-shrink-0">
                  {lesson.order}
                </span>
                <span className="text-sm text-text-secondary">
                  {lesson.status === 'PENDING' ? <span className="animate-pulse">Gerando aula...</span> : lesson.title}
                </span>
              </Link>
            ))}
          </div>

          {course.status === 'READY' && (
            <div className="mt-6">
              <Link href={`/course/${params.id}/test`} className="block w-full text-center bg-accent text-base font-semibold py-3 rounded-xl text-sm">
                Fazer quiz final →
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
