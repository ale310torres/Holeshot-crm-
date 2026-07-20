import { createPart, updatePart } from "@/app/actions";
import type { Part } from "@/lib/types";
import { Field } from "./form-fields";
import { SubmitButton } from "./submit-button";

export function PartForm({ part }: { part?: Part }) {
  return (
    <form action={part ? updatePart : createPart} className="grid gap-4 sm:grid-cols-2">
      {part && <input type="hidden" name="id" value={part.id} />}
      <Field label="Nombre" name="part_name" defaultValue={part?.part_name} required />
      <Field label="Marca" name="brand" defaultValue={part?.brand} />
      <Field label="Categoría" name="category" defaultValue={part?.category} />
      <Field label="OEM #" name="oem_part_number" defaultValue={part?.oem_part_number} />
      <Field label="Aftermarket #" name="aftermarket_part_number" defaultValue={part?.aftermarket_part_number} />
      <Field label="Proveedor" name="supplier" defaultValue={part?.supplier} />
      <Field label="Marca compatible" name="compatible_make" defaultValue={part?.compatible_make} />
      <Field label="Modelo compatible" name="compatible_model" defaultValue={part?.compatible_model} />
      <Field label="Años compatibles" name="compatible_years" defaultValue={part?.compatible_years} />
      <Field label="Ubicación" name="shelf_location" defaultValue={part?.shelf_location} />
      <Field label="Costo" name="cost" type="number" min={0} step="0.01" defaultValue={part?.cost ?? 0} required />
      <Field label="Precio" name="sale_price" type="number" min={0} step="0.01" defaultValue={part?.sale_price ?? 0} required />
      <Field label="Cantidad" name="quantity" type="number" min={0} step="1" defaultValue={part?.quantity ?? 0} required />
      <SubmitButton className="btn-primary sm:col-span-2">
        {part ? "Guardar cambios" : "Añadir pieza"}
      </SubmitButton>
    </form>
  );
}
