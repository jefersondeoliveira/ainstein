// lib/sanitize.ts
import { BLOCKED_TERMS } from './content-blocklist'

const INJECTION_PATTERN = /(ignore\s+(previous|all)|system:|<\|im_start\|>|###\s*instruction)/i

export function sanitizeTopic(raw: string): string {
  // 1. Strip script/style tags and their content
  let topic = raw.replace(/<(script|style)[^>]*>.*?<\/\1>/gi, '').trim()
  // 2. Strip remaining HTML
  topic = topic.replace(/<[^>]*>/g, '').trim()
  // 3. Strip control chars
  topic = topic.replace(/[\x00-\x1F\x7F]/g, '')
  // 4. Truncate
  topic = topic.slice(0, 200)
  // 5. Injection check
  if (INJECTION_PATTERN.test(topic)) throw new Error('Tema inválido')
  // 6. Blocked content
  const lower = topic.toLowerCase()
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) throw new Error('Tema não permitido')
  }
  return topic
}
