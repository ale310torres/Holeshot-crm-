import type { LucideIcon } from "lucide-react";

export function StatCard({ label, value, icon: Icon, accent = false }: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
          <p className={`mt-2 text-3xl font-black tracking-tight ${accent ? "text-racing-400" : "text-white"}`}>{value}</p>
        </div>
        <div className="rounded-lg bg-zinc-950 p-2.5 text-racing-400"><Icon size={20} /></div>
      </div>
    </div>
  );
}
