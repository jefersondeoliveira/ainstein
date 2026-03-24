// lib/stackspot.ts
// SERVER-ONLY — nunca importar no cliente

const TOKEN_URL = `https://idm.stackspot.com/stackspot-freemium/oidc/oauth/token`
const AGENT_URL = `https://genai-inference-app.stackspot.com/v1/agent/${process.env.STACKSPOT_AGENT_ID}/chat`

let cachedToken: string | null = null
let expiresAt: number = 0
let refreshPromise: Promise<string> | null = null

export async function getStackspotToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && now < expiresAt - 5 * 60 * 1000) return cachedToken

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.STACKSPOT_CLIENT_ID!,
        client_secret: process.env.STACKSPOT_CLIENT_KEY!,
      })
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      })
      if (!res.ok) throw new Error(`Stackspot auth failed: ${res.status}`)
      const data = await res.json() as { access_token: string; expires_in: number }
      cachedToken = data.access_token
      expiresAt = Date.now() + data.expires_in * 1000
      return cachedToken
    })()
    refreshPromise.finally(() => { refreshPromise = null })
  }

  return refreshPromise
}

const STACKSPOT_TIMEOUT_MS = 90_000 // 90s — abort se a API travar

export async function stackspotChat(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const token = await getStackspotToken()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), STACKSPOT_TIMEOUT_MS)
  try {
    const res = await fetch(AGENT_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        streaming: true,
        user_prompt: prompt,
        stackspot_knowledge: false,
        return_ks_in_response: false,
        deep_search_ks: false,
      }),
    })
    if (!res.ok) throw new Error(`Stackspot chat failed: ${res.status}`)
    if (!res.body) throw new Error('No response body')
    return res.body
  } finally {
    clearTimeout(timer)
  }
}

/** Mock para testes sem gastar tokens (MOCK=true no .env.local) */
function mockResponse(prompt: string): string {
  if (prompt.includes('outline')) {
    return JSON.stringify({
      title: 'Curso Mock: ' + (prompt.match(/"([^"]+)"/)?.[1] ?? 'Tópico'),
      description: 'Curso gerado em modo mock para testes.',
      lessons: [
        { title: 'Introdução', description: 'Conceitos básicos.' },
        { title: 'Fundamentos', description: 'Base teórica.' },
        { title: 'Prática', description: 'Exemplos práticos.' },
      ],
    })
  }
  if (prompt.includes('múltipla escolha') || prompt.includes('Quiz')) {
    return JSON.stringify([
      { question: 'Pergunta mock 1?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
      { question: 'Pergunta mock 2?', options: ['A', 'B', 'C', 'D'], correctIndex: 1 },
      { question: 'Pergunta mock 3?', options: ['A', 'B', 'C', 'D'], correctIndex: 2 },
      { question: 'Pergunta mock 4?', options: ['A', 'B', 'C', 'D'], correctIndex: 3 },
      { question: 'Pergunta mock 5?', options: ['A', 'B', 'C', 'D'], correctIndex: 0 },
    ])
  }
  // Conteúdo de aula
  const title = prompt.match(/"([^"]+)"/)?.[1] ?? 'Aula'
  return `## ${title}\n\nEste é o conteúdo mock da aula **${title}**.\n\n### Conceitos principais\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit.\n\n\`\`\`js\nconsole.log("Exemplo de código mock");\n\`\`\`\n\n### Resumo\n\nConteúdo gerado em modo mock para testes de UI.`
}

/** Coleta stream em texto completo */
export async function stackspotChatText(prompt: string): Promise<string> {
  if (process.env.MOCK === 'true') {
    await new Promise(r => setTimeout(r, 300)) // simula latência
    return mockResponse(prompt)
  }
  const stream = await stackspotChat(prompt)
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  // Stackspot retorna SSE lines: data: {"message": "...", ...}
  const chunks: string[] = []
  for (const line of result.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') break
    try {
      const obj = JSON.parse(payload)
      if (typeof obj.message === 'string') chunks.push(obj.message)
    } catch { /* skip malformed */ }
  }
  return chunks.join('')
}
