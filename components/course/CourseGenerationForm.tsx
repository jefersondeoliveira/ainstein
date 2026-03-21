// components/course/CourseGenerationForm.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

const LEVELS = [
  { value: 'BEGINNER', label: 'Iniciante' },
  { value: 'INTERMEDIATE', label: 'Intermediário' },
  { value: 'ADVANCED', label: 'Avançado' },
]

export function CourseGenerationForm() {
  const { data: session } = useSession()
  const router = useRouter()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('BEGINNER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      router.push(`/login?callbackUrl=/generate`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, level }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao gerar curso')
      }
      const { courseId } = await res.json()
      router.push(`/course/${courseId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar curso')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-subtle rounded-xl p-4 flex flex-col gap-3">
      <input
        className="bg-raised border border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder-text-muted w-full outline-none focus:border-accent/40 transition-colors"
        placeholder="Ex: Lógica de programação, Álgebra Linear..."
        value={topic}
        onChange={e => setTopic(e.target.value)}
        maxLength={200}
        required
      />
      <div className="flex gap-2 flex-wrap">
        {LEVELS.map(l => (
          <button
            key={l.value}
            type="button"
            onClick={() => setLevel(l.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              level === l.value
                ? 'bg-accent text-base border-accent font-semibold'
                : 'border-subtle text-text-muted hover:border-accent/30'
            }`}
          >
            {l.label}
          </button>
        ))}
        <button
          type="submit"
          disabled={loading || !topic.trim()}
          className="ml-auto bg-accent text-base text-sm font-bold px-4 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Gerando...' : 'Gerar com Einstein →'}
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}
