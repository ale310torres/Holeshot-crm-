import { createVehicle, updateVehicle } from "@/app/actions";
import type { Customer, Vehicle } from "@/lib/types";
import { Field, TextArea } from "./form-fields";
import { SubmitButton } from "./submit-button";

export function VehicleForm({ customers, vehicle }: { customers: Customer[]; vehicle?: Vehicle }) {
  return (
    <form action={vehicle ? updateVehicle : createVehicle} className="grid gap-4 sm:grid-cols-2">
      {vehicle && <input type="hidden" name="id" value={vehicle.id} />}
      <div className="sm:col-span-2">
        <label htmlFor="customer_id">Cliente</label>
        <select id="customer_id" name="customer_id" defaultValue={vehicle?.customer_id} required>
          <option value="">Selecciona…</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name}</option>)}
        </select>
      </div>
      <Field label="Marca" name="make" defaultValue={vehicle?.make} required />
      <Field label="Modelo" name="model" defaultValue={vehicle?.model} required />
      <Field label="Año" name="year" type="number" defaultValue={vehicle?.year} />
      <Field label="Tipo" name="vehicle_type" defaultValue={vehicle?.vehicle_type} placeholder="Motocross, ATV, UTV…" />
      <Field label="VIN" name="vin" defaultValue={vehicle?.vin} />
      <Field label="Cilindrada" name="engine_size" defaultValue={vehicle?.engine_size} placeholder="450 cc" />
      <div className="sm:col-span-2"><TextArea label="Notas" name="notes" defaultValue={vehicle?.notes} /></div>
      <SubmitButton className="btn-primary sm:col-span-2">
        {vehicle ? "Guardar cambios" : "Crear vehículo"}
      </SubmitButton>
    </form>
  );
}
