import { signIn } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(240,68,32,.15),transparent_35%)] p-4">
      <div className="panel w-full max-w-md p-8">
        <div className="mb-8">
          <div className="text-2xl font-black italic">HOLESHOT <span className="text-racing-500">OS</span></div>
          <p className="mt-2 text-sm text-zinc-500">Acceso al centro de operaciones.</p>
        </div>
        {error && <p className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}
        <form action={signIn} className="space-y-4">
          <div><label htmlFor="email">Email</label><input id="email" name="email" type="email" required autoComplete="email" /></div>
          <div><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" required autoComplete="current-password" /></div>
          <SubmitButton className="btn-primary w-full" pendingLabel="Entrando...">
            Entrar al sistema
          </SubmitButton>
        </form>
      </div>
    </main>
  );
}
