export function Flash({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <div className={`mb-5 rounded-lg border px-4 py-3 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
      {error ?? message}
    </div>
  );
}
