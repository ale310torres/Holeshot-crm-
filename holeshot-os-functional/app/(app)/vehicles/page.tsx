import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { Customer, Vehicle } from "@/lib/types";
import Link from "next/link";

export default async function VehiclesPage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; error?: string; message?: string }> }) {
  const { q = "", type = "", error, message } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("vehicles").select("*, customers(full_name)").order("created_at", { ascending: false });
  if (q) query = query.or(`make.ilike.%${q}%,model.ilike.%${q}%,vin.ilike.%${q}%`);
  if (type) query = query.eq("vehicle_type", type);
  const [{ data, error: dbError }, { data: customerData }] = await Promise.all([
    query,
    supabase.from("customers").select("*").order("full_name"),
  ]);
  if (dbError) throw new Error(dbError.message);
  const vehicles = (data ?? []) as Vehicle[];
  const customers = (customerData ?? []) as Customer[];

  return (
    <>
      <PageHeader title="Vehículos" description="Unidades, propietarios e historial de taller." />
      <Flash error={error} message={message} />
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div>
          <form className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
            <input name="q" defaultValue={q} placeholder="Marca, modelo o VIN…" />
            <select name="type" defaultValue={type}><option value="">Todos los tipos</option><option>Motocross</option><option>ATV</option><option>UTV</option><option>Motorcycle</option></select>
            <button className="btn-secondary">Filtrar</button>
          </form>
          {vehicles.length ? <DataTable><thead><tr><th>Vehículo</th><th>Cliente</th><th>Tipo</th><th>Motor</th><th>VIN</th></tr></thead><tbody>
            {vehicles.map((vehicle) => <tr key={vehicle.id}><td><Link className="font-bold text-white hover:text-racing-400" href={`/vehicles/${vehicle.id}`}>{vehicle.year ?? ""} {vehicle.make} {vehicle.model}</Link></td><td>{vehicle.customers?.full_name ?? "—"}</td><td>{vehicle.vehicle_type ?? "—"}</td><td>{vehicle.engine_size ?? "—"}</td><td>{vehicle.vin ?? "—"}</td></tr>)}
          </tbody></DataTable> : <EmptyState message="No encontramos vehículos." />}
        </div>
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Nuevo vehículo</h2>{customers.length ? <VehicleForm customers={customers} /> : <p className="text-sm text-zinc-500">Crea un cliente antes de añadir su vehículo.</p>}</aside>
      </div>
    </>
  );
}
