import { DataTable } from "@/components/data-table";
import { DeleteButton } from "@/components/delete-button";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Vehicle, WorkOrder } from "@/lib/types";
import { date, money } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function CustomerDetail({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const [{ id }, flash] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const [{ data: customer }, { data: vehicles }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).single(),
    supabase.from("vehicles").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
    supabase.from("work_orders").select("*, vehicles(make,model,year)").eq("customer_id", id).order("created_at", { ascending: false }),
  ]);
  if (!customer) notFound();

  return (
    <>
      <PageHeader title={(customer as Customer).full_name} description="Ficha de cliente, vehículos e historial de servicio." action={<div className="flex gap-2"><DeleteButton id={id} kind="customer" /><Link className="btn-secondary" href="/customers">← Clientes</Link></div>} />
      <Flash {...flash} />
      <div className="grid gap-6 xl:grid-cols-[390px_1fr]">
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Información</h2><CustomerForm customer={customer as Customer} /></aside>
        <div className="space-y-7">
          <section><h2 className="mb-3 font-bold">Vehículos</h2>
            {(vehicles ?? []).length ? <DataTable><thead><tr><th>Vehículo</th><th>Tipo</th><th>VIN</th><th>Añadido</th></tr></thead><tbody>
              {(vehicles as Vehicle[]).map((vehicle) => <tr key={vehicle.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/vehicles/${vehicle.id}`}>{vehicle.year} {vehicle.make} {vehicle.model}</Link></td><td>{vehicle.vehicle_type ?? "—"}</td><td>{vehicle.vin ?? "—"}</td><td>{date(vehicle.created_at)}</td></tr>)}
            </tbody></DataTable> : <EmptyState message="Este cliente aún no tiene vehículos." />}</section>
          <section><h2 className="mb-3 font-bold">Órdenes de trabajo</h2>
            {(orders ?? []).length ? <DataTable><thead><tr><th>RO</th><th>Vehículo</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead><tbody>
              {(orders as WorkOrder[]).map((order) => <tr key={order.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/work-orders/${order.id}`}>{order.ro_number}</Link></td><td>{order.vehicles?.make} {order.vehicles?.model}</td><td><StatusBadge status={order.status} /></td><td>{money(order.total)}</td><td>{date(order.created_at)}</td></tr>)}
            </tbody></DataTable> : <EmptyState message="No hay órdenes para este cliente." />}</section>
        </div>
      </div>
    </>
  );
}
