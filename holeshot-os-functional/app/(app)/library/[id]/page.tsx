import { Flash } from "@/components/flash";
import { DeleteButton } from "@/components/delete-button";
import { LibraryForm } from "@/components/forms/library-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { TechnicalEntry } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function LibraryDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.from("technical_library").select("*").eq("id", id).single();
  if (!data) notFound();
  const entry = data as TechnicalEntry;
  return <><PageHeader title={`${entry.make} ${entry.model}`} description="Editar entrada de la biblioteca técnica." action={<div className="flex gap-2"><DeleteButton id={id} kind="library" /><Link href="/library" className="btn-secondary">← Biblioteca</Link></div>} /><Flash {...flash} /><div className="panel max-w-3xl p-6"><LibraryForm entry={entry} /></div></>;
}
