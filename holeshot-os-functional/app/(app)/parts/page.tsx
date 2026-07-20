import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { PartForm } from "@/components/forms/part-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { Part } from "@/lib/types";
import { money } from "@/lib/utils";
import Link from "next/link";

export default async function PartsPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; message?: string }> }) {
  const { q = "", error, message } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("parts").select("*").order("part_name");
  if (q) query = query.or(`part_name.ilike.%${q}%,brand.ilike.%${q}%,oem_part_number.ilike.%${q}%,aftermarket_part_number.ilike.%${q}%`);
  const { data, error: dbError } = await query;
  if (dbError) throw new Error(dbError.message);
  const parts = (data ?? []) as Part[];
  return (
    <>
      <PageHeader title="Piezas e inventario" description="Existencias, compatibilidad, costo y precio de venta." />
      <Flash error={error} message={message} />
      <div className="grid gap-6 2xl:grid-cols-[1fr_390px]">
        <div><form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Nombre, marca, OEM o aftermarket…" /><button className="btn-secondary">Buscar</button></form>
          {parts.length ? <DataTable><thead><tr><th>Pieza</th><th>Números</th><th>Ubicación</th><th>Existencia</th><th>Costo</th><th>Precio</th></tr></thead><tbody>{parts.map((p) => <tr key={p.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/parts/${p.id}`}>{p.part_name}</Link><div className="text-xs text-zinc-600">{p.brand}</div></td><td><div>{p.oem_part_number ?? "—"}</div><div className="text-xs text-zinc-600">{p.aftermarket_part_number}</div></td><td>{p.shelf_location ?? "—"}</td><td><span className={`rounded-full px-2 py-1 text-xs font-bold ${p.quantity <= 1 ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>{p.quantity}{p.quantity <= 1 ? " · BAJO" : ""}</span></td><td>{money(p.cost)}</td><td className="font-semibold text-white">{money(p.sale_price)}</td></tr>)}</tbody></DataTable> : <EmptyState message="No encontramos piezas." />}</div>
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Añadir pieza</h2><PartForm /></aside>
      </div>
    </>
  );
}
