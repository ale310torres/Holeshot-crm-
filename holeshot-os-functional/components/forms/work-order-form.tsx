import { createWorkOrder } from "@/app/actions";
import type { Customer, Vehicle } from "@/lib/types";
import { TextArea } from "./form-fields";
import { SubmitButton } from "./submit-button";

export function WorkOrderForm({ customers, vehicles }: { customers: Customer[]; vehicles: Vehicle[] }) {
  return (
    <form action={createWorkOrder} className="space-y-4">
      <div><label htmlFor="customer_id">Cliente</label><select id="customer_id" name="customer_id" required><option value="">Selecciona…</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
      <div><label htmlFor="vehicle_id">Vehículo</label><select id="vehicle_id" name="vehicle_id" required><option value="">Selecciona…</option>{vehicles.map((v) => <option key={v.id} value={v.id}>{v.year ?? ""} {v.make} {v.model} — {v.customers?.full_name ?? ""}</option>)}</select></div>
      <TextArea label="Problema reportado" name="problem_description" placeholder="Síntomas, solicitud del cliente…" />
      <SubmitButton className="btn-primary w-full" pendingLabel="Abriendo orden...">
        Abrir orden
      </SubmitButton>
    </form>
  );
}
