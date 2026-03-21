// app/course/[id]/test/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { Einstein } from '@/components/einstein/Einstein'
import { QuizPlayer } from '@/components/quiz/QuizPlayer'

export default function TestPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<{ question: string; options: string[] }[]>([])
  const [einsteinState, setEinsteinState] = useState<'idle' | 'celebrating'>('idle')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`/api/courses/${params.id}/quiz`)
      .then(r => {
        if (!r.ok) throw new Error('Quiz não disponível')
        return r.json()
      })
      .then(data => { setQuestions(data.questions); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [params.id])

  if (loading) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <Einstein state="thinking" size={100} />
    </div>
  )

  if (error) return (
    <div className="min-h-screen bg-base flex items-center justify-center text-text-muted text-sm">{error}</div>
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base">
        <div className="max-w-xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-8">
            <Einstein state={einsteinState} size={70} />
            <div>
              <h1 className="text-lg font-bold text-text-primary">Quiz Final</h1>
              <p className="text-xs text-text-muted">Responda todas as perguntas para ver seu resultado</p>
            </div>
          </div>
          <QuizPlayer
            courseId={params.id}
            questions={questions}
            onComplete={() => setEinsteinState('celebrating')}
          />
        </div>
      </main>
    </>
  )
}
