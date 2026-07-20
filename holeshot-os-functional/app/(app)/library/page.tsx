import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { LibraryForm } from "@/components/forms/library-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { TechnicalEntry } from "@/lib/types";
import Link from "next/link";

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; error?: string; message?: string }> }) {
  const { q = "", category = "", error, message } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("technical_library").select("*").order("make").order("model");
  if (q) query = query.or(`make.ilike.%${q}%,model.ilike.%${q}%,title.ilike.%${q}%,spec_name.ilike.%${q}%,spec_value.ilike.%${q}%`);
  if (category) query = query.eq("category", category);
  const { data, error: dbError } = await query;
  if (dbError) throw new Error(dbError.message);
  const entries = (data ?? []) as TechnicalEntry[];
  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))] as string[];

  return (
    <>
      <PageHeader title="Biblioteca técnica" description="Especificaciones verificables, organizadas por unidad y categoría." />
      <Flash error={error} message={message} />
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div>
          <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_190px_auto]"><input name="q" defaultValue={q} placeholder="Marca, modelo o especificación…" /><select name="category" defaultValue={category}><option value="">Todas las categorías</option>{categories.map((c) => <option key={c}>{c}</option>)}</select><button className="btn-secondary">Buscar</button></form>
          {entries.length ? <div className="grid gap-3 md:grid-cols-2">{entries.map((entry) => <Link href={`/library/${entry.id}`} key={entry.id} className="panel block p-5 transition hover:border-racing-500/40"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-white">{entry.make} {entry.model}</p><p className="text-xs text-zinc-500">{entry.year_start ?? "—"}{entry.year_end && entry.year_end !== entry.year_start ? `–${entry.year_end}` : ""} · {entry.category ?? "General"}</p></div><span className="rounded bg-zinc-950 px-2 py-1 text-[10px] uppercase tracking-wider text-racing-400">{entry.category ?? "Spec"}</span></div><div className="mt-4 border-t border-zinc-800 pt-4"><p className="text-xs uppercase tracking-wide text-zinc-600">{entry.spec_name ?? entry.title ?? "Entrada técnica"}</p><p className="mt-1 text-lg font-black">{entry.spec_value ?? "Ver notas"}</p></div></Link>)}</div> : <EmptyState message="No encontramos especificaciones." />}
        </div>
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Nueva especificación</h2><LibraryForm /></aside>
      </div>
    </>
  );
}
