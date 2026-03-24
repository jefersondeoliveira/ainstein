'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Einstein } from '@/components/einstein/Einstein'
import { Level } from '@prisma/client'

interface Course {
  id: string
  title: string
  topic: string
  level: Level
  status: string
  createdAt: string
  _count: { lessons: number }
}

export default function MyCoursesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/my-courses')
      .then(r => r.json())
      .then((data: Course[]) => { setCourses(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, router])

  const handleDelete = async (id: string) => {
    setDeleting(id)
    await fetch(`/api/courses/${id}`, { method: 'DELETE' })
    setCourses(prev => prev.filter(c => c.id !== id))
    setConfirmId(null)
    setDeleting(null)
  }

  if (loading) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <Einstein state="thinking" size={64} />
    </div>
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 pt-8 pb-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold text-text-primary">Meus cursos</h1>
            <Link href="/generate" className="bg-accent text-base text-xs font-bold px-3 py-2 rounded-lg">
              + Novo curso
            </Link>
          </div>

          {courses.length === 0 ? (
            <div className="text-center py-16">
              <Einstein state="idle" size={80} />
              <p className="text-text-muted text-sm mb-4 mt-4">Você ainda não criou nenhum curso.</p>
              <Link href="/generate" className="bg-accent text-base text-sm font-semibold px-5 py-2.5 rounded-lg">
                Criar meu primeiro curso
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {courses.map(course => (
                <div key={course.id} className="bg-raised border border-subtle rounded-xl overflow-hidden transition-colors hover:border-accent/20">
                  {confirmId === course.id ? (
                    /* Confirmation row */
                    <div className="flex items-center gap-3 px-4 py-3">
                      <p className="flex-1 text-sm text-text-primary">Excluir <span className="font-semibold">&ldquo;{course.title}&rdquo;</span>?</p>
                      <button
                        onClick={() => handleDelete(course.id)}
                        disabled={deleting === course.id}
                        className="text-xs text-red-400 border border-red-400/30 px-3 py-1.5 rounded-lg hover:bg-red-400/10 transition-colors disabled:opacity-50"
                      >
                        {deleting === course.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-xs text-text-muted px-3 py-1.5 rounded-lg hover:text-text-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4 px-4 py-3">
                      <Link href={`/course/${course.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                        <Einstein
                          state={course.status === 'GENERATING' ? 'thinking' : 'idle'}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <LevelBadge level={course.level} />
                            {course.status === 'GENERATING' && (
                              <span className="text-[10px] text-accent animate-pulse">Gerando...</span>
                            )}
                            {course.status === 'FAILED' && (
                              <span className="text-[10px] text-red-400">Falhou</span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-text-primary truncate">{course.title}</p>
                          <p className="text-xs text-text-muted">{course._count.lessons} aulas</p>
                        </div>
                      </Link>
                      <button
                        onClick={() => setConfirmId(course.id)}
                        className="text-text-muted hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 flex-shrink-0"
                        title="Excluir curso"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
