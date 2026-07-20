"use client";

import {
  deleteCustomer,
  deleteLibraryEntry,
  deletePart,
  deleteVehicle,
  deleteWorkOrder,
} from "@/app/actions";
import { useFormStatus } from "react-dom";

const actions = {
  customer: deleteCustomer,
  vehicle: deleteVehicle,
  workOrder: deleteWorkOrder,
  part: deletePart,
  library: deleteLibraryEntry,
};

export function DeleteButton({ id, kind }: { id: string; kind: keyof typeof actions }) {
  return (
    <form
      action={actions[kind]}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar este registro? Esta acción no se puede deshacer.")) event.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <DeleteSubmitButton />
    </form>
  );
}

function DeleteSubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      aria-disabled={pending}
      className="btn-secondary border-red-500/30 text-red-300 hover:bg-red-500/10"
      disabled={pending}
      type="submit"
    >
      {pending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
