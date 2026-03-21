// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sanitizeTopic } from '@/lib/sanitize'
import { checkCourseRateLimit } from '@/lib/rate-limit'
import { Level } from '@prisma/client'

// GET /api/courses?cursor=<id> — lista pública
export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get('cursor')
  const courses = await db.course.findMany({
    take: 12,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    where: { status: 'READY' },
    select: {
      id: true, title: true, topic: true, level: true,
      createdAt: true,
      _count: { select: { lessons: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  })
  const nextCursor = courses.length === 12 ? courses[courses.length - 1].id : null
  return NextResponse.json({ courses, nextCursor })
}

// POST /api/courses — criar curso (auth required)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ok } = await checkCourseRateLimit(session.user.id)
  if (!ok) return NextResponse.json({ error: 'Limite de cursos atingido (5/hora)' }, { status: 429 })

  const body = await req.json()
  let topic: string
  try {
    topic = sanitizeTopic(body.topic ?? '')
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid topic'
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const levelMap: Record<string, Level> = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
  }
  const level: Level = levelMap[body.level] ?? 'BEGINNER'

  const course = await db.course.create({
    data: {
      topic,
      title: topic, // título provisório; atualizado após geração do outline
      level,
      userId: session.user.id,
      status: 'GENERATING',
    },
  })

  return NextResponse.json({ courseId: course.id }, { status: 201 })
}
