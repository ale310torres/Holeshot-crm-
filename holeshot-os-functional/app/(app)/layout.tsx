import { Sidebar } from "@/components/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="px-4 pb-12 pt-20 md:ml-64 md:px-8 md:pt-8 xl:px-12">
        <div className="mx-auto max-w-[1500px]">{children}</div>
      </main>
    </div>
  );
}
