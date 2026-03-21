// app/api/courses/[id]/quiz/submit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verificar se já submeteu
  const existing = await db.testResult.findUnique({
    where: { userId_courseId: { userId: session.user.id, courseId: params.id } },
  })
  if (existing) return NextResponse.json({ score: existing.score, answers: existing.answers }, { status: 409 })

  const quiz = await db.quiz.findUnique({ where: { courseId: params.id } })
  if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })

  const body = await req.json()
  const userAnswers: { questionIndex: number; selectedIndex: number }[] = body.answers ?? []
  const questions = quiz.questions as { question: string; options: string[]; correctIndex: number }[]

  let correct = 0
  for (const answer of userAnswers) {
    const q = questions[answer.questionIndex]
    if (q && answer.selectedIndex === q.correctIndex) correct++
  }
  const score = Math.round((correct / questions.length) * 100)

  const result = await db.testResult.create({
    data: { userId: session.user.id, courseId: params.id, score, answers: userAnswers as never },
  })

  return NextResponse.json({ score: result.score, answers: result.answers }, { status: 200 })
}
