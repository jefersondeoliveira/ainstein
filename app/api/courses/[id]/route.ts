// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await db.course.findUnique({ where: { id: params.id } })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete dependents not covered by cascade
  await db.userProgress.deleteMany({ where: { courseId: params.id } })
  await db.course.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await db.course.findUnique({
    where: { id: params.id },
    include: {
      lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true, status: true, content: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(course)
}
