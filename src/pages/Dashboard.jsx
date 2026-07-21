import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import MetricCard from '../components/MetricCard.jsx';
import LeadStageBadge from '../components/LeadStageBadge.jsx';
import LeadTemperatureBadge from '../components/LeadTemperatureBadge.jsx';
import RoleBadge from '../components/RoleBadge.jsx';
import TaskStatusBadge from '../components/TaskStatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { formatLeadInterest, formatShortDate, isOverdue, percentage } from '../utils/formatters.js';

export default function Dashboard() {
  const { organizationId, profile, role, isManager } = useAuth();
  const [leads, setLeads] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError('');
      const [leadResult, taskResult, repResult] = await Promise.all([
        supabase
          .from('leads')
          .select('*, sales_reps(id, name, initials)')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('follow_up_tasks')
          .select('*, leads(id, full_name)')
          .eq('organization_id', organizationId)
          .order('due_at', { ascending: true, nullsFirst: false }),
        supabase
          .from('sales_reps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('active', true)
          .order('name', { ascending: true }),
      ]);

      if (leadResult.error) setError('No se pudieron cargar las metricas.');
      else setLeads(leadResult.data || []);

      if (!taskResult.error) setTasks(taskResult.data || []);
      if (!repResult.error) setSalesReps(repResult.data || []);
      setLoading(false);
    }

    if (organizationId) loadDashboard();
  }, [organizationId]);

  const metrics = useMemo(() => {
    const total = leads.length;
    const won = leads.filter((lead) => lead.stage === 'Cerrado ganado').length;
    const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
    const overdueTasks = tasks.filter((task) => task.status === 'pending' && isOverdue(task.due_at)).length;

    return {
      total,
      newLeads: leads.filter((lead) => ['Nueva solicitud', 'Nuevo lead', 'Nuevo Lead'].includes(lead.stage)).length,
      service: leads.filter((lead) => String(lead.interest_type || lead.service_interest || '').toLowerCase().includes('servicio')).length,
      parts: leads.filter((lead) => String(lead.interest_type || '').toLowerCase().includes('pieza') || lead.requested_part).length,
      quotes: leads.filter((lead) => ['Por cotizar', 'Cotizada', 'Cotizacion enviada'].includes(lead.quote_status) || lead.stage === 'Cotizacion enviada').length,
      hot: leads.filter((lead) => lead.lead_temperature === 'Caliente' || lead.urgency === 'Alta').length,
      followUp: leads.filter((lead) => ['Seguimiento', 'Esperando piezas'].includes(lead.stage) || lead.next_follow_up_at).length,
      won,
      lost: leads.filter((lead) => lead.stage === 'Cerrado perdido').length,
      conversion: total ? (won / total) * 100 : 0,
      pendingTasks,
      overdueTasks,
    };
  }, [leads, tasks]);

  const repAnalytics = useMemo(() => {
    return salesReps.map((rep) => {
      const repLeads = leads.filter((lead) => lead.assigned_rep_id === rep.id);
      const repTasks = tasks.filter((task) => task.assigned_rep_id === rep.id);
      const won = repLeads.filter((lead) => lead.stage === 'Cerrado ganado').length;
      return {
        ...rep,
        totalLeads: repLeads.length,
        hotLeads: repLeads.filter((lead) => lead.lead_temperature === 'Caliente' || lead.urgency === 'Alta').length,
        won,
        pendingTasks: repTasks.filter((task) => task.status === 'pending').length,
        overdueTasks: repTasks.filter((task) => task.status === 'pending' && isOverdue(task.due_at)).length,
        conversion: repLeads.length ? (won / repLeads.length) * 100 : 0,
      };
    });
  }, [salesReps, leads, tasks]);

  if (loading) return <p className="text-slate-600">Cargando dashboard...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black text-brand-navy">Dashboard</h2>
            <RoleBadge role={role} />
          </div>
          <p className="mt-1 text-slate-500">
            {isManager ? 'Vista de taller, piezas, cotizaciones y seguimiento del equipo.' : 'Vista personal de tus oportunidades y seguimientos.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/pipeline" className="rounded-lg border border-slate-200 bg-white px-5 py-3 text-center font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue">
            Ver pipeline
          </Link>
          <Link to="/leads" className="rounded-lg bg-brand-blue px-5 py-3 text-center font-bold text-white transition hover:bg-blue-600">
            Ver oportunidades
          </Link>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Oportunidades" value={metrics.total} helper={isManager ? 'Equipo' : 'Mis casos'} tone="navy" />
        <MetricCard title="Solicitudes nuevas" value={metrics.newLeads} helper="Entrantes" tone="blue" />
        <MetricCard title="Servicios" value={metrics.service} helper="Taller" tone="cyan" />
        <MetricCard title="Piezas" value={metrics.parts} helper="Partes" tone="yellow" />
        <MetricCard title="Por cotizar" value={metrics.quotes} helper="Cotizaciones" tone="cyan" />
        <MetricCard title="Urgentes" value={metrics.hot} helper="Prioridad" tone="red" />
        <MetricCard title="Tareas pendientes" value={metrics.pendingTasks} helper="Hoy" tone="cyan" />
        <MetricCard title="Tareas vencidas" value={metrics.overdueTasks} helper="Atencion" tone="red" />
        <MetricCard title="Cerrados ganados" value={metrics.won} helper="Ventas" tone="green" />
        <MetricCard title="Conversion" value={percentage(metrics.conversion)} helper="Ganadas" tone="cyan" />
      </section>

      {isManager && (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-brand-navy">Rendimiento por area</h3>
            <p className="mt-1 text-sm text-slate-500">Ventas, servicio y piezas con tareas pendientes.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Area / vendedor', 'Oportunidades', 'Urgentes', 'Ganadas', 'Tareas pendientes', 'Tareas vencidas', 'Conversion'].map((header) => (
                    <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repAnalytics.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4 font-bold text-brand-navy">{rep.name}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{rep.totalLeads}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{rep.hotLeads}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{rep.won}</td>
                    <td className="px-4 py-4 text-sm text-slate-600">{rep.pendingTasks}</td>
                    <td className="px-4 py-4 text-sm text-brand-danger">{rep.overdueTasks}</td>
                    <td className="px-4 py-4 text-sm font-bold text-brand-navy">{percentage(rep.conversion)}</td>
                  </tr>
                ))}
                {!repAnalytics.length && (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-slate-500">Crea areas o vendedores en Usuarios para ver analiticos por equipo.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-brand-navy">Solicitudes recientes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {leads.slice(0, 8).map((lead) => (
              <Link key={lead.id} to={`/leads/${lead.id}`} className="grid gap-3 px-5 py-4 hover:bg-slate-50 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
                <div>
                  <p className="font-bold text-brand-navy">{lead.full_name || 'Sin nombre'}</p>
                  <p className="text-sm text-slate-500">{formatLeadInterest(lead)} / {lead.sales_reps?.name || lead.assigned_to || lead.phone || 'Sin asignar'}</p>
                </div>
                <LeadTemperatureBadge temperature={lead.lead_temperature} />
                <LeadStageBadge stage={lead.stage} />
                <p className="text-sm text-slate-500">{formatShortDate(lead.created_at)}</p>
              </Link>
            ))}
            {!leads.length && <p className="px-5 py-8 text-center text-slate-500">Todavia no hay solicitudes para mostrar.</p>}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold text-brand-navy">Tareas urgentes</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {tasks.filter((task) => task.status === 'pending').slice(0, 6).map((task) => (
              <Link key={task.id} to={task.lead_id ? `/leads/${task.lead_id}` : '/tareas'} className="block px-5 py-4 hover:bg-slate-50">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-bold text-brand-navy">{task.leads?.full_name || 'Tarea sin oportunidad'}</p>
                  <TaskStatusBadge status={task.status} dueAt={task.due_at} />
                </div>
                <p className="mt-1 text-sm text-slate-500">{task.due_at ? formatShortDate(task.due_at) : 'Sin fecha'} {task.assigned_to ? `/ ${task.assigned_to}` : ''}</p>
              </Link>
            ))}
            {!tasks.filter((task) => task.status === 'pending').length && <p className="px-5 py-8 text-center text-slate-500">No hay tareas pendientes.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}



