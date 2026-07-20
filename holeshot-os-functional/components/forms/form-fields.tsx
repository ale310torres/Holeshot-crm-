export function Field({ label, name, defaultValue, type = "text", required = false, placeholder, min, step }: {
  label: string; name: string; defaultValue?: string | number | null; type?: string; required?: boolean; placeholder?: string; min?: number; step?: string;
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} required={required} placeholder={placeholder} min={min} step={step} />
    </div>
  );
}

export function TextArea({ label, name, defaultValue, placeholder }: {
  label: string; name: string; defaultValue?: string | null; placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
    </div>
  );
}
