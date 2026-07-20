import { Flash } from "@/components/flash";
import { DeleteButton } from "@/components/delete-button";
import { PartForm } from "@/components/forms/part-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { Part } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function PartDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data } = await supabase.from("parts").select("*").eq("id", id).single();
  if (!data) notFound();
  const part = data as Part;
  return <><PageHeader title={part.part_name} description="Editar inventario y datos de la pieza." action={<div className="flex gap-2"><DeleteButton id={id} kind="part" /><Link href="/parts" className="btn-secondary">← Inventario</Link></div>} /><Flash {...flash} /><div className="panel max-w-3xl p-6"><PartForm part={part} /></div></>;
}
