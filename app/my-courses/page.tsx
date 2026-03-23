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
  const { data: session, status } = useSession()
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status !== 'authenticated') return

    fetch('/api/my-courses')
      .then(r => r.json())
      .then((data: Course[]) => { setCourses(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, router])

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
              <Einstein state="idle" size={80} className="mx-auto mb-4" />
              <p className="text-text-muted text-sm mb-4">Você ainda não criou nenhum curso.</p>
              <Link href="/generate" className="bg-accent text-base text-sm font-semibold px-5 py-2.5 rounded-lg">
                Criar meu primeiro curso
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {courses.map(course => (
                <Link
                  key={course.id}
                  href={`/course/${course.id}`}
                  className="flex items-center gap-4 bg-raised border border-subtle rounded-xl px-4 py-3 hover:border-accent/20 transition-colors"
                >
                  <Einstein
                    state={course.status === 'GENERATING' ? 'thinking' : course.status === 'FAILED' ? 'idle' : 'idle'}
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
              ))}
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
