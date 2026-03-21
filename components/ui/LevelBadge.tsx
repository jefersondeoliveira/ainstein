import { Level } from '@prisma/client'

const config: Record<Level, { label: string; className: string }> = {
  BEGINNER:     { label: 'Iniciante',     className: 'bg-accent/10 text-accent' },
  INTERMEDIATE: { label: 'Intermediário', className: 'bg-yellow-500/10 text-yellow-400' },
  ADVANCED:     { label: 'Avançado',      className: 'bg-red-500/10 text-red-400' },
}

export function LevelBadge({ level }: { level: Level }) {
  const { label, className } = config[level]
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-widest px-2 py-1 rounded-md ${className}`}>
      {label}
    </span>
  )
}
