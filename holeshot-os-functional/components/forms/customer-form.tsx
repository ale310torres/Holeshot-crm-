import { createCustomer, updateCustomer } from "@/app/actions";
import type { Customer } from "@/lib/types";
import { Field, TextArea } from "./form-fields";
import { SubmitButton } from "./submit-button";

export function CustomerForm({ customer }: { customer?: Customer }) {
  return (
    <form action={customer ? updateCustomer : createCustomer} className="grid gap-4 sm:grid-cols-2">
      {customer && <input type="hidden" name="id" value={customer.id} />}
      <Field label="Nombre completo" name="full_name" defaultValue={customer?.full_name} required />
      <Field label="Teléfono" name="phone" type="tel" defaultValue={customer?.phone} />
      <Field label="Email" name="email" type="email" defaultValue={customer?.email} />
      <Field label="Origen" name="source" defaultValue={customer?.source} placeholder="Referido, Instagram…" />
      <div className="sm:col-span-2"><TextArea label="Notas" name="notes" defaultValue={customer?.notes} /></div>
      <SubmitButton className="btn-primary sm:col-span-2">
        {customer ? "Guardar cambios" : "Crear cliente"}
      </SubmitButton>
    </form>
  );
}
