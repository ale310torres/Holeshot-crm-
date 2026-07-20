import { DataTable } from "@/components/data-table";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { createClient } from "@/lib/supabase/server";
import type { WorkOrder } from "@/lib/types";
import { date, money } from "@/lib/utils";
import { CircleCheck, CircleDollarSign, ClipboardCheck, PackageSearch, ThumbsUp, Wrench } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const { data: ordersData, error } = await supabase
    .from("work_orders")
    .select("*, customers(full_name), vehicles(make,model,year)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const orders = (ordersData ?? []) as WorkOrder[];
  const open = orders.filter((order) => !["Completed", "Cancelled"].includes(order.status));
  const recent = orders.slice(0, 8);
  const count = (status: string) => orders.filter((order) => order.status === status).length;

  return (
    <>
      <PageHeader title="Centro de operaciones" description="Una vista clara del taller, inventario y dinero en movimiento." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Órdenes activas" value={open.length} icon={Wrench} accent />
        <StatCard label="Esperando aprobación" value={count("Waiting Approval")} icon={ThumbsUp} />
        <StatCard label="Esperando piezas" value={count("Waiting Parts")} icon={PackageSearch} />
        <StatCard label="Listas para recoger" value={count("Ready for Pickup")} icon={ClipboardCheck} />
        <StatCard label="Completadas este mes" value={orders.filter((o) => o.status === "Completed" && o.completed_at && new Date(o.completed_at) >= monthStart).length} icon={CircleCheck} />
        <StatCard label="Ingreso abierto estimado" value={money(open.reduce((sum, o) => sum + Number(o.total), 0))} icon={CircleDollarSign} />
      </div>
      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-bold">Órdenes recientes</h2>
        <Link className="text-sm font-semibold text-racing-400 hover:text-racing-300" href="/work-orders">Ver todas →</Link>
      </div>
      <div className="mt-4">
        <DataTable>
          <thead><tr><th>RO</th><th>Cliente</th><th>Vehículo</th><th>Estado</th><th>Total</th><th>Creada</th></tr></thead>
          <tbody>
            {recent.map((order) => (
              <tr key={order.id}>
                <td><Link className="font-bold text-white hover:text-racing-400" href={`/work-orders/${order.id}`}>{order.ro_number}</Link></td>
                <td>{order.customers?.full_name ?? "—"}</td>
                <td>{order.vehicles ? `${order.vehicles.year ?? ""} ${order.vehicles.make} ${order.vehicles.model}` : "—"}</td>
                <td><StatusBadge status={order.status} /></td>
                <td className="font-semibold text-white">{money(order.total)}</td>
                <td>{date(order.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </>
  );
}
