// app/api/courses/[id]/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await db.course.findUnique({
    where: { id: params.id },
    select: { status: true, quiz: { select: { questions: true } } },
  })
  if (!course || course.status !== 'READY') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!course.quiz) return NextResponse.json({ error: 'Quiz not ready' }, { status: 404 })

  // Remover correctIndex antes de enviar ao cliente
  const questions = (course.quiz.questions as { correctIndex: number; [key: string]: unknown }[]).map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ correctIndex: _correctIndex, ...q }) => q
  )
  return NextResponse.json({ questions })
}
