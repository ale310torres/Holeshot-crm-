import Link from "next/link";

export default function NotFound() {
  return <main className="flex min-h-screen items-center justify-center p-6"><div className="text-center"><p className="text-6xl font-black text-racing-500">404</p><h1 className="mt-3 text-2xl font-bold">No encontramos esa ficha.</h1><Link href="/dashboard" className="btn-primary mt-6">Volver al dashboard</Link></div></main>;
}
