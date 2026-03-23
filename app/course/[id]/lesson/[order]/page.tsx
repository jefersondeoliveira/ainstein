'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Einstein } from '@/components/einstein/Einstein'
import { LessonList } from '@/components/course/LessonList'
import { LessonContent } from '@/components/course/LessonContent'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }
interface Course { id: string; title: string; lessons: Lesson[]; status: string }

export default function LessonPage({ params }: { params: { id: string; order: string } }) {
  const order = parseInt(params.order)
  const searchParams = useSearchParams()
  const isGenerating = searchParams.get('generating') === '1'

  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [generating, setGenerating] = useState(isGenerating)
  const [isTyping, setIsTyping] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])

  // Keep sidebar updated from SSE during generation
  const attachStream = useCallback((courseId: string) => {
    const es = new EventSource(`/api/courses/${courseId}/stream`)

    es.addEventListener('lesson_created', e => {
      const l = JSON.parse(e.data) as Lesson
      setLessons(prev => {
        if (prev.find(x => x.id === l.id)) return prev
        return [...prev, { ...l, status: 'PENDING' }].sort((a, b) => a.order - b.order)
      })
    })

    es.addEventListener('lesson_ready', e => {
      const { id, content } = JSON.parse(e.data) as { id: string; content: string }
      setLessons(prev => prev.map(l => l.id === id ? { ...l, status: 'READY', content } : l))
      // Update current lesson content if it just became ready
      setLesson(prev => prev?.id === id ? { ...prev, status: 'READY', content } : prev)
    })

    es.addEventListener('course_ready', () => {
      setGenerating(false)
      es.close()
    })

    es.addEventListener('course_failed', () => {
      setGenerating(false)
      es.close()
    })

    es.onerror = () => { setGenerating(false); es.close() }
    return es
  }, [])

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        setCourse(c)
        setLessons(c.lessons)
        const l = c.lessons.find((x: Lesson) => x.order === order) ?? null
        setLesson(l)

        if (c.status === 'GENERATING') {
          setGenerating(true)
          const es = attachStream(params.id)
          return () => es.close()
        }

        // Poll if this specific lesson is still pending
        if (l?.status === 'PENDING') {
          const interval = setInterval(async () => {
            const r2 = await fetch(`/api/courses/${params.id}`)
            const c2 = await r2.json() as Course
            const l2 = c2.lessons.find((x: Lesson) => x.order === order)
            if (l2?.status === 'READY') {
              setLesson(l2)
              setLessons(c2.lessons)
              clearInterval(interval)
            }
          }, 3000)
          return () => clearInterval(interval)
        }
      })
  }, [params.id, order, attachStream])

  const markComplete = async () => {
    if (!lesson || completed.includes(lesson.id)) return
    await fetch(`/api/courses/${params.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, lastLessonId: lesson.id }),
    })
    setCompleted(prev => [...prev, lesson.id])
  }

  if (!course || !lesson) return (
    <div className="min-h-screen bg-base flex flex-col items-center justify-center gap-4">
      <Einstein state="thinking" size={90} />
      <p className="text-text-muted text-sm animate-pulse">Einstein está preparando a aula...</p>
    </div>
  )

  const prevLesson = lessons.find(l => l.order === order - 1)
  const nextLesson = lessons.find(l => l.order === order + 1 && l.status === 'READY')

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-48px)] bg-base">
        {/* Einstein sidebar */}
        <aside className="hidden sm:flex w-44 min-w-[11rem] flex-col items-center bg-surface border-r border-subtle p-4 gap-3">
          <p className="text-[9px] uppercase tracking-widest text-text-muted">Einstein</p>
          <Einstein
            state={generating ? 'thinking' : isTyping ? 'talking' : 'idle'}
            size={100}
          />
          <p className="text-[10px] text-accent text-center">
            {generating ? 'Criando curso...' : isTyping ? 'Explicando...' : 'Pronto'}
          </p>
          {generating && (
            <p className="text-[9px] text-text-muted text-center animate-pulse">
              Outras aulas sendo geradas
            </p>
          )}
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Einstein bar */}
          <div className="sm:hidden flex items-center gap-3 bg-surface border-b border-subtle p-3">
            <Einstein state={generating ? 'thinking' : isTyping ? 'talking' : 'idle'} size={44} />
            <div className="flex-1 text-xs text-text-secondary leading-relaxed line-clamp-2">
              {generating ? 'Einstein está criando o curso...' : isTyping ? 'Einstein está explicando...' : lesson.title}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <h1 className="text-lg font-bold text-text-primary mb-5">
              Aula {order} — {lesson.title}
            </h1>
            {lesson.status === 'PENDING' ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Einstein state="thinking" size={70} />
                <p className="text-text-muted text-sm animate-pulse">Einstein está preparando esta aula...</p>
              </div>
            ) : (
              <LessonContent content={lesson.content ?? ''} onTypingChange={setIsTyping} />
            )}
          </div>

          <div className="border-t border-subtle px-4 py-3 flex items-center gap-3 bg-surface">
            {prevLesson ? (
              <Link href={`/course/${params.id}/lesson/${prevLesson.order}`} className="text-xs text-text-muted">← Anterior</Link>
            ) : <span />}
            <button
              onClick={markComplete}
              className={`flex-1 text-center border rounded-lg py-2 text-xs transition-colors ${
                completed.includes(lesson.id)
                  ? 'border-accent/40 text-accent'
                  : 'border-subtle text-text-muted hover:border-accent/30'
              }`}
            >
              {completed.includes(lesson.id) ? '✓ Concluída' : 'Marcar como concluída'}
            </button>
            {nextLesson ? (
              <Link href={`/course/${params.id}/lesson/${nextLesson.order}`} className="bg-accent text-base text-xs font-bold px-4 py-2 rounded-lg">
                Próxima →
              </Link>
            ) : course.status === 'READY' ? (
              <Link href={`/course/${params.id}/test`} className="bg-accent text-base text-xs font-bold px-4 py-2 rounded-lg">
                Quiz →
              </Link>
            ) : (
              <span className="text-xs text-text-muted px-4 py-2 animate-pulse">Gerando...</span>
            )}
          </div>
        </main>

        <LessonList
          courseId={params.id}
          lessons={lessons}
          completedLessons={completed}
          currentOrder={order}
        />
      </div>
      <BottomNav />
    </>
  )
}
