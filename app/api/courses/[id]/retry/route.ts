// app/api/courses/[id]/retry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const ONE_HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000)

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await db.course.findUnique({
    where: { id: params.id },
    select: { userId: true, status: true, retryCount: true, lastRetryAt: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (course.status !== 'FAILED') return NextResponse.json({ error: 'Course is not FAILED' }, { status: 400 })

  const withinHour = course.lastRetryAt && course.lastRetryAt > ONE_HOUR_AGO()
  if (withinHour && course.retryCount >= 3) {
    return NextResponse.json({ error: 'Limite de retries atingido (3/hora)' }, { status: 429 })
  }

  // Limpar dados parciais e reiniciar
  await db.lesson.deleteMany({ where: { courseId: params.id } })
  await db.course.update({
    where: { id: params.id },
    data: {
      status: 'GENERATING',
      retryCount: withinHour ? { increment: 1 } : 1,
      lastRetryAt: new Date(),
    },
  })

  return NextResponse.json({ ok: true })
}
