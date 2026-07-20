import { createLibraryEntry, updateLibraryEntry } from "@/app/actions";
import type { TechnicalEntry } from "@/lib/types";
import { Field, TextArea } from "./form-fields";
import { SubmitButton } from "./submit-button";

export function LibraryForm({ entry }: { entry?: TechnicalEntry }) {
  return (
    <form action={entry ? updateLibraryEntry : createLibraryEntry} className="grid gap-4 sm:grid-cols-2">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <Field label="Marca" name="make" defaultValue={entry?.make} required />
      <Field label="Modelo" name="model" defaultValue={entry?.model} required />
      <Field label="Año inicial" name="year_start" type="number" defaultValue={entry?.year_start} />
      <Field label="Año final" name="year_end" type="number" defaultValue={entry?.year_end} />
      <Field label="Categoría" name="category" defaultValue={entry?.category} placeholder="Motor, suspensión…" />
      <Field label="Título" name="title" defaultValue={entry?.title} />
      <Field label="Especificación" name="spec_name" defaultValue={entry?.spec_name} />
      <Field label="Valor" name="spec_value" defaultValue={entry?.spec_value} />
      <Field label="Fuente" name="source" defaultValue={entry?.source} />
      <div className="sm:col-span-2"><TextArea label="Notas" name="notes" defaultValue={entry?.notes} /></div>
      <SubmitButton className="btn-primary sm:col-span-2">
        {entry ? "Guardar cambios" : "Añadir especificación"}
      </SubmitButton>
    </form>
  );
}
