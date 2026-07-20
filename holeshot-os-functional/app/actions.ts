"use server";

import { createClient } from "@/lib/supabase/server";
import { WORK_ORDER_STATUSES } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const optionalText = z.string().trim().transform((v) => v || null);
const optionalNumber = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().nullable());
const numberField = (schema: z.ZodNumber) => z.preprocess((v) => Number(v), schema);

function value(formData: FormData, key: string) {
  return formData.get(key)?.toString() ?? "";
}

function messagePath(path: string, kind: "message" | "error", text: string) {
  return `${path}${path.includes("?") ? "&" : "?"}${kind}=${encodeURIComponent(text)}`;
}

async function insert(table: string, payload: object) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).insert(payload);
  if (error) throw new Error(error.message);
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: value(formData, "email"),
    password: value(formData, "password"),
  });
  if (error) redirect(messagePath("/sign-in", "error", error.message));
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}

const customerSchema = z.object({
  full_name: z.string().trim().min(2, "El nombre es requerido."),
  phone: optionalText,
  email: z.union([z.string().trim().email(), z.literal("")]).transform((v) => v || null),
  source: optionalText,
  notes: optionalText,
});

export async function createCustomer(formData: FormData) {
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/customers", "error", parsed.error.issues[0].message));
  try {
    await insert("customers", parsed.data);
  } catch (error) {
    redirect(messagePath("/customers", "error", error instanceof Error ? error.message : "No se pudo crear."));
  }
  revalidatePath("/customers");
  redirect(messagePath("/customers", "message", "Cliente creado."));
}

export async function updateCustomer(formData: FormData) {
  const id = value(formData, "id");
  const parsed = customerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/customers/${id}`, "error", parsed.error.issues[0].message));
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(parsed.data).eq("id", id);
  if (error) redirect(messagePath(`/customers/${id}`, "error", error.message));
  revalidatePath(`/customers/${id}`);
  redirect(messagePath(`/customers/${id}`, "message", "Cliente actualizado."));
}

const vehicleSchema = z.object({
  customer_id: z.string().uuid("Selecciona un cliente."),
  make: z.string().trim().min(1, "La marca es requerida."),
  model: z.string().trim().min(1, "El modelo es requerido."),
  year: optionalNumber,
  vin: optionalText,
  engine_size: optionalText,
  vehicle_type: optionalText,
  notes: optionalText,
});

export async function createVehicle(formData: FormData) {
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/vehicles", "error", parsed.error.issues[0].message));
  try {
    await insert("vehicles", parsed.data);
  } catch (error) {
    redirect(messagePath("/vehicles", "error", error instanceof Error ? error.message : "No se pudo crear."));
  }
  revalidatePath("/vehicles");
  redirect(messagePath("/vehicles", "message", "Vehículo creado."));
}

export async function updateVehicle(formData: FormData) {
  const id = value(formData, "id");
  const parsed = vehicleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/vehicles/${id}`, "error", parsed.error.issues[0].message));
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").update(parsed.data).eq("id", id);
  if (error) redirect(messagePath(`/vehicles/${id}`, "error", error.message));
  revalidatePath(`/vehicles/${id}`);
  redirect(messagePath(`/vehicles/${id}`, "message", "Vehículo actualizado."));
}

const workOrderSchema = z.object({
  customer_id: z.string().uuid("Selecciona un cliente."),
  vehicle_id: z.string().uuid("Selecciona un vehículo."),
  problem_description: z.string().trim().min(3, "Describe el problema."),
});

export async function createWorkOrder(formData: FormData) {
  const parsed = workOrderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/work-orders", "error", parsed.error.issues[0].message));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_work_order_fast", {
    p_customer_id: parsed.data.customer_id,
    p_vehicle_id: parsed.data.vehicle_id,
    p_problem_description: parsed.data.problem_description,
  });
  if (error) redirect(messagePath("/work-orders", "error", error.message));
  revalidatePath("/work-orders");
  redirect(`/work-orders/${data}`);
}

export async function updateWorkOrderStatus(formData: FormData) {
  const id = value(formData, "id");
  const status = z.enum(WORK_ORDER_STATUSES).safeParse(value(formData, "status"));
  if (!status.success) redirect(messagePath(`/work-orders/${id}`, "error", "Estado inválido."));
  const supabase = await createClient();
  const payload = {
    status: status.data,
    approved: ["Approved", "Waiting Parts", "In Progress", "Ready for Pickup", "Completed"].includes(status.data),
    completed_at: status.data === "Completed" ? new Date().toISOString() : null,
  };
  const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
  if (error) redirect(messagePath(`/work-orders/${id}`, "error", error.message));
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dashboard");
  redirect(messagePath(`/work-orders/${id}`, "message", "Estado actualizado."));
}

export async function updateWorkOrderSummary(formData: FormData) {
  const id = value(formData, "id");
  const payload = {
    problem_description: value(formData, "problem_description"),
    diagnosis_summary: value(formData, "diagnosis_summary") || null,
  };
  const supabase = await createClient();
  const { error } = await supabase.from("work_orders").update(payload).eq("id", id);
  if (error) redirect(messagePath(`/work-orders/${id}`, "error", error.message));
  revalidatePath(`/work-orders/${id}`);
  redirect(messagePath(`/work-orders/${id}`, "message", "Resumen actualizado."));
}

const diagnosticSchema = z.object({
  symptom: optionalText,
  test_performed: optionalText,
  result: optionalText,
  suspected_cause: optionalText,
  confirmed_cause: optionalText,
  recommendation: optionalText,
});

export async function addDiagnostic(formData: FormData) {
  const id = value(formData, "work_order_id");
  const parsed = diagnosticSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/work-orders/${id}`, "error", "Revisa el diagnóstico."));
  try {
    await insert("diagnostics", { ...parsed.data, work_order_id: id });
  } catch (error) {
    redirect(messagePath(`/work-orders/${id}`, "error", error instanceof Error ? error.message : "No se pudo guardar."));
  }
  revalidatePath(`/work-orders/${id}`);
  redirect(messagePath(`/work-orders/${id}`, "message", "Diagnóstico añadido."));
}

const serviceSchema = z.object({
  service_name: z.string().trim().min(2, "El servicio requiere un nombre."),
  description: optionalText,
  labor_hours: numberField(z.number().finite().nonnegative()),
  labor_rate: numberField(z.number().finite().nonnegative()),
});

export async function addService(formData: FormData) {
  const id = value(formData, "work_order_id");
  const parsed = serviceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/work-orders/${id}`, "error", parsed.error.issues[0].message));
  try {
    await insert("work_order_services", {
      ...parsed.data,
      work_order_id: id,
      labor_total: parsed.data.labor_hours * parsed.data.labor_rate,
    });
  } catch (error) {
    redirect(messagePath(`/work-orders/${id}`, "error", error instanceof Error ? error.message : "No se pudo guardar."));
  }
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/dashboard");
  redirect(messagePath(`/work-orders/${id}`, "message", "Servicio añadido."));
}

export async function addWorkOrderPart(formData: FormData) {
  const id = value(formData, "work_order_id");
  const schema = z.object({ part_id: z.string().uuid(), quantity: numberField(z.number().int().positive()) });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/work-orders/${id}`, "error", "Selecciona una pieza y cantidad válida."));
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_work_order_part_fast", {
    p_work_order_id: id,
    p_part_id: parsed.data.part_id,
    p_quantity: parsed.data.quantity,
  });
  if (error) redirect(messagePath(`/work-orders/${id}`, "error", error.message));
  revalidatePath(`/work-orders/${id}`);
  revalidatePath("/parts");
  revalidatePath("/dashboard");
  redirect(messagePath(`/work-orders/${id}`, "message", "Pieza añadida."));
}

const partSchema = z.object({
  part_name: z.string().trim().min(2, "El nombre es requerido."),
  category: optionalText,
  brand: optionalText,
  oem_part_number: optionalText,
  aftermarket_part_number: optionalText,
  compatible_make: optionalText,
  compatible_model: optionalText,
  compatible_years: optionalText,
  cost: numberField(z.number().finite().nonnegative()),
  sale_price: numberField(z.number().finite().nonnegative()),
  quantity: numberField(z.number().int().nonnegative()),
  shelf_location: optionalText,
  supplier: optionalText,
});

export async function createPart(formData: FormData) {
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/parts", "error", parsed.error.issues[0].message));
  try {
    await insert("parts", parsed.data);
  } catch (error) {
    redirect(messagePath("/parts", "error", error instanceof Error ? error.message : "No se pudo crear."));
  }
  revalidatePath("/parts");
  redirect(messagePath("/parts", "message", "Pieza creada."));
}

export async function updatePart(formData: FormData) {
  const id = value(formData, "id");
  const parsed = partSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/parts/${id}`, "error", parsed.error.issues[0].message));
  const supabase = await createClient();
  const { error } = await supabase.from("parts").update(parsed.data).eq("id", id);
  if (error) redirect(messagePath(`/parts/${id}`, "error", error.message));
  revalidatePath("/parts");
  redirect(messagePath(`/parts/${id}`, "message", "Pieza actualizada."));
}

const librarySchema = z.object({
  make: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year_start: optionalNumber,
  year_end: optionalNumber,
  category: optionalText,
  title: optionalText,
  spec_name: optionalText,
  spec_value: optionalText,
  notes: optionalText,
  source: optionalText,
});

export async function createLibraryEntry(formData: FormData) {
  const parsed = librarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath("/library", "error", "Marca y modelo son requeridos."));
  try {
    await insert("technical_library", parsed.data);
  } catch (error) {
    redirect(messagePath("/library", "error", error instanceof Error ? error.message : "No se pudo crear."));
  }
  revalidatePath("/library");
  redirect(messagePath("/library", "message", "Especificación creada."));
}

export async function updateLibraryEntry(formData: FormData) {
  const id = value(formData, "id");
  const parsed = librarySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(messagePath(`/library/${id}`, "error", "Marca y modelo son requeridos."));
  const supabase = await createClient();
  const { error } = await supabase.from("technical_library").update(parsed.data).eq("id", id);
  if (error) redirect(messagePath(`/library/${id}`, "error", error.message));
  revalidatePath("/library");
  redirect(messagePath(`/library/${id}`, "message", "Entrada actualizada."));
}

export async function uploadMedia(formData: FormData) {
  const workOrderId = value(formData, "work_order_id") || null;
  const vehicleId = value(formData, "vehicle_id") || null;
  const returnPath = workOrderId ? `/work-orders/${workOrderId}` : `/vehicles/${vehicleId}`;
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(messagePath(returnPath, "error", "Selecciona un archivo."));
  if (file.size > 10 * 1024 * 1024) redirect(messagePath(returnPath, "error", "El archivo excede 10 MB."));

  const supabase = await createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${workOrderId ?? vehicleId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage.from("work-order-media").upload(path, file, { contentType: file.type });
  if (uploadError) redirect(messagePath(returnPath, "error", uploadError.message));
  const { data } = supabase.storage.from("work-order-media").getPublicUrl(path);
  const { error } = await supabase.from("media_files").insert({
    work_order_id: workOrderId,
    vehicle_id: vehicleId,
    file_url: data.publicUrl,
    file_type: file.type,
    label: value(formData, "label") || file.name,
    notes: value(formData, "notes") || null,
  });
  if (error) redirect(messagePath(returnPath, "error", error.message));
  revalidatePath(returnPath);
  redirect(messagePath(returnPath, "message", "Archivo subido."));
}

async function deleteRow(table: string, id: string, returnPath: string) {
  const supabase = await createClient();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) redirect(messagePath(returnPath, "error", error.message));
  revalidatePath(returnPath);
  redirect(messagePath(returnPath, "message", "Registro eliminado."));
}

export async function deleteCustomer(formData: FormData) {
  await deleteRow("customers", value(formData, "id"), "/customers");
}

export async function deleteVehicle(formData: FormData) {
  await deleteRow("vehicles", value(formData, "id"), "/vehicles");
}

export async function deleteWorkOrder(formData: FormData) {
  await deleteRow("work_orders", value(formData, "id"), "/work-orders");
}

export async function deletePart(formData: FormData) {
  await deleteRow("parts", value(formData, "id"), "/parts");
}

export async function deleteLibraryEntry(formData: FormData) {
  await deleteRow("technical_library", value(formData, "id"), "/library");
}
