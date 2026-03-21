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
