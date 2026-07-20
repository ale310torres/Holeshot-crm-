export function money(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value ?? 0));
}

export function date(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PR", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function compact(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}
