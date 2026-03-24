'use client'
import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }

export interface ActiveGeneration {
  courseId: string
  courseTitle: string
  lessons: Lesson[]
  firstReady: boolean
  failed: boolean
}

interface GenerationContextValue {
  generation: ActiveGeneration | null
  startTracking: (courseId: string, courseTitle: string, initialLessons?: Lesson[]) => void
  dismiss: () => void
}

export const GenerationContext = createContext<GenerationContextValue>({
  generation: null,
  startTracking: () => {},
  dismiss: () => {},
})

export function GenerationProvider({ children }: { children: ReactNode }) {
  const [generation, setGeneration] = useState<ActiveGeneration | null>(null)
  const esRef = useRef<EventSource | null>(null)
  const notifiedRef = useRef(false)

  const dismiss = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setGeneration(null)
    notifiedRef.current = false
  }, [])

  const startTracking = useCallback((courseId: string, courseTitle: string, initialLessons: Lesson[] = []) => {
    // Close any existing stream for a different course
    if (esRef.current) { esRef.current.close(); esRef.current = null }
    notifiedRef.current = false

    const firstReady = initialLessons.some(l => l.order === 1 && l.status === 'READY')
    if (firstReady) notifiedRef.current = true // already notified in previous session

    setGeneration({ courseId, courseTitle, lessons: initialLessons, firstReady, failed: false })

    const es = new EventSource(`/api/courses/${courseId}/stream`)
    esRef.current = es

    es.addEventListener('lesson_created', e => {
      const lesson = JSON.parse(e.data) as Lesson
      setGeneration(prev => {
        if (!prev) return prev
        if (prev.lessons.find(l => l.id === lesson.id)) return prev
        return {
          ...prev,
          lessons: [...prev.lessons, { ...lesson, status: 'PENDING' }].sort((a, b) => a.order - b.order),
        }
      })
    })

    es.addEventListener('lesson_ready', e => {
      const { id, content } = JSON.parse(e.data) as { id: string; content: string }
      setGeneration(prev => {
        if (!prev) return prev
        const lessons = prev.lessons.map(l => l.id === id ? { ...l, status: 'READY', content } : l)
        const firstReady = lessons.some(l => l.order === 1 && l.status === 'READY')

        // Browser notification on first lesson ready
        if (firstReady && !notifiedRef.current) {
          notifiedRef.current = true
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('AI.nstein', {
              body: `"${prev.courseTitle}" está pronto para começar!`,
              icon: '/favicon.ico',
            })
          }
        }
        return { ...prev, lessons, firstReady }
      })
    })

    es.addEventListener('course_ready', () => {
      setGeneration(prev => prev ? { ...prev, firstReady: true } : prev)
      // Auto-dismiss after 10s once fully ready
      setTimeout(() => setGeneration(null), 10000)
      es.close()
    })

    es.addEventListener('course_failed', () => {
      setGeneration(prev => prev ? { ...prev, failed: true } : prev)
      es.close()
    })

    es.onerror = () => {
      es.close()
    }
  }, [])

  return (
    <GenerationContext.Provider value={{ generation, startTracking, dismiss }}>
      {children}
    </GenerationContext.Provider>
  )
}

export const useGeneration = () => useContext(GenerationContext)
