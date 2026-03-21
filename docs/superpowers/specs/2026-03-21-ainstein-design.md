# AI.nstein — Design Document

**Data:** 2026-03-21
**Status:** Aprovado pelo usuário

---

## Visão Geral

AI.nstein é uma plataforma web de geração de cursos educacionais com inteligência artificial. O usuário informa um tema e um nível de dificuldade; a IA gera um curso completo apresentado por um personagem animado do Einstein. A plataforma é social: todos os cursos gerados ficam visíveis publicamente com o nome do criador.

---

## Público-alvo

Qualquer pessoa com conta Google ou GitHub. O conteúdo é gerado para o nível escolhido, tornando a plataforma acessível a estudantes, profissionais e curiosos.

---

## Autenticação

- Login via **Google** e **GitHub** usando NextAuth.js
- Sessão persistida com JWT
- Rotas que exigem login: `/generate`, `/api/courses` (POST), `/api/courses/[id]/quiz/submit`, `/api/courses/[id]/progress`, `/api/courses/[id]/stream`
- Home e páginas de curso são públicas (leitura apenas)

---

## Fluxo de Geração de Cursos

Abordagem: **geração progressiva com Server-Sent Events (SSE)**

1. Usuário preenche tema + nível → `POST /api/courses` → curso criado no banco com `status: GENERATING` → resposta retorna `{ courseId }` → client redireciona para `/course/[id]`
2. A página do curso abre conexão SSE autenticada: `GET /api/courses/[id]/stream` (requer sessão)
3. O servidor chama a Stackspot em streaming com **timeout de 5 minutos**:
   - **Fase 1:** gera o outline (títulos + ordem das aulas) → cria Lessons no banco com `status: PENDING` e `order` definido → emite `lesson_created` por aula
   - **Fase 2:** gera conteúdo de cada aula em sequência → emite `lesson_ready` com conteúdo markdown
   - **Fase 3:** gera quiz (5 perguntas, 4 alternativas cada) → emite `quiz_ready`
4. Sucesso: `status: READY` → emite `course_ready`
5. Falha ou timeout: `status: FAILED` → emite `course_failed` → cliente exibe mensagem de erro com botão "Tentar novamente" → POST `/api/courses/[id]/retry` recria o processo; dados parciais são limpos antes de reiniciar

**Nota de deployment (Vercel):** A rota SSE requer `export const maxDuration = 300` e **Vercel Pro** (ou superior).

**Reconnect vs. Retry (distinção importante):**
- **Reconnect** (queda de rede, troca de aba): o cliente reconecta ao SSE endpoint. O servidor detecta que o curso já tem lições no banco e envia imediatamente um evento `catchup` com todas as lições já geradas (`lesson_created` + `lesson_ready` para as que já têm conteúdo), depois continua emitindo normalmente. A geração no servidor **não é interrompida** por desconexão do cliente — roda até o fim independentemente.
- **Retry** (botão "Tentar novamente" em cursos com `status: FAILED`): deleta todas as lições e quiz parciais, reinicia a geração do zero via `POST /api/courses/[id]/retry`.

---

## Integração com Stackspot

**Token JWT — ciclo de vida:**
- Obtido via `POST .../oidc/oauth/token` com `client_credentials`
- Armazenado em variável de módulo server-side (singleton em `lib/stackspot.ts`)
- Cacheado por **50 minutos** (tokens duram ~60 min); renovado automaticamente antes de cada chamada se `now > expiresAt - 5min`
- **Race condition evitado:** a renovação usa uma Promise compartilhada (`let refreshPromise: Promise<string> | null`). Se múltiplos requests detectarem expiração simultaneamente, todos aguardam a mesma Promise em vez de disparar chamadas paralelas. A Promise é limpa (null) após resolução.
- Nunca exposto ao cliente

**Endpoint de chat:**
```
POST https://genai-inference-app.stackspot.com/v1/agent/01KM708K7TMKBYPE2E3STHMV0C/chat
Authorization: Bearer <JWT>
{ "streaming": true, "user_prompt": "...", "stackspot_knowledge": false, "return_ks_in_response": false, "deep_search_ks": false }
```

**Prompts:**

- **Outline:**
  ```
  Crie um outline para um curso completo sobre "{tema}" para nível {nível}.
  Retorne SOMENTE JSON válido no formato: { "title": string, "description": string, "lessons": [{ "title": string, "description": string }] }
  Não inclua markdown, apenas o JSON.
  ```

- **Aula:**
  ```
  Escreva o conteúdo completo da aula "{título}" do curso "{tema}" para nível {nível}.
  Use markdown. Inclua exemplos de código quando aplicável com blocos de código com a linguagem especificada.
  Escreva de forma didática e progressiva. Máximo 800 palavras.
  ```

- **Quiz:**
  ```
  Crie 5 perguntas de múltipla escolha sobre o curso "{tema}" (nível {nível}).
  Retorne SOMENTE JSON válido: [{ "question": string, "options": [string, string, string, string], "correctIndex": number }]
  ```

**Sanitização de input:** O campo `tema` é sanitizado antes de ser inserido no prompt:
- Máximo 200 caracteres
- Strip de tags HTML e caracteres de controle
- Rejeitar strings que contenham padrões de prompt injection (ex: "ignore previous", "system:", "```")

---

## Banco de Dados (Prisma + PostgreSQL via Supabase)

```prisma
model User {
  id        String       @id @default(cuid())
  name      String
  email     String       @unique
  image     String?
  createdAt DateTime     @default(now())
  courses   Course[]
  progress  UserProgress[]
  results   TestResult[]
}

model Course {
  id          String       @id @default(cuid())
  title       String
  topic       String
  level       Level
  status      CourseStatus @default(GENERATING)
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  lessons     Lesson[]
  quiz        Quiz?
  progress    UserProgress[]
  results     TestResult[]
  createdAt   DateTime     @default(now())
}

model Lesson {
  id       String       @id @default(cuid())
  courseId String
  course   Course       @relation(fields: [courseId], references: [id], onDelete: Cascade)
  title    String
  content  String?      // Markdown — null enquanto PENDING
  order    Int          // definido na Fase 1 (outline); imutável após criação
                        // Em caso de retry, as lições antigas são deletadas (CASCADE)
                        // e novas são criadas com os mesmos orders do novo outline
  status   LessonStatus @default(PENDING)
}

model Quiz {
  id        String   @id @default(cuid())
  courseId  String   @unique
  course    Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  questions Json     // [{ question: string, options: string[4], correctIndex: number }]
                     // correctIndex NUNCA é enviado ao cliente
                     // Apenas usado server-side no submit do quiz
}

model UserProgress {
  id               String   @id @default(cuid())
  userId           String
  courseId         String
  user             User     @relation(fields: [userId], references: [id])
  course           Course   @relation(fields: [courseId], references: [id])
  completedLessons String[] // Array de Lesson IDs (String/cuid) marcados como concluídos
  lastLessonId     String?  // ID da última Lesson visitada (para retomar)
  updatedAt        DateTime @updatedAt
  @@unique([userId, courseId])
}

model TestResult {
  id          String   @id @default(cuid())
  userId      String
  courseId    String
  user        User     @relation(fields: [userId], references: [id])
  course      Course   @relation(fields: [courseId], references: [id])
  score       Int      // porcentagem 0–100: (respostas_corretas / total_questoes) * 100, arredondado
  answers     Json     // [{ questionIndex: number, selectedIndex: number }] — índice base-0
  completedAt DateTime @default(now())
  @@unique([userId, courseId])  // um resultado por usuário por curso
}

enum Level        { BEGINNER INTERMEDIATE ADVANCED }
enum CourseStatus { GENERATING READY FAILED }
enum LessonStatus { PENDING READY }
```

---

## Rotas da API

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/courses` | Cria curso e inicia geração | Sim |
| GET | `/api/courses` | Lista cursos (paginado, 12/página, cursor-based `?cursor=<id>`, sem filtros adicionais no MVP) | Não |
| GET | `/api/courses/[id]` | Detalhes + lições (sem `correctIndex`) | Não |
| GET | `/api/courses/[id]/stream` | SSE da geração — requer ser o criador do curso | Sim |
| POST | `/api/courses/[id]/retry` | Reinicia geração (só criador, rate limit: 3 retries/hora/curso) | Sim |
| GET | `/api/courses/[id]/quiz` | Perguntas sem `correctIndex`. Retorna 404 se `status != READY`. | Não |
| POST | `/api/courses/[id]/quiz/submit` | Valida server-side, calcula score, salva TestResult. 409 se já submetido (retorna resultado existente). | Sim |
| POST | `/api/courses/[id]/progress` | Body: `{ lessonId: string, lastLessonId: string }`. Idempotente: adiciona `lessonId` ao array `completedLessons` somente se ainda não estiver. | Sim |

**Nota SSE e Vercel:** A rota SSE deve declarar `export const maxDuration = 300` (5 min) no arquivo de rota, exigindo **Vercel Pro** ou superior. O rastreamento de "1 conexão ativa por usuário" é omitido do MVP (stateful tracking requer Redis/Supabase — complexidade desnecessária agora); múltiplas conexões do mesmo usuário ao mesmo stream são permitidas e recebem os mesmos eventos.

---

## Formulário de Geração — Home vs. /generate

- A **home** (`/`) exibe um formulário de geração simplificado (campo de tema + seletor de nível + botão)
- Se o usuário **não está logado**, o botão "Gerar" redireciona para `/login?callbackUrl=/generate` com os parâmetros do formulário preservados via query string
- Se o usuário **está logado**, o submit da home chama `POST /api/courses` diretamente (sem passar pela rota `/generate`)
- A rota `/generate` existe como página dedicada (URL compartilhável, acesso direto) mas exige sessão ativa — redireciona para login caso contrário

---

## Páginas (Next.js App Router)

| Rota | Descrição |
|------|-----------|
| `/` | Feed público de cursos + formulário de geração inline |
| `/login` | Botões Google e GitHub. Suporte a `callbackUrl`. |
| `/generate` | Página dedicada de geração (requer auth, redireciona para login) |
| `/course/[id]` | Visão geral do curso: lista de lições, status em tempo real via SSE |
| `/course/[id]/lesson/[order]` | Aula: Einstein animado + conteúdo markdown + highlight de código |
| `/course/[id]/test` | Quiz final |

---

## Personagem Einstein

SVG animado via CSS animations, sem bibliotecas externas.

| Estado | Animação | Trigger |
|--------|----------|---------|
| `idle` | Respiração suave (scaleY 3s loop) | Estado padrão |
| `thinking` | Sobrancelhas franzidas, cabeça leve inclinação | Curso em geração (`status: GENERATING`) |
| `talking` | Bigode com micro-animação sincronizada | Enquanto typewriter está ativo |
| `celebrating` | Braços levantados, bounce | Apenas na **primeira** submissão do quiz (quando `POST /api/courses/[id]/quiz/submit` retorna 200). Re-submissões retornam 409 e exibem o resultado existente diretamente, sem re-acionar a animação. |

Transição de estados controlada por prop React (`einsteinState: 'idle' | 'thinking' | 'talking' | 'celebrating'`).

**Comportamento em aula não-pronta:** Se o usuário navegar para `/course/[id]/lesson/[order]` enquanto a lição ainda tem `status: PENDING`, a página exibe Einstein em estado `thinking` com skeleton do conteúdo. A página realiza polling a cada 3s em `GET /api/courses/[id]` até que a lição esteja `READY`.

---

## Identidade Visual

**Tema:** Academia Quente (escuro)

| Token | Valor | Uso |
|-------|-------|-----|
| `bg-base` | `#0a0f0a` | Fundo da página |
| `bg-surface` | `#0d150d` | Cards, nav, painéis |
| `bg-raised` | `#111a11` | Cards elevados |
| `accent` | `#6ee89a` | CTAs, seleções ativas, progresso |
| `text-primary` | `#edeae0` | Títulos |
| `text-secondary` | `#8a9e82` | Corpo de texto |
| `text-muted` | `#3a5a40` | Labels, metadados |
| `border` | `rgba(255,255,255,0.06)` | Bordas sutis |

**Tipografia:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`

---

## Layout Mobile (< 640px)

- **Home:** formulário empilhado (input → pills de nível → botão), cards em coluna única, bottom navigation (Início / Meus cursos / Perfil)
- **Aula:** Einstein em faixa horizontal no topo com balão de fala, conteúdo rolável abaixo, botões fixos na base (Marcar concluída | Próxima)
- SSE funciona igualmente no mobile (EventSource API é suportada em todos os browsers modernos)

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Auth | NextAuth.js v5 |
| Banco | PostgreSQL via Supabase |
| ORM | Prisma |
| Streaming | Server-Sent Events (SSE) com `TransformStream` |
| Animações | CSS animations + SVG (sem dependência externa) |
| Código | React Syntax Highlighter |
| Styling | Tailwind CSS |
| Deploy | Vercel (plano Pro recomendado por causa do timeout de SSE) |
| IA | Stackspot Agent API |

---

## Variáveis de Ambiente

```env
# Auth
NEXTAUTH_URL=https://ainstein.vercel.app
NEXTAUTH_SECRET=<gerado com openssl rand -base64 32>
GOOGLE_CLIENT_ID=<Google OAuth>
GOOGLE_CLIENT_SECRET=<Google OAuth>
GITHUB_CLIENT_ID=<GitHub OAuth>
GITHUB_CLIENT_SECRET=<GitHub OAuth>

# Banco
DATABASE_URL=<Supabase PostgreSQL connection string>

# Stackspot (nunca expor no cliente)
STACKSPOT_CLIENT_ID=89077063-d725-4b43-a334-03f6d8ee54e9
STACKSPOT_CLIENT_KEY=<Vercel env vars — não commitar>
STACKSPOT_AGENT_ID=01KM708K7TMKBYPE2E3STHMV0C
```

---

## Segurança

- `STACKSPOT_CLIENT_KEY` e todas as chamadas à Stackspot são **exclusivamente server-side**
- Rotas de escrita verificam sessão via `getServerSession` antes de qualquer operação
- `correctIndex` do quiz **nunca é enviado ao cliente** — validação acontece server-side no submit
- Rate limiting em `POST /api/courses`: **5 cursos por hora por usuário** (implementado com contagem simples no Supabase — `SELECT count(*) WHERE userId = X AND createdAt > now() - interval '1 hour'`)
- Rate limiting em `POST /api/courses/[id]/retry`: **3 retries por hora por curso**
- **CSRF:** Next.js App Router + NextAuth.js v5 exigem que rotas API customizadas validem o header `Origin` contra `NEXTAUTH_URL` ou usem o token de sessão como prova de intent. Todas as rotas POST verificam a sessão via `getServerSession`, o que implicitamente mitiga CSRF (requisição cross-origin não carrega cookies de sessão válidos com `SameSite=Lax`).
- **Sanitização do campo `topic`** (aplicada apenas ao campo `topic`):
  1. Strip de tags HTML (`<`, `>` escapados)
  2. Máximo 200 caracteres (excesso truncado)
  3. Regex blocklist: `/(ignore (previous|all)|system:|<\|im_start\|>|###\s*instruction)/i` — match retorna HTTP 400 com mensagem "Tema inválido"
  4. Lista de termos explícitos de conteúdo adulto (arquivo `lib/content-blocklist.ts`) — match retorna HTTP 400 com mensagem "Tema não permitido"

---

## Tratamento de Erros

| Cenário | Comportamento |
|---------|---------------|
| Geração falha ou timeout (5 min) | `status: FAILED`; SSE emite `course_failed`; cliente exibe erro + botão "Tentar novamente" |
| Retry solicitado | `POST /api/courses/[id]/retry`; limpa Lessons e Quiz parciais; reinicia geração |
| Token Stackspot expirado | Renovação automática transparente antes de cada chamada |
| SSE desconectada pelo cliente | `EventSource` reconecta automaticamente; geração continua no servidor independentemente |
| Curso não encontrado | 404 customizado |
| Submit de quiz já realizado | 409 Conflict; retorna o resultado existente |

---

## Fora de Escopo (MVP)

- Edição ou exclusão de cursos após geração
- Busca full-text de cursos
- Notificações push quando o curso termina de gerar
- Exportação de cursos (PDF, etc.)
- Áudio / text-to-speech para o Einstein
- Administração / moderação de conteúdo por painel
