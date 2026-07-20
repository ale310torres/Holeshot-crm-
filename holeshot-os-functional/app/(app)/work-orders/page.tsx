import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { WorkOrderForm } from "@/components/forms/work-order-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import { WORK_ORDER_STATUSES, type Customer, type Vehicle, type WorkOrder } from "@/lib/types";
import { date, money } from "@/lib/utils";
import Link from "next/link";

export default async function WorkOrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; error?: string; message?: string }> }) {
  const { status = "", q = "", error, message } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("work_orders").select("*, customers(full_name), vehicles(make,model,year)").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`ro_number.ilike.%${q}%,problem_description.ilike.%${q}%`);
  const [{ data, error: dbError }, { data: customers }, { data: vehicles }] = await Promise.all([
    query,
    supabase.from("customers").select("*").order("full_name"),
    supabase.from("vehicles").select("*, customers(full_name)").order("created_at", { ascending: false }),
  ]);
  if (dbError) throw new Error(dbError.message);
  const orders = (data ?? []) as WorkOrder[];

  return (
    <>
      <PageHeader title="Órdenes de trabajo" description="Del diagnóstico a la entrega, sin perder el hilo." />
      <Flash error={error} message={message} />
      <div className="grid gap-6 2xl:grid-cols-[1fr_390px]">
        <div>
          <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_220px_auto]">
            <input name="q" defaultValue={q} placeholder="RO o problema…" />
            <select name="status" defaultValue={status}><option value="">Todos los estados</option>{WORK_ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button className="btn-secondary">Filtrar</button>
          </form>
          {orders.length ? <DataTable><thead><tr><th>RO</th><th>Cliente</th><th>Vehículo</th><th>Estado</th><th>Total</th><th>Creada</th></tr></thead><tbody>
            {orders.map((o) => <tr key={o.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/work-orders/${o.id}`}>{o.ro_number}</Link></td><td>{o.customers?.full_name ?? "—"}</td><td>{o.vehicles ? `${o.vehicles.year ?? ""} ${o.vehicles.make} ${o.vehicles.model}` : "—"}</td><td><StatusBadge status={o.status} /></td><td className="font-semibold text-white">{money(o.total)}</td><td>{date(o.created_at)}</td></tr>)}
          </tbody></DataTable> : <EmptyState message="No hay órdenes con estos filtros." />}
        </div>
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Nueva orden</h2>{(customers ?? []).length && (vehicles ?? []).length ? <WorkOrderForm customers={(customers ?? []) as Customer[]} vehicles={(vehicles ?? []) as Vehicle[]} /> : <p className="text-sm text-zinc-500">Necesitas al menos un cliente y un vehículo.</p>}</aside>
      </div>
    </>
  );
}
