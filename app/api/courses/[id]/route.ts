// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await db.course.findUnique({
    where: { id: params.id },
    include: {
      lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true, status: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(course)
}
