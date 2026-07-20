"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="panel mx-auto mt-20 max-w-xl p-8 text-center"><h1 className="text-xl font-black">Algo se salió de la pista</h1><p className="mt-3 text-sm text-zinc-500">{error.message}</p><button className="btn-primary mt-6" onClick={reset}>Intentar de nuevo</button></div>;
}
