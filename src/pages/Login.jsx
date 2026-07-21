import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { APP_NAME } from '../utils/constants.js';

export default function Login() {
  const { session, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const result = await signIn(email, password);
    if (result.error) setError(result.error);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-brand-navy px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-10 lg:grid-cols-[1fr_430px]">
        <section>
          <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-lg bg-brand-blue text-xl font-black">HS</div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">{APP_NAME}</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-200">
            CRM operativo para organizar leads, cotizaciones, servicios y seguimientos de Holeshot.
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {['Leads claros', 'Seguimiento facil', 'Listo para n8n'].map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm font-semibold text-cyan-100">
                {item}
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-lg bg-white p-7 text-slate-900 shadow-soft">
          <h2 className="text-2xl font-bold text-brand-navy">Iniciar sesion</h2>
          <p className="mt-2 text-sm text-slate-500">Entra con tu email y contrasena.</p>

          {error && <div className="mt-5 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}

          <label className="mt-6 block text-sm font-semibold text-slate-700">Email</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 focus-within:border-brand-blue">
            <Mail className="h-5 w-5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full outline-none"
              placeholder="tu@email.com"
              required
            />
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">Contrasena</label>
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-3 focus-within:border-brand-blue">
            <Lock className="h-5 w-5 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full outline-none"
              placeholder="********"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full rounded-lg bg-brand-blue px-5 py-3 font-bold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? 'Entrando...' : 'Entrar al CRM'}
          </button>
        </form>
      </div>
    </div>
  );
}



