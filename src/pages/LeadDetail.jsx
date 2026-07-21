import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, MessageCircle, Phone, Plus, Save } from 'lucide-react';
import ActivityTimeline from '../components/ActivityTimeline.jsx';
import LeadStageBadge from '../components/LeadStageBadge.jsx';
import LeadTemperatureBadge from '../components/LeadTemperatureBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { LEAD_STAGES, LEAD_TEMPERATURES } from '../utils/constants.js';
import { formatDate, getCallHref, getEmailHref, getWhatsAppHref } from '../utils/formatters.js';

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { organizationId, organization, user, profile, isManager } = useAuth();
  const [lead, setLead] = useState(null);
  const [form, setForm] = useState(null);
  const [activities, setActivities] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadActivities() {
    const { data } = await supabase
      .from('lead_activities')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('lead_id', id)
      .order('created_at', { ascending: false });

    setActivities(data || []);
  }

  async function loadLead() {
    setLoading(true);
    const [leadResult, repResult] = await Promise.all([
      supabase
        .from('leads')
        .select('*, sales_reps(id, name, initials)')
        .eq('id', id)
        .eq('organization_id', organizationId)
        .maybeSingle(),
      supabase
        .from('sales_reps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('name', { ascending: true }),
    ]);

    const { data, error } = leadResult;
    if (!repResult.error) setSalesReps(repResult.data || []);

    if (error || !data) {
      setLead(null);
      setForm(null);
    } else {
      setLead(data);
      setForm(data);
      await loadActivities();
    }
    setLoading(false);
  }

  useEffect(() => {
    if (id && organizationId) loadLead();
  }, [id, organizationId]);

  async function logActivity(activityType, activityMessage, metadata = {}, channel = 'CRM', direction = 'internal') {
    const { data } = await supabase
      .from('lead_activities')
      .insert({
        organization_id: organizationId,
        lead_id: id,
        activity_type: activityType,
        channel,
        direction,
        message: activityMessage,
        created_by: user?.id || null,
        metadata,
      })
      .select('*')
      .single();

    if (data) setActivities((current) => [data, ...current]);
  }

  async function saveChanges() {
    setSaving(true);
    setMessage('');
    const previousStage = lead.stage === 'Nuevo Lead' ? 'Nuevo lead' : lead.stage || 'Nuevo lead';
    const nextStage = form.stage === 'Nuevo Lead' ? 'Nuevo lead' : form.stage || 'Nuevo lead';

    const { error } = await supabase
      .from('leads')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', organizationId);

    if (error) {
      setMessage('No se pudieron guardar los cambios.');
    } else {
      setLead(form);
      setMessage('Cambios guardados correctamente.');
      await logActivity('lead_updated', 'Lead actualizado desde el CRM.');
      if (previousStage !== nextStage) {
        await logActivity('stage_changed', `Etapa cambiada de ${previousStage} a ${nextStage}.`, {
          previous_stage: previousStage,
          next_stage: nextStage,
        });
      }
    }
    setSaving(false);
  }

  async function addNote() {
    const note = newNote.trim();
    if (!note) return;
    await logActivity('note_created', note);
    setNewNote('');
  }

  async function logContactAction(type) {
    const messages = {
      call_logged: 'Se abrio la accion de llamada desde el CRM.',
      whatsapp_opened: 'Se abrio WhatsApp desde el CRM.',
      email_opened: 'Se abrio email desde el CRM.',
    };
    await logActivity(type, messages[type], {}, type.replace('_opened', '').replace('_logged', ''));
  }

  if (loading) return <p className="text-slate-600">Cargando lead...</p>;

  if (!lead || !form) {
    return (
      <div className="rounded-lg bg-white p-8 text-center shadow-sm">
        <h2 className="text-xl font-bold text-brand-navy">Lead no encontrado</h2>
        <button onClick={() => navigate('/leads')} className="mt-4 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white">Volver a leads</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link to="/leads" className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue">
        <ArrowLeft className="h-4 w-4" />
        Volver a leads
      </Link>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <div>
            <h2 className="text-2xl font-black text-brand-navy">{lead.full_name || 'Sin nombre'}</h2>
            <p className="mt-1 text-slate-500">Creado el {formatDate(lead.created_at)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <LeadTemperatureBadge temperature={form.lead_temperature} />
              <LeadStageBadge stage={form.stage} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:flex">
            <a onClick={() => logContactAction('call_logged')} href={getCallHref(lead.phone)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-navy px-4 py-3 font-bold text-white">
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Llamar</span>
            </a>
            <a onClick={() => logContactAction('whatsapp_opened')} href={getWhatsAppHref(lead.phone, lead.full_name, organization?.name)} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-3 font-bold text-white">
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>
            <a onClick={() => logContactAction('email_opened')} href={getEmailHref(lead.email)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-3 font-bold text-white">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Email</span>
            </a>
          </div>
        </div>
      </section>

      {message && <div className="rounded-lg bg-blue-50 px-4 py-3 text-sm font-semibold text-brand-blue">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[1fr_400px]">
        <section className="space-y-5">
          <Panel title="Informacion del contacto">
            <Field label="Nombre" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} />
            <Field label="Telefono" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} />
            <Field label="Email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
            <Field label="Ciudad/Pueblo" value={form.property_city} onChange={(value) => setForm({ ...form, property_city: value })} />
          </Panel>

          <Panel title="Propiedad o negocio">
            <Field label="Property Address" value={form.property_address} onChange={(value) => setForm({ ...form, property_address: value })} />
            <Field label="Property City" value={form.property_city} onChange={(value) => setForm({ ...form, property_city: value })} />
            <Field label="Property Condition" value={form.property_condition} onChange={(value) => setForm({ ...form, property_condition: value })} />
            <Field label="Occupied Status" value={form.occupied_status} onChange={(value) => setForm({ ...form, occupied_status: value })} />
            <Field label="Selling Timeline" value={form.selling_timeline} onChange={(value) => setForm({ ...form, selling_timeline: value })} />
            <Field label="Asking Price" value={form.asking_price} onChange={(value) => setForm({ ...form, asking_price: value })} />
            <Field label="Mortgage Balance" value={form.mortgage_balance} onChange={(value) => setForm({ ...form, mortgage_balance: value })} />
            <TextField label="Seller Motivation" value={form.seller_motivation} onChange={(value) => setForm({ ...form, seller_motivation: value })} />
          </Panel>

          <Panel title="Campos generales">
            <Field label="Service Interest" value={form.service_interest} onChange={(value) => setForm({ ...form, service_interest: value })} />
            <Field label="Budget" value={form.budget} onChange={(value) => setForm({ ...form, budget: value })} />
            <Field label="Timeline" value={form.timeline} onChange={(value) => setForm({ ...form, timeline: value })} />
            <TextField label="Message" value={form.message} onChange={(value) => setForm({ ...form, message: value })} />
            <TextField label="Notas internas" value={form.notes} onChange={(value) => setForm({ ...form, notes: value })} />
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="Seguimiento">
            <label className="block text-sm font-semibold text-slate-700">
              Etapa
              <select value={form.stage === 'Nuevo Lead' ? 'Nuevo lead' : form.stage || 'Nuevo lead'} onChange={(event) => setForm({ ...form, stage: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                {LEAD_STAGES.map((stage) => <option key={stage}>{stage}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold text-slate-700">
              Temperatura
              <select value={form.lead_temperature || 'Sin clasificar'} onChange={(event) => setForm({ ...form, lead_temperature: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                {LEAD_TEMPERATURES.map((temp) => <option key={temp}>{temp}</option>)}
              </select>
            </label>
            <Field label="Fuente" value={form.source} onChange={(value) => setForm({ ...form, source: value })} />
            <Field label="Score" type="number" value={form.lead_score ?? 0} onChange={(value) => setForm({ ...form, lead_score: Number(value) })} />
            {isManager ? (
              <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
                Asignado a
                <select
                  value={form.assigned_rep_id || ''}
                  onChange={(event) => {
                    const rep = salesReps.find((item) => item.id === event.target.value);
                    setForm({ ...form, assigned_rep_id: event.target.value || null, assigned_to: rep?.name || '' });
                  }}
                  className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3"
                >
                  <option value="">Sin asignar</option>
                  {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                </select>
              </label>
            ) : (
              <Field label="Asignado a" value={form.assigned_to || profile?.full_name || ''} onChange={(value) => setForm({ ...form, assigned_to: value })} />
            )}
            <TextField label="Proxima accion" value={form.next_action} onChange={(value) => setForm({ ...form, next_action: value })} />
            <button onClick={saveChanges} disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white hover:bg-blue-600 disabled:opacity-70">
              <Save className="h-5 w-5" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </Panel>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-bold text-brand-navy">Agregar nota rapida</h3>
            <textarea value={newNote} onChange={(event) => setNewNote(event.target.value)} rows="3" className="mt-3 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" placeholder="Escribe una nota de seguimiento..." />
            <button onClick={addNote} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-navy px-5 py-3 font-bold text-white">
              <Plus className="h-5 w-5" />
              Guardar nota
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-lg font-bold text-brand-navy">Historial de actividades</h3>
            <ActivityTimeline activities={activities} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-brand-navy">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <input type={type} value={value || ''} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" />
    </label>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">
      {label}
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} rows="4" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" />
    </label>
  );
}



