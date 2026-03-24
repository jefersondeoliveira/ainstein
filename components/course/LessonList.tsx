// components/course/LessonList.tsx
import Link from 'next/link'

interface Lesson { id: string; title: string; order: number; status: string }

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
  completedLessons?: string[]
  currentOrder?: number
}

export function LessonList({ courseId, lessons, completedLessons = [], currentOrder }: LessonListProps) {
  // Dedup by order — prefer READY over PENDING if duplicates exist
  const unique = lessons
    .sort((a, b) => (a.status === 'READY' ? -1 : 1) - (b.status === 'READY' ? -1 : 1))
    .filter((l, _, arr) => arr.findIndex(x => x.order === l.order) === arr.indexOf(l))
    .sort((a, b) => a.order - b.order)

  return (
    <aside className="w-52 min-w-[13rem] bg-base border-l border-subtle p-3 overflow-y-auto hidden sm:block scrollbar-hidden">
      <p className="text-[9px] uppercase tracking-widest text-text-muted mb-3">Aulas</p>
      <ul className="flex flex-col gap-0.5">
        {unique.map(lesson => {
          const done = completedLessons.includes(lesson.id)
          const active = lesson.order === currentOrder
          const pending = lesson.status === 'PENDING'
          return (
            <li key={lesson.id}>
              <Link
                href={pending ? '#' : `/course/${courseId}/lesson/${lesson.order}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  active ? 'bg-accent/10 text-text-primary' : done ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary'
                } ${pending ? 'pointer-events-none opacity-40' : ''}`}
              >
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 ${
                  done ? 'bg-accent border-accent text-base' : active ? 'border-accent' : 'border-subtle'
                }`}>
                  {done ? '✓' : lesson.order}
                </span>
                <span className="truncate">{lesson.title || '...'}{pending && <span className="ml-0.5 opacity-40 animate-pulse">·</span>}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
