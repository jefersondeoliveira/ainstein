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
