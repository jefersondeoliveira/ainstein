// app/page.tsx
import { Level } from '@prisma/client'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { CourseGenerationForm } from '@/components/course/CourseGenerationForm'
import { CourseCard } from '@/components/course/CourseCard'

interface CourseItem {
  id: string
  title: string
  level: Level
  _count: { lessons: number }
  user: { name: string | null; image: string | null }
  createdAt: string
}

async function getCourses(): Promise<{ courses: CourseItem[]; nextCursor: string | null }> {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/courses`, { cache: 'no-store' })
  if (!res.ok) return { courses: [], nextCursor: null }
  return res.json()
}

export default async function HomePage() {
  const { courses } = await getCourses()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">O que você quer<br />aprender hoje?</h1>
            <p className="text-text-muted text-sm mb-5">Einstein gera um curso completo em segundos.</p>
            <CourseGenerationForm />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-widest text-text-muted">Cursos da comunidade</p>
            </div>
            {courses.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">Nenhum curso ainda. Seja o primeiro!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((c: CourseItem) => (
                  <CourseCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    level={c.level}
                    lessonCount={c._count.lessons}
                    user={c.user}
                    createdAt={c.createdAt}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
