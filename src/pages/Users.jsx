import React, { useEffect, useState } from 'react';
import { Plus, RefreshCcw, Save, UserPlus } from 'lucide-react';
import RoleBadge from '../components/RoleBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { USER_ROLES } from '../utils/constants.js';

const emptyRepForm = {
  name: '',
  initials: '',
  phone: '',
  email: '',
  region: '',
  max_daily_leads: '',
  active: true,
};

const emptyUserForm = {
  user_id: '',
  full_name: '',
  email: '',
  phone: '',
  role: 'rep',
  sales_rep_id: '',
  active: true,
};

export default function Users() {
  const { organizationId, isAdmin, isManager } = useAuth();
  const [profiles, setProfiles] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [repForm, setRepForm] = useState(emptyRepForm);
  const [userForm, setUserForm] = useState(emptyUserForm);

  async function loadData() {
    setLoading(true);
    setError('');

    const repResult = await supabase
      .from('sales_reps')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (repResult.error) setError('No se pudieron cargar los vendedores.');
    else setSalesReps(repResult.data || []);

    if (isAdmin) {
      const profileResult = await supabase
        .from('crm_user_profiles')
        .select('*, sales_reps(id, name, initials)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (profileResult.error) setError('No se pudieron cargar los usuarios.');
      else setProfiles(profileResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (organizationId && isManager) loadData();
  }, [organizationId, isManager, isAdmin]);

  async function createSalesRep(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      ...repForm,
      organization_id: organizationId,
      max_daily_leads: repForm.max_daily_leads ? Number(repForm.max_daily_leads) : null,
    };

    const { error: insertError } = await supabase.from('sales_reps').insert(payload);
    if (insertError) setError('No se pudo crear el vendedor.');
    else {
      setMessage('Vendedor creado correctamente.');
      setRepForm(emptyRepForm);
      await loadData();
    }
    setSaving(false);
  }

  async function createUserProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const { error: insertError } = await supabase.from('crm_user_profiles').insert({
      ...userForm,
      organization_id: organizationId,
      sales_rep_id: userForm.sales_rep_id || null,
    });

    if (insertError) setError('No se pudo crear el acceso. Verifica que el usuario exista en Supabase Auth.');
    else {
      setMessage('Acceso creado correctamente.');
      setUserForm(emptyUserForm);
      await loadData();
    }
    setSaving(false);
  }

  async function updateProfile(profileId, changes) {
    setError('');
    const { error: updateError } = await supabase
      .from('crm_user_profiles')
      .update({ ...changes, sales_rep_id: changes.sales_rep_id || null, updated_at: new Date().toISOString() })
      .eq('id', profileId)
      .eq('organization_id', organizationId);

    if (updateError) setError('No se pudo actualizar el usuario.');
    else await loadData();
  }

  async function updateRep(repId, changes) {
    setError('');
    const { error: updateError } = await supabase
      .from('sales_reps')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', repId)
      .eq('organization_id', organizationId);

    if (updateError) setError('No se pudo actualizar el vendedor.');
    else await loadData();
  }

  if (!isManager) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-black text-brand-navy">Usuarios</h2>
        <p className="mt-2 max-w-2xl text-slate-500">Esta seccion es para lideres y administradores.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-navy">Usuarios y equipo</h2>
          <p className="mt-1 text-slate-500">Administra vendedores, roles y acceso por organizacion.</p>
        </div>
        <button onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue">
          <RefreshCcw className="h-5 w-5" />
          Actualizar
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}
      {message && <div className="rounded-lg bg-green-50 px-4 py-3 text-sm font-semibold text-brand-success">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-brand-navy">Vendedores</h3>
              <p className="mt-1 text-sm text-slate-500">Cada solicitud, pieza, servicio o tarea puede asignarse a un area o vendedor.</p>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                <p className="p-5 text-slate-500">Cargando vendedores...</p>
              ) : salesReps.map((rep) => (
                <article key={rep.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-brand-navy">{rep.name}</p>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${rep.active ? 'bg-green-50 text-brand-success' : 'bg-slate-100 text-slate-600'}`}>
                        {rep.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{[rep.email, rep.phone, rep.region].filter(Boolean).join(' / ') || 'Sin datos adicionales'}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <button onClick={() => updateRep(rep.id, { active: !rep.active })} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue">
                      {rep.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </article>
              ))}
              {!loading && !salesReps.length && <p className="p-5 text-center text-slate-500">Todavia no hay vendedores.</p>}
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h3 className="font-bold text-brand-navy">Accesos al CRM</h3>
                <p className="mt-1 text-sm text-slate-500">Asigna roles y conecta cada usuario con su vendedor.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {profiles.map((profile) => (
                <article key={profile.id} className="grid gap-4 p-5 xl:grid-cols-[1fr_180px_220px_120px] xl:items-center">
                  <div>
                    <p className="font-bold text-brand-navy">{profile.full_name}</p>
                    <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
                  </div>
                  <div className="space-y-2">
                    <RoleBadge role={profile.role} />
                    <select value={profile.role} onChange={(event) => updateProfile(profile.id, { role: event.target.value, active: profile.active, sales_rep_id: profile.sales_rep_id })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      {USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                    </select>
                  </div>
                    <select value={profile.sales_rep_id || ''} onChange={(event) => updateProfile(profile.id, { sales_rep_id: event.target.value, role: profile.role, active: profile.active })} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                      <option value="">Sin vendedor</option>
                      {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                    </select>
                    <button onClick={() => updateProfile(profile.id, { active: !profile.active, role: profile.role, sales_rep_id: profile.sales_rep_id })} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue">
                      {profile.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </article>
                ))}
                {!profiles.length && <p className="p-5 text-center text-slate-500">No hay accesos adicionales creados.</p>}
              </div>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <form onSubmit={createSalesRep} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-5 w-5 text-brand-blue" />
              <h3 className="font-bold text-brand-navy">Crear vendedor</h3>
            </div>
            <div className="space-y-3">
              <Input label="Nombre" value={repForm.name} onChange={(value) => setRepForm({ ...repForm, name: value })} required />
              <Input label="Iniciales" value={repForm.initials} onChange={(value) => setRepForm({ ...repForm, initials: value })} />
              <Input label="Email" type="email" value={repForm.email} onChange={(value) => setRepForm({ ...repForm, email: value })} />
              <Input label="Telefono" value={repForm.phone} onChange={(value) => setRepForm({ ...repForm, phone: value })} />
              <Input label="Region" value={repForm.region} onChange={(value) => setRepForm({ ...repForm, region: value })} />
              <Input label="Max solicitudes por dia" type="number" value={repForm.max_daily_leads} onChange={(value) => setRepForm({ ...repForm, max_daily_leads: value })} />
            </div>
            <button disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white disabled:opacity-60">
              <Save className="h-5 w-5" />
              Guardar vendedor
            </button>
          </form>

          {isAdmin && (
            <form onSubmit={createUserProfile} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-brand-blue" />
                <h3 className="font-bold text-brand-navy">Crear acceso</h3>
              </div>
              <p className="mb-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-brand-blue">
                Primero crea el usuario en Supabase Auth. Luego pega aqui su user_id para darle acceso al CRM.
              </p>
              <div className="space-y-3">
                <Input label="User ID de Supabase Auth" value={userForm.user_id} onChange={(value) => setUserForm({ ...userForm, user_id: value })} required />
                <Input label="Nombre completo" value={userForm.full_name} onChange={(value) => setUserForm({ ...userForm, full_name: value })} required />
                <Input label="Email" type="email" value={userForm.email} onChange={(value) => setUserForm({ ...userForm, email: value })} required />
                <Input label="Telefono" value={userForm.phone} onChange={(value) => setUserForm({ ...userForm, phone: value })} />
                <label className="block text-sm font-semibold text-slate-700">
                  Rol
                  <select value={userForm.role} onChange={(event) => setUserForm({ ...userForm, role: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                    {USER_ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Vendedor conectado
                  <select value={userForm.sales_rep_id} onChange={(event) => setUserForm({ ...userForm, sales_rep_id: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                    <option value="">Sin vendedor</option>
                    {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                  </select>
                </label>
              </div>
              <button disabled={saving} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 py-3 font-bold text-white disabled:opacity-60">
                <Save className="h-5 w-5" />
                Guardar acceso
              </button>
            </form>
          )}
        </aside>
      </div>
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



