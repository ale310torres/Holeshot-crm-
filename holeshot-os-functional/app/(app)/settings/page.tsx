import { signOut } from "@/app/actions";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <>
      <PageHeader title="Ajustes" description="Cuenta e integración del sistema." />
      <div className="grid max-w-4xl gap-5 md:grid-cols-2">
        <section className="panel p-5"><h2 className="font-bold">Sesión</h2><p className="mt-2 text-sm text-zinc-500">{user?.email}</p><form action={signOut} className="mt-5"><SubmitButton className="btn-secondary" pendingLabel="Cerrando...">Cerrar sesión</SubmitButton></form></section>
        <section className="panel p-5"><h2 className="font-bold">Integraciones</h2><dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Supabase</dt><dd className="text-emerald-300">Conectado</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Storage</dt><dd>work-order-media</dd></div><div className="flex justify-between"><dt className="text-zinc-500">n8n</dt><dd className="text-zinc-500">Listo para webhooks</dd></div></dl></section>
      </div>
    </>
  );
}
