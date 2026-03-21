# AI.nstein Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AI.nstein — um gerador de cursos com IA onde Einstein animado apresenta aulas em tempo real via SSE, com auth Google/GitHub e banco PostgreSQL.

**Architecture:** Next.js 14 App Router com SSE para streaming progressivo de geração de cursos. Stackspot Agent API gera outline → aulas → quiz em sequência. Einstein SVG com CSS animations muda de estado conforme o contexto.

**Tech Stack:** Next.js 14, NextAuth.js v5, Prisma, PostgreSQL (Supabase), Tailwind CSS, React Syntax Highlighter, Vercel

---

## File Map

```
ainstein/
├── app/
│   ├── layout.tsx                          # Root layout + SessionProvider
│   ├── globals.css                         # Design tokens + reset
│   ├── page.tsx                            # Home: feed + inline generation form
│   ├── login/page.tsx                      # Login com Google/GitHub
│   ├── generate/page.tsx                   # Página dedicada de geração (auth required)
│   ├── course/[id]/
│   │   ├── page.tsx                        # Course overview + SSE listener
│   │   ├── lesson/[order]/page.tsx         # Lesson view com Einstein
│   │   └── test/page.tsx                   # Quiz final
│   └── api/
│       ├── auth/[...nextauth]/route.ts     # NextAuth handler
│       ├── courses/
│       │   ├── route.ts                    # GET list + POST create
│       │   └── [id]/
│       │       ├── route.ts                # GET detail
│       │       ├── stream/route.ts         # SSE stream (auth, maxDuration=300)
│       │       ├── retry/route.ts          # POST retry geração
│       │       ├── quiz/
│       │       │   ├── route.ts            # GET quiz (sem correctIndex)
│       │       │   └── submit/route.ts     # POST submit + score
│       │       └── progress/route.ts       # POST progress (idempotente)
├── components/
│   ├── einstein/
│   │   └── Einstein.tsx                    # SVG animado, prop einsteinState
│   ├── course/
│   │   ├── CourseCard.tsx                  # Card no feed
│   │   ├── CourseGenerationForm.tsx        # Formulário tema + nível
│   │   ├── LessonList.tsx                  # Sidebar/lista de aulas
│   │   └── LessonContent.tsx              # Markdown + typewriter + code highlight
│   ├── quiz/
│   │   └── QuizPlayer.tsx                  # UI do quiz
│   └── ui/
│       ├── Navbar.tsx                      # Navegação superior
│       ├── BottomNav.tsx                   # Navegação mobile inferior
│       └── LevelBadge.tsx                  # Badge Iniciante/Intermediário/Avançado
├── lib/
│   ├── db.ts                               # Prisma client singleton
│   ├── auth.ts                             # NextAuth config (Google + GitHub)
│   ├── stackspot.ts                        # Token cache + chat (server-only)
│   ├── sanitize.ts                         # Sanitização de topic
│   ├── content-blocklist.ts                # Lista de termos bloqueados
│   └── rate-limit.ts                       # Helpers de rate limiting via DB
├── prisma/
│   └── schema.prisma
├── __tests__/
│   ├── lib/sanitize.test.ts
│   ├── lib/stackspot.test.ts
│   └── lib/rate-limit.test.ts
├── tailwind.config.ts
├── .env.local                              # Variáveis locais (não commitar)
└── vercel.json                             # maxDuration por rota
```

---

## Task 1: Scaffold do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `next.config.ts`
- Create: `.env.local`, `.env.example`, `.gitignore`

- [ ] **Step 1: Criar o projeto Next.js**

```bash
cd D:/workspace/ainstein
npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Responder: No para turbopack, Yes para tudo mais.

- [ ] **Step 2: Instalar dependências**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client
npm install react-markdown react-syntax-highlighter
npm install @types/react-syntax-highlighter -D
npm install -D jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom ts-jest
```

- [ ] **Step 3: Configurar jest.config.ts**

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  testMatch: ['**/__tests__/**/*.test.ts'],
}

export default config
```

- [ ] **Step 4: Criar .env.local**

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-in-prod
GOOGLE_CLIENT_ID=placeholder
GOOGLE_CLIENT_SECRET=placeholder
GITHUB_CLIENT_ID=placeholder
GITHUB_CLIENT_SECRET=placeholder
DATABASE_URL=postgresql://placeholder
STACKSPOT_CLIENT_ID=89077063-d725-4b43-a334-03f6d8ee54e9
STACKSPOT_CLIENT_KEY=placeholder
STACKSPOT_AGENT_ID=01KM708K7TMKBYPE2E3STHMV0C
```

- [ ] **Step 5: Criar .env.example** (sem valores reais)

Copiar `.env.local` substituindo todos os valores por `your-value-here`.

- [ ] **Step 6: Atualizar .gitignore**

Garantir que `.env.local` e `.env` estejam no `.gitignore`.

- [ ] **Step 7: Commit inicial**

```bash
git init
git add -A
git commit -m "chore: scaffold Next.js 14 project with dependencies"
```

---

## Task 2: Design tokens + estilos globais

**Files:**
- Modify: `tailwind.config.ts`
- Modify: `app/globals.css`

- [ ] **Step 1: Configurar tailwind.config.ts com tokens do design**

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base:    '#0a0f0a',
        surface: '#0d150d',
        raised:  '#111a11',
        accent:  '#6ee89a',
        'text-primary':   '#edeae0',
        'text-secondary': '#8a9e82',
        'text-muted':     '#3a5a40',
        border:  'rgba(255,255,255,0.06)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 2: Escrever globals.css**

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { background: #0a0f0a; color: #edeae0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
}

@layer utilities {
  .border-subtle { border-color: rgba(255,255,255,0.06); }
  .scrollbar-hidden { scrollbar-width: none; }
  .scrollbar-hidden::-webkit-scrollbar { display: none; }
}
```

- [ ] **Step 3: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "style: add design tokens and global styles"
```

---

## Task 3: Prisma schema + banco de dados

**Files:**
- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Inicializar Prisma**

```bash
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Escrever schema.prisma**

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String         @id @default(cuid())
  name      String
  email     String         @unique
  image     String?
  createdAt DateTime       @default(now())
  courses   Course[]
  progress  UserProgress[]
  results   TestResult[]
  // NextAuth adapter fields
  accounts  Account[]
  sessions  Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Course {
  id        String       @id @default(cuid())
  title     String
  topic     String
  level     Level
  status    CourseStatus @default(GENERATING)
  userId    String
  user      User         @relation(fields: [userId], references: [id])
  lessons   Lesson[]
  quiz      Quiz?
  progress  UserProgress[]
  results   TestResult[]
  createdAt DateTime     @default(now())
}

model Lesson {
  id       String       @id @default(cuid())
  courseId String
  course   Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title    String
  content  String?
  order    Int
  status   LessonStatus @default(PENDING)
}

model Quiz {
  id        String @id @default(cuid())
  courseId  String @unique
  course    Course @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions Json
}

model UserProgress {
  id               String   @id @default(cuid())
  userId           String
  courseId         String
  user             User     @relation(fields: [userId], references: [id])
  course           Course   @relation(fields: [courseId], references: [id])
  completedLessons String[]
  lastLessonId     String?
  updatedAt        DateTime @updatedAt
  @@unique([userId, courseId])
}

model TestResult {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  user        User     @relation(fields: [userId], references: [id])
  course      Course   @relation(fields: [courseId], references: [id])
  score       Int
  answers     Json
  completedAt DateTime @default(now())
  @@unique([userId, courseId])
}

enum Level        { BEGINNER INTERMEDIATE ADVANCED }
enum CourseStatus { GENERATING READY FAILED }
enum LessonStatus { PENDING READY }
```

- [ ] **Step 3: Criar lib/db.ts (singleton)**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: Gerar client e aplicar migration (após configurar DATABASE_URL real no Supabase)**

```bash
npx prisma generate
npx prisma db push
```

- [ ] **Step 5: Commit**

```bash
git add prisma/ lib/db.ts
git commit -m "feat: add Prisma schema and db singleton"
```

---

## Task 4: Autenticação NextAuth

**Files:**
- Create: `lib/auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`
- Create: `app/login/page.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Criar lib/auth.ts**

```typescript
// lib/auth.ts
import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Google from 'next-auth/providers/google'
import GitHub from 'next-auth/providers/github'
import { db } from './db'

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
})
```

- [ ] **Step 2: Criar route handler**

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: Criar app/login/page.tsx**

```tsx
// app/login/page.tsx
import { signIn } from '@/lib/auth'

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string }
}) {
  const callbackUrl = searchParams.callbackUrl ?? '/'

  return (
    <main className="min-h-screen bg-base flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface border border-subtle rounded-2xl p-8 flex flex-col gap-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold text-accent">AI<span className="text-text-primary">.nstein</span></h1>
          <p className="text-text-muted text-sm mt-1">Faça login para gerar cursos</p>
        </div>

        <form action={async () => {
          'use server'
          await signIn('google', { redirectTo: callbackUrl })
        }}>
          <button type="submit" className="w-full bg-raised border border-subtle rounded-xl py-3 text-sm text-text-secondary hover:border-accent/30 transition-colors">
            Continuar com Google
          </button>
        </form>

        <form action={async () => {
          'use server'
          await signIn('github', { redirectTo: callbackUrl })
        }}>
          <button type="submit" className="w-full bg-raised border border-subtle rounded-xl py-3 text-sm text-text-secondary hover:border-accent/30 transition-colors">
            Continuar com GitHub
          </button>
        </form>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Atualizar app/layout.tsx**

```tsx
// app/layout.tsx
import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/lib/auth'
import './globals.css'

export const metadata: Metadata = {
  title: 'AI.nstein — Cursos com IA',
  description: 'Gere cursos completos com inteligência artificial',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <html lang="pt-BR">
      <body className="bg-base text-text-primary antialiased">
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Testar auth localmente** — rodar `npm run dev`, acessar `/login`, verificar botões aparecem.

- [ ] **Step 6: Commit**

```bash
git add lib/auth.ts app/api/auth app/login app/layout.tsx
git commit -m "feat: add NextAuth with Google and GitHub providers"
```

---

## Task 5: Stackspot client

**Files:**
- Create: `lib/stackspot.ts`
- Create: `__tests__/lib/stackspot.test.ts`

- [ ] **Step 1: Escrever teste de token cache**

```typescript
// __tests__/lib/stackspot.test.ts
jest.mock('node-fetch', () => jest.fn())

describe('stackspot token cache', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
  })

  it('fetches token on first call', async () => {
    const fetch = require('node-fetch')
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'tok1', expires_in: 3600 }),
    })
    const { getStackspotToken } = require('@/lib/stackspot')
    const token = await getStackspotToken()
    expect(token).toBe('tok1')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reuses cached token on second call', async () => {
    const fetch = require('node-fetch')
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'tok1', expires_in: 3600 }),
    })
    const { getStackspotToken } = require('@/lib/stackspot')
    await getStackspotToken()
    await getStackspotToken()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Rodar teste — deve falhar**

```bash
npx jest __tests__/lib/stackspot.test.ts
```

Expected: FAIL (module not found)

- [ ] **Step 3: Criar lib/stackspot.ts**

```typescript
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
  // Extrair o texto acumulado das linhas data
  const chunks: string[] = []
  for (const line of result.split('\n')) {
    if (!line.startsWith('data:')) continue
    const payload = line.slice(5).trim()
    if (payload === '[DONE]') break
    try {
      const obj = JSON.parse(payload)
      if (obj.choices?.[0]?.delta?.content) chunks.push(obj.choices[0].delta.content)
      // fallback: se for string direta
      if (typeof obj.text === 'string') chunks.push(obj.text)
    } catch { /* skip malformed */ }
  }
  return chunks.join('')
}
```

- [ ] **Step 4: Rodar teste — deve passar**

```bash
npx jest __tests__/lib/stackspot.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/stackspot.ts __tests__/lib/stackspot.test.ts
git commit -m "feat: add Stackspot client with token cache and race-condition guard"
```

---

## Task 6: Sanitização de input

**Files:**
- Create: `lib/content-blocklist.ts`
- Create: `lib/sanitize.ts`
- Create: `__tests__/lib/sanitize.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// __tests__/lib/sanitize.test.ts
import { sanitizeTopic } from '@/lib/sanitize'

describe('sanitizeTopic', () => {
  it('returns clean topic unchanged', () => {
    expect(sanitizeTopic('Lógica de programação')).toBe('Lógica de programação')
  })

  it('strips HTML tags', () => {
    expect(sanitizeTopic('<script>alert(1)</script>Matrizes')).toBe('Matrizes')
  })

  it('truncates to 200 chars', () => {
    const long = 'a'.repeat(250)
    expect(sanitizeTopic(long)).toHaveLength(200)
  })

  it('throws on prompt injection', () => {
    expect(() => sanitizeTopic('ignore previous instructions')).toThrow('Tema inválido')
  })

  it('throws on system: pattern', () => {
    expect(() => sanitizeTopic('system: do something bad')).toThrow('Tema inválido')
  })

  it('throws on blocked content', () => {
    expect(() => sanitizeTopic('pornografia')).toThrow('Tema não permitido')
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx jest __tests__/lib/sanitize.test.ts
```

- [ ] **Step 3: Criar lib/content-blocklist.ts**

```typescript
// lib/content-blocklist.ts
export const BLOCKED_TERMS = [
  'pornografia', 'pornography', 'porn', 'nude', 'nudez',
  'sexo explícito', 'explicit sex', 'hentai',
]
```

- [ ] **Step 4: Criar lib/sanitize.ts**

```typescript
// lib/sanitize.ts
import { BLOCKED_TERMS } from './content-blocklist'

const INJECTION_PATTERN = /(ignore\s+(previous|all)|system:|<\|im_start\|>|###\s*instruction)/i

export function sanitizeTopic(raw: string): string {
  // 1. Strip HTML
  let topic = raw.replace(/<[^>]*>/g, '').trim()
  // 2. Strip control chars
  topic = topic.replace(/[\x00-\x1F\x7F]/g, '')
  // 3. Truncate
  topic = topic.slice(0, 200)
  // 4. Injection check
  if (INJECTION_PATTERN.test(topic)) throw new Error('Tema inválido')
  // 5. Blocked content
  const lower = topic.toLowerCase()
  for (const term of BLOCKED_TERMS) {
    if (lower.includes(term)) throw new Error('Tema não permitido')
  }
  return topic
}
```

- [ ] **Step 5: Rodar — deve passar**

```bash
npx jest __tests__/lib/sanitize.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add lib/sanitize.ts lib/content-blocklist.ts __tests__/lib/sanitize.test.ts
git commit -m "feat: add topic sanitization with injection and content blocklist"
```

---

## Task 7: Rate limiting

**Files:**
- Create: `lib/rate-limit.ts`
- Create: `__tests__/lib/rate-limit.test.ts`

- [ ] **Step 1: Escrever testes**

```typescript
// __tests__/lib/rate-limit.test.ts
import { checkCourseRateLimit, checkRetryRateLimit } from '@/lib/rate-limit'

jest.mock('@/lib/db', () => ({
  db: {
    course: { count: jest.fn() },
  },
}))

import { db } from '@/lib/db'

describe('checkCourseRateLimit', () => {
  it('returns ok when under limit', async () => {
    (db.course.count as jest.Mock).mockResolvedValue(3)
    const result = await checkCourseRateLimit('user1')
    expect(result.ok).toBe(true)
  })

  it('returns not ok when at limit', async () => {
    (db.course.count as jest.Mock).mockResolvedValue(5)
    const result = await checkCourseRateLimit('user1')
    expect(result.ok).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar — deve falhar**

```bash
npx jest __tests__/lib/rate-limit.test.ts
```

- [ ] **Step 3: Criar lib/rate-limit.ts**

```typescript
// lib/rate-limit.ts
import { db } from './db'

const ONE_HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000)

export async function checkCourseRateLimit(userId: string): Promise<{ ok: boolean }> {
  const count = await db.course.count({
    where: { userId, createdAt: { gte: ONE_HOUR_AGO() } },
  })
  return { ok: count < 5 }
}

export async function checkRetryRateLimit(courseId: string): Promise<{ ok: boolean }> {
  // Conta quantas vezes o curso voltou para GENERATING na última hora
  // usando o updatedAt. Simplificado: confiamos que status FAILED→GENERATING
  // só ocorre via /retry. Limite: 3 retries/hora por curso.
  // Como Prisma não tem um campo retryCount nativo, usamos uma query simples:
  // se o curso foi atualizado (updatedAt) mais de 3 vezes na última hora
  // aproximamos contando se updatedAt é recente. Para MVP real, adicione
  // um campo `retryCount Int @default(0)` no schema e incremente no retry.
  // Por ora, a rota /retry verifica diretamente:
  return { ok: true } // Ver implementação real em retry/route.ts
}
```

- [ ] **Step 4: Rodar — deve passar**

```bash
npx jest __tests__/lib/rate-limit.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add lib/rate-limit.ts __tests__/lib/rate-limit.test.ts
git commit -m "feat: add rate limiting helpers"
```

---

## Task 8: Componentes UI base

**Files:**
- Create: `components/ui/Navbar.tsx`
- Create: `components/ui/BottomNav.tsx`
- Create: `components/ui/LevelBadge.tsx`

- [ ] **Step 1: Criar components/ui/LevelBadge.tsx**

```tsx
// components/ui/LevelBadge.tsx
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
```

- [ ] **Step 2: Criar components/ui/Navbar.tsx**

```tsx
// components/ui/Navbar.tsx
'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-subtle h-12 flex items-center px-4 sm:px-6 gap-4">
      <Link href="/" className="text-lg font-bold text-accent">
        AI<span className="text-text-primary">.nstein</span>
      </Link>

      <div className="hidden sm:flex gap-5 flex-1">
        <Link href="/" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Explorar</Link>
        {session && (
          <Link href="/generate" className="text-sm text-text-muted hover:text-text-secondary transition-colors">Meus cursos</Link>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {session ? (
          <>
            {session.user?.image && (
              <img src={session.user.image} alt="" className="w-7 h-7 rounded-full" />
            )}
            <button onClick={() => signOut()} className="text-xs text-text-muted hover:text-text-secondary">Sair</button>
          </>
        ) : (
          <Link href="/login" className="bg-accent text-base text-sm font-semibold px-3 py-1.5 rounded-lg">
            Entrar
          </Link>
        )}
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Criar components/ui/BottomNav.tsx**

```tsx
// components/ui/BottomNav.tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export function BottomNav() {
  const { data: session } = useSession()
  const path = usePathname()

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-subtle flex justify-around py-2 z-50">
      <Link href="/" className={`flex flex-col items-center gap-0.5 text-[10px] ${path === '/' ? 'text-accent' : 'text-text-muted'}`}>
        <span className="text-lg">🏠</span>Início
      </Link>
      <Link href={session ? '/generate' : '/login'} className={`flex flex-col items-center gap-0.5 text-[10px] ${path === '/generate' ? 'text-accent' : 'text-text-muted'}`}>
        <span className="text-lg">✨</span>Gerar
      </Link>
      <Link href={session ? '/login' : '/login'} className="flex flex-col items-center gap-0.5 text-[10px] text-text-muted">
        <span className="text-lg">👤</span>Perfil
      </Link>
    </nav>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/
git commit -m "feat: add Navbar, BottomNav, and LevelBadge components"
```

---

## Task 9: Componente Einstein

**Files:**
- Create: `components/einstein/Einstein.tsx`

- [ ] **Step 1: Criar Einstein.tsx com SVG e estados animados**

```tsx
// components/einstein/Einstein.tsx
'use client'

export type EinsteinState = 'idle' | 'thinking' | 'talking' | 'celebrating'

interface EinsteinProps {
  state?: EinsteinState
  size?: number
}

export function Einstein({ state = 'idle', size = 160 }: EinsteinProps) {
  return (
    <div className="relative" style={{ width: size, height: size * 1.4 }}>
      <svg
        viewBox="0 0 160 220"
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size * 1.4}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="skin" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#fdd9a0" />
            <stop offset="100%" stopColor="#f0b060" />
          </radialGradient>
          <radialGradient id="hair" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0ece0" />
            <stop offset="100%" stopColor="#d8d4c8" />
          </radialGradient>

          <style>{`
            .e-body { animation: breathe 3s ease-in-out infinite; transform-origin: 80px 200px; }
            .e-hair-l { animation: hairL 3s ease-in-out infinite; transform-origin: 55px 130px; }
            .e-hair-r { animation: hairR 3s ease-in-out infinite; transform-origin: 105px 130px; }
            .e-eyes { animation: blink 4.5s ease-in-out infinite; }
            .e-eyebrow-l { animation: ${state === 'thinking' ? 'browDown' : 'browUp'} 0.4s ease-out forwards; }
            .e-eyebrow-r { animation: ${state === 'thinking' ? 'browDown' : 'browUp'} 0.4s ease-out forwards; }
            .e-mustache { animation: ${state === 'talking' ? 'talk' : 'none'} 0.3s ease-in-out infinite alternate; }
            .e-arms { animation: ${state === 'celebrating' ? 'celebrate' : 'none'} 0.5s ease-in-out infinite alternate; transform-origin: 80px 175px; }
            .e-head { animation: ${state === 'thinking' ? 'tilt' : 'none'} 0.5s ease-out forwards; transform-origin: 80px 150px; }

            @keyframes breathe { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.018) translateY(-1.5px)} }
            @keyframes hairL { 0%,100%{transform:rotate(-1.5deg)} 50%{transform:rotate(1.5deg)} }
            @keyframes hairR { 0%,100%{transform:rotate(1.5deg)} 50%{transform:rotate(-1.5deg)} }
            @keyframes blink { 0%,88%,100%{transform:scaleY(1)} 94%{transform:scaleY(0.07)} }
            @keyframes browUp { to { transform: translateY(0); } }
            @keyframes browDown { to { transform: translateY(3px); } }
            @keyframes talk { from{transform:translateY(0)} to{transform:translateY(2px)} }
            @keyframes tilt { to { transform: rotate(-5deg); } }
            @keyframes celebrate { from{transform:rotate(-15deg)} to{transform:rotate(15deg)} }
          `}</style>
        </defs>

        <g className="e-body">
          {/* Shadow */}
          <ellipse cx="80" cy="218" rx="42" ry="6" fill="rgba(0,0,0,0.3)" />

          {/* Coat */}
          <ellipse cx="80" cy="192" rx="50" ry="36" fill="#1e2a10" />
          <path d="M80 158 L55 183 L65 198Z" fill="#141c08" />
          <path d="M80 158 L105 183 L95 198Z" fill="#141c08" />
          <rect x="71" y="158" width="18" height="44" rx="3" fill="#f5f0e0" />
          <path d="M77 162 L83 162 L86 190 L80 197 L74 190Z" fill="#5a3010" />

          {/* Arms — celebrate state raises them */}
          <g className="e-arms">
            <rect x="20" y="170" width="18" height="36" rx="9" fill="#1e2a10" transform="rotate(-10,20,170)" />
            <rect x="122" y="170" width="18" height="36" rx="9" fill="#1e2a10" transform="rotate(10,140,170)" />
          </g>

          {/* Neck */}
          <rect x="70" y="145" width="20" height="18" rx="5" fill="url(#skin)" />

          {/* Head group */}
          <g className="e-head">
            {/* Hair top */}
            <ellipse cx="80" cy="66" rx="50" ry="32" fill="url(#hair)" />
            {/* Hair left */}
            <g className="e-hair-l">
              <ellipse cx="36" cy="80" rx="20" ry="34" fill="url(#hair)" transform="rotate(-18,36,130)" />
              <ellipse cx="24" cy="76" rx="13" ry="24" fill="#e8e4d8" transform="rotate(-28,24,130)" />
            </g>
            {/* Hair right */}
            <g className="e-hair-r">
              <ellipse cx="124" cy="80" rx="20" ry="34" fill="url(#hair)" transform="rotate(18,124,130)" />
              <ellipse cx="136" cy="76" rx="13" ry="24" fill="#e8e4d8" transform="rotate(28,136,130)" />
            </g>

            {/* Face */}
            <ellipse cx="80" cy="112" rx="48" ry="52" fill="url(#skin)" />

            {/* Ears */}
            <ellipse cx="33" cy="118" rx="9" ry="13" fill="#f0b060" />
            <ellipse cx="127" cy="118" rx="9" ry="13" fill="#f0b060" />

            {/* Eyebrows */}
            <g className="e-eyebrow-l">
              <path d="M47 88 Q57 81 67 85" stroke="#e8e4d8" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>
            <g className="e-eyebrow-r">
              <path d="M93 85 Q103 81 113 88" stroke="#e8e4d8" strokeWidth="5" fill="none" strokeLinecap="round" />
            </g>

            {/* Eyes */}
            <g className="e-eyes" style={{ transformOrigin: '57px 108px' }}>
              <ellipse cx="57" cy="108" rx="11" ry="10" fill="white" />
              <ellipse cx="58" cy="109" rx="7" ry="7.5" fill="#4a3820" />
              <ellipse cx="58" cy="109" rx="4.5" ry="5" fill="#1a0a00" />
              <ellipse cx="61" cy="106" rx="2" ry="2" fill="white" />
            </g>
            <g className="e-eyes" style={{ transformOrigin: '103px 108px' }}>
              <ellipse cx="103" cy="108" rx="11" ry="10" fill="white" />
              <ellipse cx="104" cy="109" rx="7" ry="7.5" fill="#4a3820" />
              <ellipse cx="104" cy="109" rx="4.5" ry="5" fill="#1a0a00" />
              <ellipse cx="107" cy="106" rx="2" ry="2" fill="white" />
            </g>

            {/* Nose */}
            <ellipse cx="80" cy="126" rx="8" ry="6" fill="#e8a050" />
            <ellipse cx="75" cy="130" rx="4" ry="3.5" fill="#d89040" />
            <ellipse cx="85" cy="130" rx="4" ry="3.5" fill="#d89040" />

            {/* Mustache */}
            <g className="e-mustache">
              <path
                d="M47 140 Q56 133 65 137 Q72 141 80 139 Q88 141 95 137 Q104 133 113 140 Q104 150 95 146 Q88 143 80 145 Q72 143 65 146 Q56 150 47 140Z"
                fill="#f0ece0"
              />
            </g>

            {/* Mouth */}
            <path d="M64 152 Q80 158 96 152" stroke="#c08040" strokeWidth="2" fill="none" strokeLinecap="round" />

            {/* Cheek blush */}
            <ellipse cx="40" cy="124" rx="10" ry="7" fill="rgba(240,150,80,0.12)" />
            <ellipse cx="120" cy="124" rx="10" ry="7" fill="rgba(240,150,80,0.12)" />
          </g>
        </g>
      </svg>

      {/* Formula floating */}
      {(state === 'idle' || state === 'thinking') && (
        <div
          className="absolute top-0 right-0 text-accent font-serif font-bold text-sm opacity-70"
          style={{ animation: 'float 4s ease-in-out infinite' }}
        >
          E=mc²
        </div>
      )}

      <style>{`
        @keyframes float {
          0%,100% { transform: translateY(0) rotate(-3deg); opacity: 0.7; }
          50% { transform: translateY(-8px) rotate(3deg); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
```

- [ ] **Step 2: Testar visualmente** — criar uma página de teste temporária `/app/test-einstein/page.tsx` com os 4 estados lado a lado, verificar no browser.

- [ ] **Step 3: Commit**

```bash
git add components/einstein/
git commit -m "feat: add animated Einstein SVG component with 4 states"
```

---

## Task 10: API — GET /api/courses + POST /api/courses

**Files:**
- Create: `app/api/courses/route.ts`

- [ ] **Step 1: Criar app/api/courses/route.ts**

```typescript
// app/api/courses/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { sanitizeTopic } from '@/lib/sanitize'
import { checkCourseRateLimit } from '@/lib/rate-limit'
import { Level } from '@prisma/client'

// GET /api/courses?cursor=<id> — lista pública
export async function GET(req: NextRequest) {
  const cursor = req.nextUrl.searchParams.get('cursor')
  const courses = await db.course.findMany({
    take: 12,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    orderBy: { createdAt: 'desc' },
    where: { status: 'READY' },
    select: {
      id: true, title: true, topic: true, level: true,
      createdAt: true,
      _count: { select: { lessons: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  })
  const nextCursor = courses.length === 12 ? courses[courses.length - 1].id : null
  return NextResponse.json({ courses, nextCursor })
}

// POST /api/courses — criar curso (auth required)
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ok } = await checkCourseRateLimit(session.user.id)
  if (!ok) return NextResponse.json({ error: 'Limite de cursos atingido (5/hora)' }, { status: 429 })

  const body = await req.json()
  let topic: string
  try {
    topic = sanitizeTopic(body.topic ?? '')
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }

  const levelMap: Record<string, Level> = {
    BEGINNER: 'BEGINNER',
    INTERMEDIATE: 'INTERMEDIATE',
    ADVANCED: 'ADVANCED',
  }
  const level: Level = levelMap[body.level] ?? 'BEGINNER'

  const course = await db.course.create({
    data: {
      topic,
      title: topic, // título provisório; atualizado após geração do outline
      level,
      userId: session.user.id,
      status: 'GENERATING',
    },
  })

  return NextResponse.json({ courseId: course.id }, { status: 201 })
}
```

- [ ] **Step 2: Testar com curl**

```bash
# Listar cursos (deve retornar array vazio)
curl http://localhost:3000/api/courses

# Criar curso sem auth (deve retornar 401)
curl -X POST http://localhost:3000/api/courses \
  -H 'Content-Type: application/json' \
  -d '{"topic":"Matrizes","level":"BEGINNER"}'
```

- [ ] **Step 3: Commit**

```bash
git add app/api/courses/route.ts
git commit -m "feat: add GET /api/courses and POST /api/courses endpoints"
```

---

## Task 11: API — GET /api/courses/[id]

**Files:**
- Create: `app/api/courses/[id]/route.ts`

- [ ] **Step 1: Criar route.ts**

```typescript
// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await db.course.findUnique({
    where: { id: params.id },
    include: {
      lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true, order: true, status: true } },
      user: { select: { id: true, name: true, image: true } },
    },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(course)
}
```

- [ ] **Step 2: Testar**

```bash
curl http://localhost:3000/api/courses/curso-inexistente
# Expected: 404
```

- [ ] **Step 3: Commit**

```bash
git add app/api/courses/[id]/route.ts
git commit -m "feat: add GET /api/courses/[id] endpoint"
```

---

## Task 12: API — SSE Stream + Geração com Stackspot

**Files:**
- Create: `app/api/courses/[id]/stream/route.ts`

Este é o endpoint mais complexo. Ele gerencia toda a geração progressiva.

- [ ] **Step 1: Criar stream/route.ts**

```typescript
// app/api/courses/[id]/stream/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { stackspotChatText } from '@/lib/stackspot'

export const maxDuration = 300

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
  const stream = new TransformStream<string, Uint8Array>()
  const writer = stream.writable.getWriter()

  const send = async (event: string, data: unknown) => {
    await writer.write(encoder.encode(sseEvent(event, data)))
  }

  // Reconnect: curso já tem lições — enviar catchup
  const runGeneration = async () => {
    try {
      if (course.lessons.length > 0) {
        for (const lesson of course.lessons) {
          await send('lesson_created', { id: lesson.id, title: lesson.title, order: lesson.order })
          if (lesson.status === 'READY' && lesson.content) {
            await send('lesson_ready', { id: lesson.id, content: lesson.content })
          }
        }
        if (course.status === 'READY') {
          await send('course_ready', { courseId: course.id })
          await writer.close()
          return
        }
        if (course.status === 'FAILED') {
          await send('course_failed', { courseId: course.id })
          await writer.close()
          return
        }
      }

      const levelLabel = { BEGINNER: 'Iniciante', INTERMEDIATE: 'Intermediário', ADVANCED: 'Avançado' }[course.level]

      // FASE 1: Outline
      const outlinePrompt = `Crie um outline para um curso completo sobre "${course.topic}" para nível ${levelLabel}.\nRetorne SOMENTE JSON válido no formato: { "title": string, "description": string, "lessons": [{ "title": string, "description": string }] }\nNão inclua markdown, apenas o JSON.`
      const outlineRaw = await stackspotChatText(outlinePrompt)

      let outline: { title: string; description: string; lessons: { title: string; description: string }[] }
      try {
        const jsonMatch = outlineRaw.match(/\{[\s\S]*\}/)
        outline = JSON.parse(jsonMatch?.[0] ?? outlineRaw)
      } catch {
        throw new Error('Outline JSON inválido')
      }

      // Atualizar título do curso
      await db.course.update({ where: { id: course.id }, data: { title: outline.title } })

      // Criar lições no banco
      const lessons = await Promise.all(
        outline.lessons.map((l, i) =>
          db.lesson.create({
            data: { courseId: course.id, title: l.title, order: i + 1, status: 'PENDING' },
          })
        )
      )

      for (const lesson of lessons) {
        await send('lesson_created', { id: lesson.id, title: lesson.title, order: lesson.order })
      }

      // FASE 2: Conteúdo de cada aula
      for (const lesson of lessons) {
        const lessonPrompt = `Escreva o conteúdo completo da aula "${lesson.title}" do curso "${course.topic}" para nível ${levelLabel}.\nUse markdown. Inclua exemplos de código quando aplicável.\nEscreva de forma didática e progressiva. Máximo 800 palavras.`
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

      await db.quiz.create({ data: { courseId: course.id, questions } })
      await send('quiz_ready', { courseId: course.id })

      // Finalizar
      await db.course.update({ where: { id: course.id }, data: { status: 'READY' } })
      await send('course_ready', { courseId: course.id })
    } catch (err) {
      console.error('Generation error:', err)
      await db.course.update({ where: { id: course.id }, data: { status: 'FAILED' } })
      await send('course_failed', { error: String(err) })
    } finally {
      await writer.close()
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
```

- [ ] **Step 2: Commit**

```bash
git add app/api/courses/[id]/stream/
git commit -m "feat: add SSE stream endpoint with progressive course generation"
```

---

## Task 13: API — Retry, Quiz, Progress

**Files:**
- Create: `app/api/courses/[id]/retry/route.ts`
- Create: `app/api/courses/[id]/quiz/route.ts`
- Create: `app/api/courses/[id]/quiz/submit/route.ts`
- Create: `app/api/courses/[id]/progress/route.ts`

- [ ] **Step 1: Criar retry/route.ts**

```typescript
// app/api/courses/[id]/retry/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

const ONE_HOUR_AGO = () => new Date(Date.now() - 60 * 60 * 1000)

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const course = await db.course.findUnique({
    where: { id: params.id },
    select: { userId: true, status: true, retryCount: true, lastRetryAt: true },
  })
  if (!course) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (course.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (course.status !== 'FAILED') return NextResponse.json({ error: 'Course is not FAILED' }, { status: 400 })

  // Rate limit: 3 retries/hora — requer campos retryCount + lastRetryAt no schema
  // Adicionar ao schema.prisma: retryCount Int @default(0), lastRetryAt DateTime?
  // Verificar se ultrapassou 3 retries na última hora:
  const recentRetries = (course as any).retryCount ?? 0
  const lastRetryAt = (course as any).lastRetryAt as Date | null
  const withinHour = lastRetryAt && lastRetryAt > ONE_HOUR_AGO()
  if (withinHour && recentRetries >= 3) {
    return NextResponse.json({ error: 'Limite de retries atingido (3/hora)' }, { status: 429 })
  }

  // Limpar dados parciais e reiniciar
  await db.lesson.deleteMany({ where: { courseId: params.id } })
  await db.course.update({
    where: { id: params.id },
    data: {
      status: 'GENERATING',
      retryCount: withinHour ? { increment: 1 } : 1,
      lastRetryAt: new Date(),
    } as any,
  })

  return NextResponse.json({ ok: true })
}

// NOTA: adicionar ao schema.prisma no model Course:
//   retryCount  Int       @default(0)
//   lastRetryAt DateTime?
```

- [ ] **Step 2: Criar quiz/route.ts**

```typescript
// app/api/courses/[id]/quiz/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const course = await db.course.findUnique({
    where: { id: params.id },
    select: { status: true, quiz: { select: { questions: true } } },
  })
  if (!course || course.status !== 'READY') return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!course.quiz) return NextResponse.json({ error: 'Quiz not ready' }, { status: 404 })

  // Remover correctIndex antes de enviar
  const questions = (course.quiz.questions as any[]).map(({ correctIndex: _, ...q }) => q)
  return NextResponse.json({ questions })
}
```

- [ ] **Step 3: Criar quiz/submit/route.ts**

```typescript
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
    data: { userId: session.user.id, courseId: params.id, score, answers: userAnswers },
  })

  return NextResponse.json({ score: result.score, answers: result.answers }, { status: 200 })
}
```

- [ ] **Step 4: Criar progress/route.ts**

```typescript
// app/api/courses/[id]/progress/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { lessonId, lastLessonId } = await req.json()

  const progress = await db.userProgress.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId: params.id } },
    create: {
      userId: session.user.id,
      courseId: params.id,
      completedLessons: lessonId ? [lessonId] : [],
      lastLessonId: lastLessonId ?? null,
    },
    update: {
      // Adicionar lessonId ao array somente se ainda não estiver
      completedLessons: lessonId
        ? { push: lessonId }  // Prisma não tem addToSet nativo — filtrar duplicatas no GET
        : undefined,
      lastLessonId: lastLessonId ?? undefined,
    },
  })

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/courses/[id]/retry app/api/courses/[id]/quiz app/api/courses/[id]/progress
git commit -m "feat: add retry, quiz, and progress API endpoints"
```

---

## Task 14: Componentes de curso

**Files:**
- Create: `components/course/CourseCard.tsx`
- Create: `components/course/CourseGenerationForm.tsx`
- Create: `components/course/LessonList.tsx`
- Create: `components/course/LessonContent.tsx`

- [ ] **Step 1: Criar CourseCard.tsx**

```tsx
// components/course/CourseCard.tsx
import Link from 'next/link'
import { LevelBadge } from '@/components/ui/LevelBadge'
import { Level } from '@prisma/client'

interface CourseCardProps {
  id: string
  title: string
  level: Level
  lessonCount: number
  user: { name: string | null; image: string | null }
  createdAt: string
}

export function CourseCard({ id, title, level, lessonCount, user }: CourseCardProps) {
  return (
    <Link href={`/course/${id}`} className="block bg-raised border border-subtle rounded-xl p-4 hover:border-accent/20 transition-colors flex flex-col gap-2">
      <LevelBadge level={level} />
      <h3 className="text-sm font-semibold text-text-primary leading-snug">{title}</h3>
      <p className="text-xs text-text-muted">{lessonCount} aulas · Quiz final</p>
      <div className="flex items-center gap-2 mt-auto pt-2">
        {user.image && <img src={user.image} alt="" className="w-5 h-5 rounded-full" />}
        <span className="text-xs text-text-muted">{user.name}</span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Criar CourseGenerationForm.tsx**

```tsx
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
    } catch (err: any) {
      setError(err.message)
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
```

- [ ] **Step 3: Criar LessonList.tsx**

```tsx
// components/course/LessonList.tsx
import Link from 'next/link'

interface Lesson { id: string; title: string; order: number; status: string }

interface LessonListProps {
  courseId: string
  lessons: Lesson[]
  completedLessons?: string[]
  currentOrder?: number
}

export function LessonList({ courseId, lessons, completedLessons = [], currentOrder }: LessonListProps) {
  return (
    <aside className="w-52 min-w-[13rem] bg-base border-l border-subtle p-3 overflow-y-auto hidden sm:block scrollbar-hidden">
      <p className="text-[9px] uppercase tracking-widest text-text-muted mb-3">Aulas</p>
      <ul className="flex flex-col gap-0.5">
        {lessons.map(lesson => {
          const done = completedLessons.includes(lesson.id)
          const active = lesson.order === currentOrder
          const pending = lesson.status === 'PENDING'
          return (
            <li key={lesson.id}>
              <Link
                href={pending ? '#' : `/course/${courseId}/lesson/${lesson.order}`}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  active ? 'bg-accent/10 text-text-primary' : done ? 'text-text-muted' : 'text-text-secondary hover:text-text-primary'
                } ${pending ? 'pointer-events-none opacity-40' : ''}`}
              >
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] flex-shrink-0 ${
                  done ? 'bg-accent border-accent text-base' : active ? 'border-accent' : 'border-subtle'
                }`}>
                  {done ? '✓' : lesson.order}
                </span>
                <span className="truncate">{pending ? '...' : lesson.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
```

- [ ] **Step 4: Criar LessonContent.tsx**

```tsx
// components/course/LessonContent.tsx
'use client'
import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism'

interface LessonContentProps {
  content: string
  onTypingChange?: (isTyping: boolean) => void
}

export function LessonContent({ content, onTypingChange }: LessonContentProps) {
  const [displayed, setDisplayed] = useState('')

  useEffect(() => {
    setDisplayed('')
    onTypingChange?.(true)
    let i = 0
    const interval = setInterval(() => {
      i += 4 // 4 chars per tick for speed
      setDisplayed(content.slice(0, i))
      if (i >= content.length) {
        clearInterval(interval)
        onTypingChange?.(false)
      }
    }, 16)
    return () => clearInterval(interval)
  }, [content])

  return (
    <div className="prose prose-invert prose-sm max-w-none text-text-secondary leading-relaxed">
      <ReactMarkdown
        components={{
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '')
            return !inline && match ? (
              <SyntaxHighlighter
                style={oneDark}
                language={match[1]}
                PreTag="div"
                customStyle={{ background: '#080e08', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, fontSize: 12 }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            ) : (
              <code className="bg-raised px-1 rounded text-accent text-xs" {...props}>{children}</code>
            )
          },
          h1: ({ children }) => <h1 className="text-lg font-bold text-text-primary mb-3">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-semibold text-text-primary mb-2 mt-4">{children}</h2>,
          p: ({ children }) => <p className="mb-3 text-text-secondary leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
        }}
      >
        {displayed}
      </ReactMarkdown>
      {displayed.length < content.length && (
        <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/course/ components/quiz/
git commit -m "feat: add CourseCard, GenerationForm, LessonList, LessonContent components"
```

---

## Task 15: QuizPlayer

**Files:**
- Create: `components/quiz/QuizPlayer.tsx`

- [ ] **Step 1: Criar QuizPlayer.tsx**

```tsx
// components/quiz/QuizPlayer.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Question { question: string; options: string[] }

interface QuizPlayerProps {
  courseId: string
  questions: Question[]
  onComplete?: () => void  // chamado na primeira submissão bem-sucedida (200)
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
    if (res.status === 200) onComplete?.() // celebrar só na primeira submissão
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
```

- [ ] **Step 2: Commit**

```bash
git add components/quiz/QuizPlayer.tsx
git commit -m "feat: add QuizPlayer component"
```

---

## Task 16: Páginas

**Files:**
- Modify: `app/page.tsx`
- Create: `app/generate/page.tsx`
- Create: `app/course/[id]/page.tsx`
- Create: `app/course/[id]/lesson/[order]/page.tsx`
- Create: `app/course/[id]/test/page.tsx`

- [ ] **Step 1: Criar app/page.tsx (Home)**

```tsx
// app/page.tsx
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { CourseGenerationForm } from '@/components/course/CourseGenerationForm'
import { CourseCard } from '@/components/course/CourseCard'

async function getCourses() {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/courses`, { next: { revalidate: 60 } })
  if (!res.ok) return { courses: [], nextCursor: null }
  return res.json()
}

export default async function HomePage() {
  const { courses } = await getCourses()

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 pt-10 pb-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">O que você quer<br />aprender hoje?</h1>
            <p className="text-text-muted text-sm mb-5">Einstein gera um curso completo em segundos.</p>
            <CourseGenerationForm />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[11px] uppercase tracking-widest text-text-muted">Cursos da comunidade</p>
            </div>
            {courses.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-8">Nenhum curso ainda. Seja o primeiro!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {courses.map((c: any) => (
                  <CourseCard
                    key={c.id}
                    id={c.id}
                    title={c.title}
                    level={c.level}
                    lessonCount={c._count.lessons}
                    user={c.user}
                    createdAt={c.createdAt}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
```

- [ ] **Step 2: Criar app/generate/page.tsx**

```tsx
// app/generate/page.tsx
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { Navbar } from '@/components/ui/Navbar'
import { CourseGenerationForm } from '@/components/course/CourseGenerationForm'
import { Einstein } from '@/components/einstein/Einstein'

export default async function GeneratePage() {
  const session = await auth()
  if (!session) redirect('/login?callbackUrl=/generate')

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base flex flex-col items-center justify-center px-4 pb-10">
        <div className="flex flex-col items-center gap-6 w-full max-w-md">
          <Einstein state="idle" size={120} />
          <div className="text-center">
            <h1 className="text-xl font-bold text-text-primary mb-1">Gerar novo curso</h1>
            <p className="text-text-muted text-sm">Informe o tema e eu preparo tudo para você.</p>
          </div>
          <div className="w-full">
            <CourseGenerationForm />
          </div>
        </div>
      </main>
    </>
  )
}
```

- [ ] **Step 3: Criar app/course/[id]/page.tsx (Course Overview com SSE)**

```tsx
// app/course/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Einstein } from '@/components/einstein/Einstein'
import { LevelBadge } from '@/components/ui/LevelBadge'

interface Lesson { id: string; title: string; order: number; status: string; content?: string }
interface Course {
  id: string; title: string; topic: string; level: string; status: string
  lessons: Lesson[]; user: { name: string | null; image: string | null }
}

export default function CoursePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession()
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [generating, setGenerating] = useState(false)
  const [failed, setFailed] = useState(false)

  // Aguarda session antes de tentar o stream (useSession é async no client)
  const sessionStatus = useSession().status

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then((c: Course) => {
        setCourse(c)
        setLessons(c.lessons)
        if (c.status === 'GENERATING') {
          // Só inicia stream quando session estiver carregada
          if (sessionStatus === 'authenticated') startStream()
        }
        if (c.status === 'FAILED') setFailed(true)
      })
  }, [params.id, sessionStatus]) // re-executa quando session carrega

  const startStream = () => {
    if (sessionStatus !== 'authenticated') return
    setGenerating(true)
    const es = new EventSource(`/api/courses/${params.id}/stream`)

    es.addEventListener('lesson_created', e => {
      const lesson = JSON.parse(e.data)
      setLessons(prev => {
        if (prev.find(l => l.id === lesson.id)) return prev
        return [...prev, { ...lesson, status: 'PENDING' }].sort((a, b) => a.order - b.order)
      })
    })
    es.addEventListener('lesson_ready', e => {
      const { id, content } = JSON.parse(e.data)
      setLessons(prev => prev.map(l => l.id === id ? { ...l, status: 'READY', content } : l))
    })
    es.addEventListener('course_ready', () => {
      setGenerating(false)
      es.close()
    })
    es.addEventListener('course_failed', () => {
      setFailed(true)
      setGenerating(false)
      es.close()
    })
    es.addEventListener('catchup', e => {
      const data = JSON.parse(e.data)
      if (data.lessons) setLessons(data.lessons)
    })
    es.onerror = () => es.close()
  }

  const handleRetry = async () => {
    await fetch(`/api/courses/${params.id}/retry`, { method: 'POST' })
    setFailed(false)
    setLessons([])
    startStream()
  }

  if (!course) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <div className="text-text-muted text-sm">Carregando...</div>
    </div>
  )

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-base pb-20 sm:pb-0">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6 mb-8">
            <Einstein state={generating ? 'thinking' : 'idle'} size={80} />
            <div className="flex-1">
              <LevelBadge level={course.level as any} />
              <h1 className="text-xl font-bold text-text-primary mt-2 mb-1">{course.title}</h1>
              <p className="text-xs text-text-muted">{course.topic}</p>
              {generating && <p className="text-xs text-accent mt-2 animate-pulse">Einstein está preparando o curso...</p>}
              {failed && (
                <div className="mt-3 flex items-center gap-3">
                  <p className="text-xs text-red-400">Falha na geração.</p>
                  <button onClick={handleRetry} className="text-xs text-accent border border-accent/30 px-3 py-1 rounded-lg">Tentar novamente</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[11px] uppercase tracking-widest text-text-muted mb-2">
              {lessons.length} aulas {generating ? '(gerando...)' : ''}
            </p>
            {lessons.map(lesson => (
              <Link
                key={lesson.id}
                href={lesson.status === 'READY' ? `/course/${params.id}/lesson/${lesson.order}` : '#'}
                className={`flex items-center gap-3 bg-raised border border-subtle rounded-xl px-4 py-3 transition-colors ${
                  lesson.status === 'READY' ? 'hover:border-accent/20' : 'opacity-50 pointer-events-none'
                }`}
              >
                <span className="w-7 h-7 rounded-full border border-subtle flex items-center justify-center text-xs text-text-muted flex-shrink-0">
                  {lesson.order}
                </span>
                <span className="text-sm text-text-secondary">
                  {lesson.status === 'PENDING' ? <span className="animate-pulse">Gerando aula...</span> : lesson.title}
                </span>
              </Link>
            ))}
          </div>

          {course.status === 'READY' && (
            <div className="mt-6">
              <Link href={`/course/${params.id}/test`} className="block w-full text-center bg-accent text-base font-semibold py-3 rounded-xl text-sm">
                Fazer quiz final →
              </Link>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </>
  )
}
```

- [ ] **Step 4: Criar app/course/[id]/lesson/[order]/page.tsx**

```tsx
// app/course/[id]/lesson/[order]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { BottomNav } from '@/components/ui/BottomNav'
import { Einstein } from '@/components/einstein/Einstein'
import { LessonList } from '@/components/course/LessonList'
import { LessonContent } from '@/components/course/LessonContent'

export default function LessonPage({ params }: { params: { id: string; order: string } }) {
  const order = parseInt(params.order)
  const [course, setCourse] = useState<any>(null)
  const [lesson, setLesson] = useState<any>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then(r => r.json())
      .then(c => {
        setCourse(c)
        const l = c.lessons.find((x: any) => x.order === order)
        setLesson(l)
        // Poll se lição ainda pendente
        if (l?.status === 'PENDING') {
          const interval = setInterval(async () => {
            const r2 = await fetch(`/api/courses/${params.id}`)
            const c2 = await r2.json()
            const l2 = c2.lessons.find((x: any) => x.order === order)
            if (l2?.status === 'READY') {
              setLesson(l2)
              clearInterval(interval)
            }
          }, 3000)
          return () => clearInterval(interval)
        }
      })
  }, [params.id, order])

  const markComplete = async () => {
    if (!lesson || completed.includes(lesson.id)) return
    await fetch(`/api/courses/${params.id}/progress`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, lastLessonId: lesson.id }),
    })
    setCompleted(prev => [...prev, lesson.id])
  }

  if (!course || !lesson) return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <Einstein state="thinking" size={80} />
    </div>
  )

  const prevLesson = course.lessons.find((l: any) => l.order === order - 1)
  const nextLesson = course.lessons.find((l: any) => l.order === order + 1)

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-48px)] bg-base">
        {/* Einstein panel — hidden on mobile */}
        <aside className="hidden sm:flex w-44 min-w-[11rem] flex-col items-center bg-surface border-r border-subtle p-4 gap-3">
          <p className="text-[9px] uppercase tracking-widest text-text-muted">Einstein</p>
          <Einstein state={isTyping ? 'talking' : lesson.status === 'PENDING' ? 'thinking' : 'idle'} size={100} />
          <p className="text-[10px] text-accent text-center">{isTyping ? 'Explicando...' : 'Pronto'}</p>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Einstein strip */}
          <div className="sm:hidden flex items-center gap-3 bg-surface border-b border-subtle p-3">
            <Einstein state={isTyping ? 'talking' : 'idle'} size={44} />
            <div className="flex-1 text-xs text-text-secondary leading-relaxed line-clamp-2">
              {isTyping ? 'Einstein está explicando...' : lesson.title}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 sm:p-8">
            <h1 className="text-lg font-bold text-text-primary mb-5">
              Aula {order} — {lesson.title}
            </h1>
            {lesson.status === 'PENDING' ? (
              <div className="animate-pulse text-text-muted text-sm">Einstein está preparando esta aula...</div>
            ) : (
              <LessonContent content={lesson.content ?? ''} onTypingChange={setIsTyping} />
            )}
          </div>

          {/* Bottom nav */}
          <div className="border-t border-subtle px-4 py-3 flex items-center gap-3 bg-surface">
            {prevLesson ? (
              <Link href={`/course/${params.id}/lesson/${prevLesson.order}`} className="text-xs text-text-muted">← Anterior</Link>
            ) : <span />}
            <button
              onClick={markComplete}
              className={`flex-1 text-center border rounded-lg py-2 text-xs transition-colors ${
                completed.includes(lesson.id)
                  ? 'border-accent/40 text-accent'
                  : 'border-subtle text-text-muted hover:border-accent/30'
              }`}
            >
              {completed.includes(lesson.id) ? '✓ Concluída' : 'Marcar como concluída'}
            </button>
            {nextLesson ? (
              <Link href={`/course/${params.id}/lesson/${nextLesson.order}`} className="bg-accent text-base text-xs font-bold px-4 py-2 rounded-lg">
                Próxima →
              </Link>
            ) : (
              <Link href={`/course/${params.id}/test`} className="bg-accent text-base text-xs font-bold px-4 py-2 rounded-lg">
                Quiz →
              </Link>
            )}
          </div>
        </main>

        {/* Lesson sidebar */}
        <LessonList
          courseId={params.id}
          lessons={course.lessons}
          completedLessons={completed}
          currentOrder={order}
        />
      </div>
      <BottomNav />
    </>
  )
}
```

- [ ] **Step 5: Criar app/course/[id]/test/page.tsx**

```tsx
// app/course/[id]/test/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { Navbar } from '@/components/ui/Navbar'
import { Einstein } from '@/components/einstein/Einstein'
import { QuizPlayer } from '@/components/quiz/QuizPlayer'

export default function TestPage({ params }: { params: { id: string } }) {
  const [questions, setQuestions] = useState<any[]>([])
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
```

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/generate app/course
git commit -m "feat: add all pages (home, generate, course overview, lesson, quiz)"
```

---

## Task 17: Vercel config + variáveis de ambiente

**Files:**
- Create: `vercel.json`
- Create: `next.config.ts` (update)

- [ ] **Step 1: Criar vercel.json**

```json
{
  "functions": {
    "app/api/courses/[id]/stream/route.ts": {
      "maxDuration": 300
    }
  }
}
```

- [ ] **Step 2: Configurar next.config.ts**

```typescript
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
  },
}

export default nextConfig
```

- [ ] **Step 3: Configurar variáveis de ambiente no Vercel**

No painel Vercel, adicionar:
- `NEXTAUTH_URL` = `https://ainstein.vercel.app`
- `NEXTAUTH_SECRET` = (gerado com `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `DATABASE_URL` (Supabase)
- `STACKSPOT_CLIENT_ID` = `89077063-d725-4b43-a334-03f6d8ee54e9`
- `STACKSPOT_CLIENT_KEY` (não commitar)
- `STACKSPOT_AGENT_ID` = `01KM708K7TMKBYPE2E3STHMV0C`

- [ ] **Step 4: Commit e deploy**

```bash
git add vercel.json next.config.ts
git commit -m "chore: add Vercel config with SSE maxDuration and image domains"
git push origin main
```

- [ ] **Step 5: Verificar deploy no Vercel dashboard** — confirmar build passou, variáveis de ambiente configuradas, rota SSE com maxDuration 300.

---

## Task 18: Testes de integração manual

- [ ] **Fluxo completo 1 — Geração:**
  1. Acessar `/` sem login
  2. Digitar tema, selecionar nível, clicar "Gerar"
  3. Confirmar redirect para `/login`
  4. Fazer login com Google/GitHub
  5. Confirmar redirect para `/generate` com tema preservado (se implementado via query string)
  6. Gerar curso — confirmar redirect para `/course/[id]`
  7. Observar aulas aparecerem progressivamente
  8. Clicar em aula pronta — Einstein anima, typewriter funciona
  9. Marcar aulas como concluídas
  10. Acessar quiz — responder todas as questões
  11. Submeter — ver score, Einstein celebra

- [ ] **Fluxo 2 — Reconexão:**
  1. Iniciar geração
  2. Fechar aba, reabrir `/course/[id]`
  3. Confirmar que lições já geradas aparecem via catchup

- [ ] **Fluxo 3 — Rate limit:**
  1. Gerar 5 cursos rapidamente
  2. Tentar gerar o 6º — confirmar erro 429

- [ ] **Fluxo 4 — Mobile:**
  1. Abrir no DevTools com viewport 375px
  2. Verificar formulário empilhado
  3. Verificar Einstein em faixa na aula
  4. Verificar bottom nav

---

## Checklist de segurança pré-deploy

- [ ] `STACKSPOT_CLIENT_KEY` não está em nenhum arquivo commitado
- [ ] `correctIndex` não aparece em nenhum response de API (testar com `curl /api/courses/[id]/quiz`)
- [ ] Rota SSE retorna 401 sem sessão
- [ ] Rota `/api/courses` POST retorna 401 sem sessão
- [ ] Sanitização rejeita `ignore previous instructions` com 400
- [ ] Rate limit funciona (5 cursos/hora)
```
