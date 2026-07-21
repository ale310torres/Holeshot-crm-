import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, RefreshCcw } from 'lucide-react';
import LeadStageBadge from '../components/LeadStageBadge.jsx';
import LeadTemperatureBadge from '../components/LeadTemperatureBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { LEAD_STAGES } from '../utils/constants.js';
import { formatShortDate, getCallHref, getEmailHref, getWhatsAppHref } from '../utils/formatters.js';

function normalizeStage(stage) {
  if (stage === 'No contesto') return 'Seguimiento';
  if (stage === 'Nuevo Lead' || stage === 'Nuevo lead') return 'Nueva solicitud';
  if (stage === 'Cualificando' || stage === 'Interesado') return 'Validando vehiculo';
  if (stage === 'Cita agendada') return 'Servicio agendado';
  return stage || 'Nueva solicitud';
}

export default function Pipeline() {
  const { organizationId, organization, user, isManager } = useAuth();
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [repFilter, setRepFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  async function loadLeads() {
    setLoading(true);
    setError('');
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

    if (leadResult.error) setError('No se pudo cargar el pipeline.');
    else setLeads(leadResult.data || []);
    if (!repResult.error) setSalesReps(repResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (organizationId) loadLeads();
  }, [organizationId]);

  const leadsByStage = useMemo(() => {
    const visibleLeads = repFilter ? leads.filter((lead) => lead.assigned_rep_id === repFilter) : leads;
    return LEAD_STAGES.reduce((groups, stage) => {
      groups[stage] = visibleLeads.filter((lead) => normalizeStage(lead.stage) === stage);
      return groups;
    }, {});
  }, [leads, repFilter]);

  async function logActivity(lead, activityType, message, metadata = {}) {
    await supabase.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: lead.id,
      activity_type: activityType,
      channel: 'CRM',
      direction: 'internal',
      message,
      created_by: user?.id || null,
      metadata,
    });
  }

  async function updateStage(lead, nextStage) {
    const previousStage = normalizeStage(lead.stage);
    if (previousStage === nextStage) return;

    setUpdatingId(lead.id);
    setError('');
    const { error: updateError } = await supabase
      .from('leads')
      .update({ stage: nextStage, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
      .eq('organization_id', organizationId);

    if (updateError) {
      setError('No se pudo actualizar la etapa.');
      setUpdatingId('');
      return;
    }

    await logActivity(
      lead,
      'stage_changed',
      `Etapa cambiada de ${previousStage} a ${nextStage}.`,
      { previous_stage: previousStage, next_stage: nextStage }
    );

    setLeads((current) => current.map((item) => (item.id === lead.id ? { ...item, stage: nextStage } : item)));
    setUpdatingId('');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-navy">Pipeline</h2>
          <p className="mt-1 text-slate-500">Mueve cada servicio, pieza o cotizacion por su etapa real.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isManager && (
            <select value={repFilter} onChange={(event) => setRepFilter(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700">
              <option value="">Todo el equipo</option>
              {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
            </select>
          )}
          <button onClick={loadLeads} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-3 font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue">
            <RefreshCcw className="h-5 w-5" />
            Actualizar
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}
      {loading ? (
        <p className="text-slate-600">Cargando pipeline...</p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-3">
          {LEAD_STAGES.map((stage) => (
            <section key={stage} className="min-w-[300px] max-w-[320px] flex-1 rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <LeadStageBadge stage={stage} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {leadsByStage[stage]?.length || 0}
                  </span>
                </div>
              </div>
              <div className="space-y-3 p-3">
                {(leadsByStage[stage] || []).map((lead) => (
                  <article key={lead.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={`/leads/${lead.id}`} className="font-bold text-brand-navy hover:text-brand-blue">
                          {lead.full_name || 'Sin nombre'}
                        </Link>
                        <p className="mt-1 text-sm text-slate-500">{lead.requested_part || lead.requested_service || lead.service_interest || lead.phone || 'Sin detalle'}</p>
                        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{lead.sales_reps?.name || lead.assigned_to || 'Sin asignar'}</p>
                      </div>
                      <LeadTemperatureBadge temperature={lead.lead_temperature} />
                    </div>

                    <p className="mt-3 line-clamp-2 text-sm text-slate-600">{lead.next_action || 'Sin proxima accion'}</p>

                    <select
                      value={normalizeStage(lead.stage)}
                      onChange={(event) => updateStage(lead, event.target.value)}
                      disabled={updatingId === lead.id}
                      className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                    >
                      {LEAD_STAGES.map((option) => <option key={option}>{option}</option>)}
                    </select>

                    <div className="mt-4 flex items-center justify-between gap-2">
                      <p className="text-xs text-slate-400">{formatShortDate(lead.created_at)}</p>
                      <div className="flex gap-2">
                        <a href={getCallHref(lead.phone)} className="rounded-lg bg-slate-100 p-2 text-slate-700" title="Llamar">
                          <Phone className="h-4 w-4" />
                        </a>
                        <a href={getWhatsAppHref(lead.phone, lead.full_name, organization?.name)} target="_blank" rel="noreferrer" className="rounded-lg bg-green-50 p-2 text-brand-success" title="WhatsApp">
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <a href={getEmailHref(lead.email)} className="rounded-lg bg-blue-50 p-2 text-brand-blue" title="Email">
                          <Mail className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                ))}
                {!leadsByStage[stage]?.length && (
                  <div className="rounded-lg border border-dashed border-slate-200 p-5 text-center text-sm text-slate-400">
                    Sin oportunidades en esta etapa
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}



