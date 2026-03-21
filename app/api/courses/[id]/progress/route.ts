// app/api/courses/[id]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, lastLessonId } = await req.json()

  await db.userProgress.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId: params.id } },
    create: {
      userId: session.user.id,
      courseId: params.id,
      completedLessons: lessonId ? [lessonId] : [],
      lastLessonId: lastLessonId ?? null,
    },
    update: {
      completedLessons: lessonId ? { push: lessonId } : undefined,
      lastLessonId: lastLessonId ?? undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
