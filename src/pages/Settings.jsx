import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';

export default function Settings() {
  const { organizationId, organization, isAdmin } = useAuth();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    niche: '',
    logo_url: '',
    primary_phone: '',
    primary_email: '',
    website_url: '',
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (organization) {
      setForm({
        name: organization.name || '',
        slug: organization.slug || '',
        niche: organization.niche || '',
        logo_url: organization.logo_url || '',
        primary_phone: organization.primary_phone || '',
        primary_email: organization.primary_email || '',
        website_url: organization.website_url || '',
        active: organization.active ?? true,
      });
    }
  }, [organization]);

  async function saveSettings(event) {
    event.preventDefault();
    if (!isAdmin) return;

    setSaving(true);
    setError('');
    setMessage('');
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', organizationId);

    if (updateError) setError('No se pudo actualizar la organizacion. Revisa las policies de Fase 3.');
    else setMessage('Configuracion guardada correctamente.');
    setSaving(false);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-black text-brand-navy">Configuracion</h2>
        <p className="mt-1 text-slate-500">Datos principales de este cliente y su CRM individual.</p>
      </div>

      {!isAdmin && (
        <div className="rounded-lg bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700">
          Solo owner/admin puede editar la configuracion de la organizacion.
        </div>
      )}
      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-brand-success">{message}</div>}

      <form onSubmit={saveSettings} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <Input label="Nombre del negocio" value={form.name} onChange={(value) => setForm({ ...form, name: value })} required />
          <Input label="Slug" value={form.slug} onChange={(value) => setForm({ ...form, slug: value })} required />
          <Input label="Nicho" value={form.niche} onChange={(value) => setForm({ ...form, niche: value })} />
          <Input label="Logo URL" value={form.logo_url} onChange={(value) => setForm({ ...form, logo_url: value })} />
          <Input label="Telefono principal" value={form.primary_phone} onChange={(value) => setForm({ ...form, primary_phone: value })} />
          <Input label="Email principal" type="email" value={form.primary_email} onChange={(value) => setForm({ ...form, primary_email: value })} />
          <Input label="Website" value={form.website_url} onChange={(value) => setForm({ ...form, website_url: value })} />
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4" />
            Cliente activo
          </label>
        </div>

        <button disabled={!isAdmin || saving} className="mt-5 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-60">
          <Save className="h-5 w-5" />
          {saving ? 'Guardando...' : 'Guardar configuracion'}
        </button>
      </form>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="font-bold text-brand-navy">Separacion multi-cliente</h3>
        <p className="mt-2 text-sm text-slate-500">
          Todos los leads, tareas, reps y actividades se filtran por organization_id. Cada cliente entra a su propio CRM y no ve data de otros clientes.
        </p>
      </section>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" />
    </label>
  );
}



