// components/course/CourseCard.tsx
import Link from 'next/link'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Level } from '@prisma/client'

interface CourseCardProps {
  id: string
  title: string
  level: Level
  lessonCount: number
  user: { name: string | null; image: string | null }
  createdAt: string
}

export function CourseCard({ id, title, level, lessonCount, user }: CourseCardProps) {
  return (
    <Link href={`/course/${id}`} className="block bg-raised border border-subtle rounded-xl p-4 hover:border-accent/20 transition-colors flex flex-col gap-2">
      <LevelBadge level={level} />
      <h3 className="text-sm font-semibold text-text-primary leading-snug">{title}</h3>
      <p className="text-xs text-text-muted">{lessonCount} aulas · Quiz final</p>
      <div className="flex items-center gap-2 mt-auto pt-2">
        {user.image && <img src={user.image} alt="" className="w-5 h-5 rounded-full" />}
        <span className="text-xs text-text-muted">{user.name}</span>
      </div>
    </Link>
  )
}
