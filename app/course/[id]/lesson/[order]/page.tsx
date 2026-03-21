// app/course/[id]/lesson/[order]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Einstein } from '@/components/einstein/Einstein'
import { LessonList } from '@/components/course/LessonList'
import { LessonContent } from '@/components/course/LessonContent'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }
interface Course { id: string; title: string; lessons: Lesson[] }

export default function LessonPage({ params }: { params: { id: string; order: string } }) {
  const order = parseInt(params.order)
  const [course, setCourse] = useState<Course | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        setCourse(c)
        const l = c.lessons.find((x: Lesson) => x.order === order)
        setLesson(l ?? null)
        if (l?.status === 'PENDING') {
          const interval = setInterval(async () => {
            const r2 = await fetch(`/api/courses/${params.id}`)
            const c2 = await r2.json() as Course
            const l2 = c2.lessons.find((x: Lesson) => x.order === order)
            if (l2?.status === 'READY') {
              setLesson(l2)
              clearInterval(interval)
            }
          }, 3000)
          return () => clearInterval(interval)
        }
      })
  }, [params.id, order])

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
    <div className="min-h-screen bg-base flex items-center justify-center">
      <Einstein state="thinking" size={80} />
    </div>
  )

  const prevLesson = course.lessons.find((l: Lesson) => l.order === order - 1)
  const nextLesson = course.lessons.find((l: Lesson) => l.order === order + 1)

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-48px)] bg-base">
        <aside className="hidden sm:flex w-44 min-w-[11rem] flex-col items-center bg-surface border-r border-subtle p-4 gap-3">
          <p className="text-[9px] uppercase tracking-widest text-text-muted">Einstein</p>
          <Einstein state={isTyping ? 'talking' : lesson.status === 'PENDING' ? 'thinking' : 'idle'} size={100} />
          <p className="text-[10px] text-accent text-center">{isTyping ? 'Explicando...' : 'Pronto'}</p>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="sm:hidden flex items-center gap-3 bg-surface border-b border-subtle p-3">
            <Einstein state={isTyping ? 'talking' : 'idle'} size={44} />
            <div className="flex-1 text-xs text-text-secondary leading-relaxed line-clamp-2">
              {isTyping ? 'Einstein está explicando...' : lesson.title}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <h1 className="text-lg font-bold text-text-primary mb-5">
              Aula {order} — {lesson.title}
            </h1>
            {lesson.status === 'PENDING' ? (
              <div className="animate-pulse text-text-muted text-sm">Einstein está preparando esta aula...</div>
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
            ) : (
              <Link href={`/course/${params.id}/test`} className="bg-accent text-base text-xs font-bold px-4 py-2 rounded-lg">
                Quiz →
              </Link>
            )}
          </div>
        </main>

        <LessonList
          courseId={params.id}
          lessons={course.lessons}
          completedLessons={completed}
          currentOrder={order}
        />
      </div>
      <BottomNav />
    </>
  )
}
