import { uploadMedia } from "@/app/actions";
import { DataTable } from "@/components/data-table";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { SubmitButton } from "@/components/forms/submit-button";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Vehicle, WorkOrder } from "@/lib/types";
import { date, money } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Media { id: string; file_url: string; label: string | null; file_type: string | null; created_at: string }

export default async function VehicleDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: vehicle }, { data: customers }, { data: orders }, { data: media }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).single(),
    supabase.from("customers").select("*").order("full_name"),
    supabase.from("work_orders").select("*").eq("vehicle_id", id).order("created_at", { ascending: false }),
    supabase.from("media_files").select("*").eq("vehicle_id", id).order("created_at", { ascending: false }),
  ]);
  if (!vehicle) notFound();
  const v = vehicle as Vehicle;
  return (
    <>
      <PageHeader title={`${v.year ?? ""} ${v.make} ${v.model}`} description={v.vin ? `VIN ${v.vin}` : "Ficha e historial del vehículo"} action={<div className="flex gap-2"><DeleteButton id={id} kind="vehicle" /><Link className="btn-secondary" href="/vehicles">← Vehículos</Link></div>} />
      <Flash {...flash} />
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Información</h2><VehicleForm vehicle={v} customers={(customers ?? []) as Customer[]} /></aside>
        <div className="space-y-7">
          <section><h2 className="mb-3 font-bold">Historial de trabajo</h2>
            {(orders ?? []).length ? <DataTable><thead><tr><th>RO</th><th>Estado</th><th>Problema</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
              {(orders as WorkOrder[]).map((o) => <tr key={o.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/work-orders/${o.id}`}>{o.ro_number}</Link></td><td><StatusBadge status={o.status} /></td><td className="max-w-xs truncate">{o.problem_description}</td><td>{money(o.total)}</td><td>{date(o.created_at)}</td></tr>)}
            </tbody></DataTable> : <EmptyState message="Este vehículo aún no tiene historial." />}</section>
          <section><h2 className="mb-3 font-bold">Fotos y documentos</h2>
            <form action={uploadMedia} className="panel mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]" encType="multipart/form-data">
              <input type="hidden" name="vehicle_id" value={id} /><input name="label" placeholder="Etiqueta" /><input name="file" type="file" accept="image/*,.pdf" required /><SubmitButton pendingLabel="Subiendo...">Subir</SubmitButton>
            </form>
            {(media ?? []).length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{(media as Media[]).map((item) => <a key={item.id} href={item.file_url} target="_blank" className="panel block p-4 hover:border-racing-500/50"><p className="truncate font-semibold">{item.label ?? "Archivo"}</p><p className="mt-1 text-xs text-zinc-500">{item.file_type} · {date(item.created_at)}</p></a>)}</div> : <EmptyState message="No hay archivos para este vehículo." />}
          </section>
        </div>
      </div>
    </>
  );
}
