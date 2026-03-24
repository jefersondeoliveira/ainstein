// app/page.tsx
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { CourseGenerationForm } from '@/components/course/CourseGenerationForm'
import { CourseCard } from '@/components/course/CourseCard'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const courses = await db.course.findMany({
    take: 12,
    orderBy: { createdAt: 'desc' },
    where: { status: 'READY' },
    select: {
      id: true, title: true, topic: true, level: true, createdAt: true,
      _count: { select: { lessons: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  }).catch(() => [])

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
                {courses.map((c) => (
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
