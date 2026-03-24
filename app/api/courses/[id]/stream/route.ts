// app/api/courses/[id]/stream/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stackspotChatText } from '@/lib/stackspot'

export const maxDuration = 300

// Lock em memória: evita geração concorrente do mesmo curso (React StrictMode abre 2 streams)
const activeGenerations = new Set<string>()

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const course = await db.course.findUnique({
    where: { id: params.id },
    include: { lessons: { orderBy: { order: 'asc' } } },
  })
  if (!course) return new Response('Not found', { status: 404 })
  if (course.userId !== session.user.id) return new Response('Forbidden', { status: 403 })

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  let writerClosed = false
  const closeWriter = async () => {
    if (writerClosed) return
    writerClosed = true
    try { await writer.close() } catch { /* client already disconnected */ }
  }

  const send = async (event: string, data: unknown) => {
    if (writerClosed) return
    try {
      await writer.write(encoder.encode(sseEvent(event, data)))
    } catch {
      writerClosed = true // mark closed so future sends are no-ops
    }
  }

  const runGeneration = async () => {
    let claimedLock = false
    try {
      // Catchup: curso finalizado — replay estado atual e encerra
      if (course.status === 'READY' || course.status === 'FAILED') {
        for (const lesson of course.lessons) {
          await send('lesson_created', { id: lesson.id, title: lesson.title, order: lesson.order })
          if (lesson.status === 'READY' && lesson.content) {
            await send('lesson_ready', { id: lesson.id, content: lesson.content })
          }
        }
        if (course.status === 'READY') await send('course_ready', { courseId: course.id })
        else await send('course_failed', { courseId: course.id })
        return
      }

      // Lock em memória: evita geração concorrente (React StrictMode / EventSource reconnect)
      // claimedLock garante que só quem adicionou ao Set vai removê-lo no finally
      if (activeGenerations.has(course.id)) {
        return
      }
      activeGenerations.add(course.id)
      claimedLock = true

      // Manter lições READY (resume), remover apenas PENDING e quiz antigo
      await db.lesson.deleteMany({ where: { courseId: course.id, status: 'PENDING' } })
      await db.quiz.deleteMany({ where: { courseId: course.id } })

      const levelLabel = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' }[course.level]

      // FASE 1: Outline — 5 aulas para ser mais rápido
      const outlinePrompt = `Crie um outline para um curso com exatamente 5 aulas sobre "${course.topic}" para nível ${levelLabel}.\nRetorne SOMENTE JSON válido no formato: { "title": string, "lessons": [{ "title": string, "description": string }] }\nNão inclua markdown, apenas o JSON.`
      const outlineRaw = await stackspotChatText(outlinePrompt)

      let outline: { title: string; lessons: { title: string; description: string }[] }
      try {
        const jsonMatch = outlineRaw.match(/\{[\s\S]*\}/)
        outline = JSON.parse(jsonMatch?.[0] ?? outlineRaw)
      } catch {
        throw new Error('Outline JSON inválido')
      }

      // Atualizar título do curso
      await db.course.update({ where: { id: course.id }, data: { title: outline.title } })

      // Upsert lições — NÃO sobrescreve status se já READY (resume)
      const lessons = await Promise.all(
        outline.lessons.map((l, i) =>
          db.lesson.upsert({
            where: { courseId_order: { courseId: course.id, order: i + 1 } },
            create: { courseId: course.id, title: l.title, order: i + 1, status: 'PENDING' },
            update: { title: l.title }, // mantém status READY se já existir
          })
        )
      )

      for (const lesson of lessons) {
        await send('lesson_created', { id: lesson.id, title: lesson.title, order: lesson.order })
        // Replay conteúdo já pronto
        if (lesson.status === 'READY' && lesson.content) {
          await send('lesson_ready', { id: lesson.id, content: lesson.content })
        }
      }

      // FASE 2: Conteúdo apenas das aulas ainda PENDING
      for (const lesson of lessons) {
        if (lesson.status === 'READY') continue // pula aulas já prontas

        const lessonPrompt = `Escreva o conteúdo da aula "${lesson.title}" do curso "${course.topic}" (nível ${levelLabel}).\nUse markdown com exemplos de código quando aplicável.\nSeja didático e direto. Máximo 350 palavras.`
        const content = await stackspotChatText(lessonPrompt)

        await db.lesson.update({
          where: { id: lesson.id },
          data: { content, status: 'READY' },
        })
        await send('lesson_ready', { id: lesson.id, content })
      }

      // FASE 3: Quiz
      const quizPrompt = `Crie 5 perguntas de múltipla escolha sobre o curso "${course.topic}" (nível ${levelLabel}).\nRetorne SOMENTE JSON válido: [{ "question": string, "options": [string, string, string, string], "correctIndex": number }]`
      const quizRaw = await stackspotChatText(quizPrompt)

      let questions: unknown[]
      try {
        const jsonMatch = quizRaw.match(/\[[\s\S]*\]/)
        questions = JSON.parse(jsonMatch?.[0] ?? quizRaw)
      } catch {
        throw new Error('Quiz JSON inválido')
      }

      await db.quiz.create({ data: { courseId: course.id, questions: questions as never } })
      await send('quiz_ready', { courseId: course.id })

      // Finalizar
      await db.course.update({ where: { id: course.id }, data: { status: 'READY' } })
      await send('course_ready', { courseId: course.id })
    } catch (err) {
      console.error('Generation error:', err)
      if (claimedLock) {
        await db.course.update({ where: { id: course.id }, data: { status: 'FAILED' } }).catch(() => {})
        await send('course_failed', { error: String(err) })
      }
    } finally {
      if (claimedLock) activeGenerations.delete(course.id)
      await closeWriter()
    }
  }

  // Rodar geração em background (não bloqueia o retorno do stream)
  runGeneration()

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
