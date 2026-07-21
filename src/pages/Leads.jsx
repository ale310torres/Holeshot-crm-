import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import LeadTable from '../components/LeadTable.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { LEAD_STAGES, LEAD_TEMPERATURES, SOURCES } from '../utils/constants.js';

const emptyForm = {
  full_name: '',
  phone: '',
  email: '',
  source: 'Manual',
  property_city: '',
  service_interest: '',
  message: '',
  notes: '',
  assigned_to: '',
  assigned_rep_id: '',
};

export default function Leads() {
  const { organizationId, organization, user, profile, salesRepId, isManager } = useAuth();
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: '', stage: '', lead_temperature: '', source: '' });

  async function loadLeads() {
    setLoading(true);
    const [leadResult, repResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*, sales_reps(id, name, initials)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sales_reps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('name', { ascending: true }),
    ]);

    if (leadResult.error) setError('No se pudieron cargar los leads.');
    else setLeads(leadResult.data || []);
    if (!repResult.error) setSalesReps(repResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (organizationId) loadLeads();
  }, [organizationId]);

  const filteredLeads = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesSearch = !search || [lead.full_name, lead.phone, lead.email, lead.property_city].some((value) => String(value || '').toLowerCase().includes(search));
      const matchesStage = !filters.stage || lead.stage === filters.stage;
      const matchesTemp = !filters.lead_temperature || lead.lead_temperature === filters.lead_temperature;
      const matchesSource = !filters.source || lead.source === filters.source;
      return matchesSearch && matchesStage && matchesTemp && matchesSource;
    });
  }, [leads, filters]);

  async function logActivity(leadId, activityType, activityMessage, metadata = {}) {
    await supabase.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: leadId,
      activity_type: activityType,
      channel: 'CRM',
      direction: 'internal',
      message: activityMessage,
      created_by: user?.id || null,
      metadata,
    });
  }

  async function handleCreateLead(event) {
    event.preventDefault();
    setError('');
    const selectedRep = salesReps.find((rep) => rep.id === form.assigned_rep_id);
    const assignedRepId = isManager ? form.assigned_rep_id || null : salesRepId || null;
    const assignedTo = isManager ? form.assigned_to || selectedRep?.name || '' : profile?.full_name || form.assigned_to || '';

    const { data, error: insertError } = await supabase
      .from('leads')
      .insert({
        ...form,
        organization_id: organizationId,
        assigned_to: assignedTo,
        assigned_rep_id: assignedRepId,
        stage: 'Nuevo lead',
        lead_temperature: 'Sin clasificar',
        lead_score: 0,
        lead_status: 'open',
        next_action: 'Contactar lead',
      })
      .select('*')
      .single();

    if (insertError) {
      setError('No se pudo crear el lead. Revisa los campos e intenta nuevamente.');
      return;
    }

    await logActivity(data.id, 'lead_created', 'Lead creado manualmente desde el CRM.');
    setForm(emptyForm);
    setShowForm(false);
    loadLeads();
  }

  async function handleMarkContacted(lead) {
    const { error: updateError } = await supabase
      .from('leads')
      .update({ stage: 'Contactado', last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      setError('No se pudo marcar como contactado.');
      return;
    }

    await logActivity(lead.id, 'stage_changed', `Etapa cambiada de ${lead.stage || 'Nuevo lead'} a Contactado.`, {
      previous_stage: lead.stage,
      next_stage: 'Contactado',
    });
    loadLeads();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-navy">Leads</h2>
          <p className="mt-1 text-slate-500">Busca, filtra y contacta tus oportunidades.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white transition hover:bg-blue-600">
          <Plus className="h-5 w-5" />
          Crear lead
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <input
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
          className="rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue"
          placeholder="Buscar por nombre, telefono, email o ciudad"
        />
        <select value={filters.stage} onChange={(event) => setFilters((current) => ({ ...current, stage: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3">
          <option value="">Todas las etapas</option>
          {LEAD_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
        </select>
        <select value={filters.lead_temperature} onChange={(event) => setFilters((current) => ({ ...current, lead_temperature: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3">
          <option value="">Todas las temperaturas</option>
          {LEAD_TEMPERATURES.map((temp) => <option key={temp}>{temp}</option>)}
        </select>
        <select value={filters.source} onChange={(event) => setFilters((current) => ({ ...current, source: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3">
          <option value="">Todas las fuentes</option>
          {SOURCES.map((source) => <option key={source}>{source}</option>)}
        </select>
      </section>

      {loading ? <p className="text-slate-600">Cargando leads...</p> : <LeadTable leads={filteredLeads} onMarkContacted={handleMarkContacted} businessName={organization?.name} />}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-navy/50 px-4 py-8">
          <form onSubmit={handleCreateLead} className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-brand-navy">Crear lead manual</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Nombre" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} required />
              <Input label="Telefono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
              <Input label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
              <Input label="Ciudad/Pueblo" value={form.property_city} onChange={(value) => setForm({ ...form, property_city: value })} />
              <label className="block text-sm font-semibold text-slate-700">
                Fuente
                <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                  {SOURCES.map((source) => <option key={source}>{source}</option>)}
                </select>
              </label>
              {isManager ? (
                <label className="block text-sm font-semibold text-slate-700">
                  Asignado a
                  <select
                    value={form.assigned_rep_id}
                    onChange={(event) => {
                      const rep = salesReps.find((item) => item.id === event.target.value);
                      setForm({ ...form, assigned_rep_id: event.target.value, assigned_to: rep?.name || '' });
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3"
                  >
                    <option value="">Sin asignar</option>
                    {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                  </select>
                </label>
              ) : (
                <Input label="Asignado a" value={profile?.full_name || form.assigned_to} onChange={(value) => setForm({ ...form, assigned_to: value })} />
              )}
              <Input label="Interes / servicio" value={form.service_interest} onChange={(value) => setForm({ ...form, service_interest: value })} />
            </div>
            <TextArea label="Mensaje" value={form.message} onChange={(value) => setForm({ ...form, message: value })} />
            <TextArea label="Notas" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
            <button type="submit" className="mt-5 w-full rounded-lg bg-brand-blue px-5 py-3 font-bold text-white hover:bg-blue-600">
              Guardar lead
            </button>
          </form>
        </div>
      )}
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

function TextArea({ label, value, onChange }) {
  return (
    <label className="mt-4 block text-sm font-semibold text-slate-700">
      {label}
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="3" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" />
    </label>
  );
}



