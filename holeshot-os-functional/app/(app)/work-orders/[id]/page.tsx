import { addDiagnostic, addService, addWorkOrderPart, updateWorkOrderStatus, updateWorkOrderSummary, uploadMedia } from "@/app/actions";
import { EmptyState } from "@/components/empty-state";
import { DeleteButton } from "@/components/delete-button";
import { Flash } from "@/components/flash";
import { Field, TextArea } from "@/components/forms/form-fields";
import { SubmitButton } from "@/components/forms/submit-button";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { WORK_ORDER_STATUSES, type Part, type WorkOrder } from "@/lib/types";
import { date, money } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

interface Diagnostic { id: string; symptom: string | null; test_performed: string | null; result: string | null; confirmed_cause: string | null; recommendation: string | null; created_at: string }
interface Service { id: string; service_name: string; description: string | null; labor_hours: number; labor_rate: number; labor_total: number; status: string }
interface UsedPart { id: string; quantity: number; unit_price: number; total: number; parts: Pick<Part, "part_name" | "brand" | "oem_part_number"> | null }
interface Media { id: string; file_url: string; label: string | null; file_type: string | null; created_at: string }

export default async function WorkOrderDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: order }, { data: diagnostics }, { data: services }, { data: usedParts }, { data: parts }, { data: media }] = await Promise.all([
    supabase.from("work_orders").select("*, customers(full_name,phone,email), vehicles(make,model,year,vin)").eq("id", id).single(),
    supabase.from("diagnostics").select("*").eq("work_order_id", id).order("created_at", { ascending: false }),
    supabase.from("work_order_services").select("*").eq("work_order_id", id).order("created_at"),
    supabase.from("work_order_parts").select("*, parts(part_name,brand,oem_part_number)").eq("work_order_id", id).order("created_at"),
    supabase.from("parts").select("*").gt("quantity", 0).order("part_name"),
    supabase.from("media_files").select("*").eq("work_order_id", id).order("created_at", { ascending: false }),
  ]);
  if (!order) notFound();
  const ro = order as WorkOrder;

  return (
    <>
      <PageHeader title={ro.ro_number} description={`${ro.vehicles?.year ?? ""} ${ro.vehicles?.make ?? ""} ${ro.vehicles?.model ?? ""}`} action={<div className="flex items-center gap-2"><StatusBadge status={ro.status} /><DeleteButton id={id} kind="workOrder" /><Link className="btn-secondary" href="/work-orders">← Órdenes</Link></div>} />
      <Flash {...flash} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="panel p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Cliente</p><p className="mt-2 font-bold text-white">{ro.customers?.full_name}</p><p className="mt-1 text-sm text-zinc-400">{ro.customers?.phone ?? "Sin teléfono"} · {ro.customers?.email ?? "Sin email"}</p></div>
        <div className="panel p-5"><p className="text-xs uppercase tracking-wider text-zinc-500">Vehículo</p><p className="mt-2 font-bold text-white">{ro.vehicles?.year} {ro.vehicles?.make} {ro.vehicles?.model}</p><p className="mt-1 text-sm text-zinc-400">VIN {ro.vehicles?.vin ?? "—"}</p></div>
        <form action={updateWorkOrderStatus} className="panel p-5"><input type="hidden" name="id" value={id} /><label htmlFor="status">Estado</label><div className="flex gap-2"><select id="status" name="status" defaultValue={ro.status}>{WORK_ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select><SubmitButton pendingLabel="Actualizando...">Actualizar</SubmitButton></div></form>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="panel p-5"><h2 className="mb-4 font-bold">Problema y resumen</h2><form action={updateWorkOrderSummary} className="space-y-4"><input type="hidden" name="id" value={id} /><TextArea label="Problema reportado" name="problem_description" defaultValue={ro.problem_description} /><TextArea label="Resumen de diagnóstico" name="diagnosis_summary" defaultValue={ro.diagnosis_summary} /><SubmitButton className="btn-secondary">Guardar resumen</SubmitButton></form></section>

          <section className="panel p-5"><h2 className="mb-4 font-bold">Diagnósticos</h2>
            {(diagnostics ?? []).length ? <div className="mb-5 space-y-3">{(diagnostics as Diagnostic[]).map((d) => <div key={d.id} className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4"><div className="flex justify-between gap-4"><p className="font-semibold text-white">{d.symptom ?? "Entrada de diagnóstico"}</p><span className="text-xs text-zinc-600">{date(d.created_at)}</span></div><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-zinc-600">Prueba</dt><dd>{d.test_performed ?? "—"}</dd></div><div><dt className="text-zinc-600">Resultado</dt><dd>{d.result ?? "—"}</dd></div><div><dt className="text-zinc-600">Causa confirmada</dt><dd>{d.confirmed_cause ?? "—"}</dd></div><div><dt className="text-zinc-600">Recomendación</dt><dd>{d.recommendation ?? "—"}</dd></div></dl></div>)}</div> : <div className="mb-5"><EmptyState message="Todavía no hay entradas de diagnóstico." /></div>}
            <form action={addDiagnostic} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="work_order_id" value={id} /><Field label="Síntoma" name="symptom" /><Field label="Prueba realizada" name="test_performed" /><Field label="Resultado" name="result" /><Field label="Causa sospechada" name="suspected_cause" /><Field label="Causa confirmada" name="confirmed_cause" /><Field label="Recomendación" name="recommendation" /><SubmitButton className="btn-primary sm:col-span-2">Añadir diagnóstico</SubmitButton></form>
          </section>

          <section className="panel p-5"><h2 className="mb-4 font-bold">Servicios y labor</h2>
            <div className="mb-5 space-y-2">{(services as Service[] | null)?.map((s) => <div key={s.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3"><div><p className="font-semibold">{s.service_name}</p><p className="text-xs text-zinc-500">{s.labor_hours} h × {money(s.labor_rate)}</p></div><strong>{money(s.labor_total)}</strong></div>)}</div>
            <form action={addService} className="grid gap-3 sm:grid-cols-2"><input type="hidden" name="work_order_id" value={id} /><Field label="Servicio" name="service_name" required /><Field label="Descripción" name="description" /><Field label="Horas" name="labor_hours" type="number" min={0} step="0.25" defaultValue={1} required /><Field label="Tarifa por hora" name="labor_rate" type="number" min={0} step="0.01" defaultValue={85} required /><SubmitButton className="btn-primary sm:col-span-2">Añadir servicio</SubmitButton></form>
          </section>

          <section className="panel p-5"><h2 className="mb-4 font-bold">Piezas usadas</h2>
            <div className="mb-5 space-y-2">{(usedParts as UsedPart[] | null)?.map((item) => <div key={item.id} className="flex items-center justify-between rounded-lg border border-zinc-800 p-3"><div><p className="font-semibold">{item.parts?.part_name ?? "Pieza"}</p><p className="text-xs text-zinc-500">{item.quantity} × {money(item.unit_price)} · {item.parts?.brand}</p></div><strong>{money(item.total)}</strong></div>)}</div>
            <form action={addWorkOrderPart} className="grid gap-3 sm:grid-cols-[1fr_100px_auto]"><input type="hidden" name="work_order_id" value={id} /><div><label htmlFor="part_id">Pieza de inventario</label><select id="part_id" name="part_id" required><option value="">Selecciona…</option>{(parts as Part[] | null)?.map((p) => <option key={p.id} value={p.id}>{p.part_name} ({p.quantity}) — {money(p.sale_price)}</option>)}</select></div><Field label="Cantidad" name="quantity" type="number" min={1} step="1" defaultValue={1} required /><SubmitButton className="btn-primary self-end">Añadir</SubmitButton></form>
          </section>

          <section className="panel p-5"><h2 className="mb-4 font-bold">Fotos y documentos</h2>
            <form action={uploadMedia} className="mb-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]" encType="multipart/form-data"><input type="hidden" name="work_order_id" value={id} /><input name="label" placeholder="Etiqueta" /><input type="file" name="file" accept="image/*,.pdf" required /><SubmitButton pendingLabel="Subiendo...">Subir</SubmitButton></form>
            {(media ?? []).length ? <div className="grid gap-3 sm:grid-cols-3">{(media as Media[]).map((m) => <a className="rounded-lg border border-zinc-800 p-3 hover:border-racing-500/50" href={m.file_url} target="_blank" key={m.id}><p className="truncate font-semibold">{m.label}</p><p className="mt-1 text-xs text-zinc-600">{m.file_type}</p></a>)}</div> : <p className="text-sm text-zinc-600">Sin archivos.</p>}
          </section>
        </div>

        <aside className="h-fit xl:sticky xl:top-6">
          <div className="panel overflow-hidden">
            <div className="border-b border-zinc-800 p-5"><h2 className="font-bold">Cotización actual</h2><p className="mt-1 text-xs text-zinc-500">Se recalcula automáticamente</p></div>
            <dl className="space-y-3 p-5 text-sm"><div className="flex justify-between"><dt className="text-zinc-500">Labor</dt><dd>{money(ro.labor_total)}</dd></div><div className="flex justify-between"><dt className="text-zinc-500">Piezas</dt><dd>{money(ro.parts_total)}</dd></div><div className="flex justify-between border-t border-zinc-800 pt-4 text-lg font-black"><dt>Total</dt><dd className="text-racing-400">{money(ro.total)}</dd></div></dl>
          </div>
          <p className="mt-3 text-center text-xs text-zinc-600">Orden creada {date(ro.created_at)}</p>
        </aside>
      </div>
    </>
  );
}
