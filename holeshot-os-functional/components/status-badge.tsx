import type { WorkOrderStatus } from "@/lib/types";

const styles: Record<WorkOrderStatus, string> = {
  New: "bg-sky-500/10 text-sky-300 border-sky-500/20",
  Diagnosing: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  "Waiting Approval": "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Approved: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  "Waiting Parts": "bg-orange-500/10 text-orange-300 border-orange-500/20",
  "In Progress": "bg-racing-500/10 text-racing-400 border-racing-500/20",
  "Ready for Pickup": "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Completed: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
  Cancelled: "bg-red-500/10 text-red-300 border-red-500/20",
};

export function StatusBadge({ status }: { status: WorkOrderStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>{status}</span>;
}
