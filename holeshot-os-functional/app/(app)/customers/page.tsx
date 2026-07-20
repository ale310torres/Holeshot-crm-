import { DataTable } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { Flash } from "@/components/flash";
import { CustomerForm } from "@/components/forms/customer-form";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";
import { date } from "@/lib/utils";
import Link from "next/link";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string; message?: string }> }) {
  const { q = "", error, message } = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("customers").select("*").order("created_at", { ascending: false });
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%`);
  const { data, error: dbError } = await query;
  if (dbError) throw new Error(dbError.message);
  const customers = (data ?? []) as Customer[];

  return (
    <>
      <PageHeader title="Clientes" description="Personas, contacto y relación completa con el taller." />
      <Flash error={error} message={message} />
      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <div>
          <form className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder="Buscar nombre, teléfono o email…" /><button className="btn-secondary" type="submit">Buscar</button></form>
          {customers.length ? (
            <DataTable>
              <thead><tr><th>Cliente</th><th>Teléfono</th><th>Email</th><th>Origen</th><th>Desde</th></tr></thead>
              <tbody>{customers.map((customer) => (
                <tr key={customer.id}>
                  <td><Link href={`/customers/${customer.id}`} className="font-bold text-white hover:text-racing-400">{customer.full_name}</Link></td>
                  <td>{customer.phone ?? "—"}</td><td>{customer.email ?? "—"}</td><td>{customer.source ?? "—"}</td><td>{date(customer.created_at)}</td>
                </tr>
              ))}</tbody>
            </DataTable>
          ) : <EmptyState message="No encontramos clientes con ese criterio." />}
        </div>
        <aside className="panel h-fit p-5"><h2 className="mb-5 font-bold">Nuevo cliente</h2><CustomerForm /></aside>
      </div>
    </>
  );
}
