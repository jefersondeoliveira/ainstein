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

export async function stackspotChat(prompt: string): Promise<ReadableStream<Uint8Array>> {
  const token = await getStackspotToken()
  const res = await fetch(AGENT_URL, {
    method: 'POST',
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
}

/** Coleta stream em texto completo */
export async function stackspotChatText(prompt: string): Promise<string> {
  const stream = await stackspotChat(prompt)
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    result += decoder.decode(value, { stream: true })
  }
  // Stackspot retorna SSE lines: "data: {...}\n\n"
  const chunks: string[] = []
  for (const line of result.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') break
    try {
      const obj = JSON.parse(payload)
      if (obj.choices?.[0]?.delta?.content) chunks.push(obj.choices[0].delta.content)
      if (typeof obj.text === 'string') chunks.push(obj.text)
    } catch { /* skip malformed */ }
  }
  return chunks.join('')
}
