export function DataTable({ children }: { children: React.ReactNode }) {
  return <div className="table-wrap"><table className="data-table">{children}</table></div>;
}
