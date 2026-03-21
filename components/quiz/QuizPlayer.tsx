// components/quiz/QuizPlayer.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Question { question: string; options: string[] }

interface QuizPlayerProps {
  courseId: string
  questions: Question[]
  onComplete?: () => void
}

export function QuizPlayer({ courseId, questions, onComplete }: QuizPlayerProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState<(number | null)[]>(Array(questions.length).fill(null))
  const [result, setResult] = useState<{ score: number } | null>(null)
  const [loading, setLoading] = useState(false)

  const q = questions[current]
  const allAnswered = selected.every(s => s !== null)

  const handleSubmit = async () => {
    setLoading(true)
    const answers = selected.map((s, i) => ({ questionIndex: i, selectedIndex: s! }))
    const res = await fetch(`/api/courses/${courseId}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers }),
    })
    const data = await res.json()
    setResult({ score: data.score })
    setLoading(false)
    if (res.status === 200) onComplete?.()
  }

  if (result) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="text-6xl font-bold text-accent">{result.score}%</div>
        <p className="text-text-secondary">
          {result.score >= 80 ? 'Excelente! Você dominou o conteúdo.' :
           result.score >= 60 ? 'Bom trabalho! Revise os pontos que errou.' :
           'Continue estudando para melhorar seu resultado.'}
        </p>
        <button onClick={() => router.push(`/course/${courseId}`)} className="bg-accent text-base font-semibold px-6 py-2.5 rounded-xl text-sm">
          Voltar ao curso
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between text-xs text-text-muted">
        <span>Questão {current + 1} de {questions.length}</span>
        <div className="flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${selected[i] !== null ? 'bg-accent' : 'bg-raised'}`} />
          ))}
        </div>
      </div>

      <h2 className="text-text-primary font-semibold text-base leading-relaxed">{q.question}</h2>

      <ul className="flex flex-col gap-2">
        {q.options.map((opt, i) => (
          <li key={i}>
            <button
              onClick={() => {
                const next = [...selected]
                next[current] = i
                setSelected(next)
              }}
              className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-colors ${
                selected[current] === i
                  ? 'bg-accent/10 border-accent text-text-primary'
                  : 'border-subtle text-text-secondary hover:border-accent/30'
              }`}
            >
              {opt}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-3">
        {current > 0 && (
          <button onClick={() => setCurrent(c => c - 1)} className="text-xs text-text-muted">← Anterior</button>
        )}
        {current < questions.length - 1 ? (
          <button
            onClick={() => setCurrent(c => c + 1)}
            disabled={selected[current] === null}
            className="ml-auto bg-raised border border-subtle text-text-secondary text-xs px-4 py-2 rounded-lg disabled:opacity-40"
          >
            Próxima →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || loading}
            className="ml-auto bg-accent text-base text-xs font-bold px-5 py-2 rounded-lg disabled:opacity-40"
          >
            {loading ? 'Enviando...' : 'Finalizar quiz'}
          </button>
        )}
      </div>
    </div>
  )
}
