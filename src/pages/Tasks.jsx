import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Plus, RefreshCcw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import TaskStatusBadge from '../components/TaskStatusBadge.jsx';
import LeadTemperatureBadge from '../components/LeadTemperatureBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { supabase } from '../lib/supabaseClient.js';
import { TASK_TYPE_LABELS, TASK_TYPES } from '../utils/constants.js';
import { formatDate, formatDateTimeLocalInput, isOverdue, toIsoFromLocalInput } from '../utils/formatters.js';

const emptyTask = {
  lead_id: '',
  task_type: 'first_follow_up',
  due_at: '',
  assigned_to: '',
  assigned_rep_id: '',
  notes: '',
};

export default function Tasks() {
  const { organizationId, user, profile, salesRepId, isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [leads, setLeads] = useState([]);
  const [salesReps, setSalesReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyTask);
  const [filters, setFilters] = useState({ status: 'pending', assigned_to: '', date: '' });

  async function loadData() {
    setLoading(true);
    setError('');
    const [taskResult, leadResult, repResult] = await Promise.all([
      supabase
        .from('follow_up_tasks')
        .select('*, leads(id, full_name, phone, email, property_city, stage, lead_temperature, assigned_rep_id), sales_reps(id, name, initials)')
        .eq('organization_id', organizationId)
        .order('due_at', { ascending: true, nullsFirst: false }),
      supabase
        .from('leads')
        .select('id, full_name, phone, email, property_city, stage, lead_temperature, assigned_to, assigned_rep_id')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false }),
      supabase
        .from('sales_reps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('active', true)
        .order('name', { ascending: true }),
    ]);

    if (taskResult.error) setError('No se pudieron cargar las tareas.');
    else setTasks(taskResult.data || []);

    if (!leadResult.error) setLeads(leadResult.data || []);
    if (!repResult.error) setSalesReps(repResult.data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (organizationId) loadData();
  }, [organizationId]);

  const assignedOptions = useMemo(() => {
    const values = new Set();
    tasks.forEach((task) => {
      if (task.assigned_to) values.add(task.assigned_to);
    });
    leads.forEach((lead) => {
      if (lead.assigned_to) values.add(lead.assigned_to);
    });
    return Array.from(values).sort();
  }, [tasks, leads]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const overdue = task.status === 'pending' && isOverdue(task.due_at);
      const matchesStatus =
        filters.status === 'all' ||
        task.status === filters.status ||
        (filters.status === 'overdue' && overdue);
      const matchesAssigned = !filters.assigned_to || task.assigned_to === filters.assigned_to;
      const matchesDate = !filters.date || (task.due_at && task.due_at.slice(0, 10) === filters.date);
      return matchesStatus && matchesAssigned && matchesDate;
    });
  }, [tasks, filters]);

  const counters = useMemo(() => {
    return {
      pending: tasks.filter((task) => task.status === 'pending').length,
      overdue: tasks.filter((task) => task.status === 'pending' && isOverdue(task.due_at)).length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

  async function logActivity(task, activityType, message) {
    if (!task.lead_id) return;
    await supabase.from('lead_activities').insert({
      organization_id: organizationId,
      lead_id: task.lead_id,
      activity_type: activityType,
      channel: 'CRM',
      direction: 'internal',
      message,
      created_by: user?.id || null,
      metadata: { task_id: task.id, task_type: task.task_type },
    });
  }

  async function handleCreateTask(event) {
    event.preventDefault();
    setError('');
    const selectedLead = leads.find((lead) => lead.id === form.lead_id);
    const selectedRep = salesReps.find((rep) => rep.id === form.assigned_rep_id);
    const assignedRepId = isManager
      ? form.assigned_rep_id || selectedLead?.assigned_rep_id || null
      : salesRepId || selectedLead?.assigned_rep_id || null;
    const assignedTo = isManager
      ? form.assigned_to || selectedRep?.name || selectedLead?.assigned_to || ''
      : profile?.full_name || form.assigned_to || selectedLead?.assigned_to || '';

    const payload = {
      organization_id: organizationId,
      lead_id: form.lead_id || null,
      task_type: form.task_type,
      due_at: toIsoFromLocalInput(form.due_at),
      status: 'pending',
      assigned_to: assignedTo,
      assigned_rep_id: assignedRepId,
      notes: form.notes,
    };

    const { data, error: insertError } = await supabase
      .from('follow_up_tasks')
      .insert(payload)
      .select('*, leads(id, full_name, phone, email, property_city, stage, lead_temperature, assigned_rep_id), sales_reps(id, name, initials)')
      .single();

    if (insertError) {
      setError('No se pudo crear la tarea.');
      return;
    }

    await logActivity(data, 'task_created', `Tarea creada: ${TASK_TYPE_LABELS[data.task_type] || data.task_type}.`);
    setTasks((current) => [data, ...current]);
    setForm(emptyTask);
    setShowForm(false);
  }

  async function completeTask(task) {
    const completedAt = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('follow_up_tasks')
      .update({ status: 'completed', completed_at: completedAt, updated_at: completedAt })
      .eq('id', task.id)
      .eq('organization_id', organizationId)
      .select('*, leads(id, full_name, phone, email, property_city, stage, lead_temperature, assigned_rep_id), sales_reps(id, name, initials)')
      .single();

    if (updateError) {
      setError('No se pudo completar la tarea.');
      return;
    }

    await logActivity(data, 'task_completed', `Tarea completada: ${TASK_TYPE_LABELS[data.task_type] || data.task_type}.`);
    setTasks((current) => current.map((item) => (item.id === task.id ? data : item)));
  }

  async function cancelTask(task) {
    const { data, error: updateError } = await supabase
      .from('follow_up_tasks')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', task.id)
      .eq('organization_id', organizationId)
      .select('*, leads(id, full_name, phone, email, property_city, stage, lead_temperature, assigned_rep_id), sales_reps(id, name, initials)')
      .single();

    if (updateError) {
      setError('No se pudo cancelar la tarea.');
      return;
    }

    setTasks((current) => current.map((item) => (item.id === task.id ? data : item)));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-brand-navy">Tareas</h2>
          <p className="mt-1 text-slate-500">Organiza seguimientos, llamadas y proximas acciones por lead.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={loadData} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 font-bold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue">
            <RefreshCcw className="h-5 w-5" />
            Actualizar
          </button>
          <button onClick={() => setShowForm(true)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 font-bold text-white transition hover:bg-blue-600">
            <Plus className="h-5 w-5" />
            Crear tarea
          </button>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <SummaryCard title="Pendientes" value={counters.pending} tone="yellow" />
        <SummaryCard title="Vencidas" value={counters.overdue} tone="red" />
        <SummaryCard title="Completadas" value={counters.completed} tone="green" />
      </section>

      {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-brand-danger">{error}</div>}

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3">
          <option value="pending">Pendientes</option>
          <option value="overdue">Vencidas</option>
          <option value="completed">Completadas</option>
          <option value="cancelled">Canceladas</option>
          <option value="all">Todas</option>
        </select>
        <select value={filters.assigned_to} onChange={(event) => setFilters((current) => ({ ...current, assigned_to: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3">
          <option value="">Todos los asignados</option>
          {assignedOptions.map((person) => <option key={person}>{person}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={(event) => setFilters((current) => ({ ...current, date: event.target.value }))} className="rounded-lg border border-slate-200 px-4 py-3" />
      </section>

      {loading ? (
        <p className="text-slate-600">Cargando tareas...</p>
      ) : (
        <section className="space-y-3">
          {filteredTasks.map((task) => (
            <article key={task.id} className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.status} dueAt={task.due_at} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                    {TASK_TYPE_LABELS[task.task_type] || task.task_type}
                  </span>
                  {task.leads?.lead_temperature && <LeadTemperatureBadge temperature={task.leads.lead_temperature} />}
                </div>
                <h3 className="mt-3 text-lg font-bold text-brand-navy">
                  {task.leads?.full_name || 'Tarea sin lead relacionado'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Vence: {task.due_at ? formatDate(task.due_at) : 'Sin fecha'} {task.assigned_to ? ` / Asignado a ${task.assigned_to}` : ''}
                </p>
                {task.notes && <p className="mt-2 text-sm text-slate-600">{task.notes}</p>}
              </div>
              <div className="flex flex-wrap gap-2 lg:justify-end">
                {task.lead_id && (
                  <Link to={`/leads/${task.lead_id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand-blue hover:text-brand-blue">
                    Abrir lead
                  </Link>
                )}
                {task.status === 'pending' && (
                  <button onClick={() => completeTask(task)} className="inline-flex items-center gap-2 rounded-lg bg-brand-success px-4 py-2 text-sm font-bold text-white">
                    <CheckCircle2 className="h-4 w-4" />
                    Completar
                  </button>
                )}
                {task.status === 'pending' && (
                  <button onClick={() => cancelTask(task)} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
                    <X className="h-4 w-4" />
                    Cancelar
                  </button>
                )}
              </div>
            </article>
          ))}
          {!filteredTasks.length && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
              <Clock className="mx-auto h-9 w-9 text-slate-300" />
              <h3 className="mt-3 text-lg font-bold text-brand-navy">No hay tareas con estos filtros</h3>
              <p className="mt-1 text-slate-500">Crea una tarea o cambia los filtros para ver mas seguimiento.</p>
            </div>
          )}
        </section>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-navy/50 px-4 py-8">
          <form onSubmit={handleCreateTask} className="mx-auto max-w-2xl rounded-lg bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-xl font-bold text-brand-navy">Crear tarea</h3>
              <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                Lead relacionado
                <select value={form.lead_id} onChange={(event) => setForm({ ...form, lead_id: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                  <option value="">Seleccionar lead</option>
                  {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.full_name || lead.phone || 'Lead sin nombre'}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Tipo de tarea
                <select value={form.task_type} onChange={(event) => setForm({ ...form, task_type: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3">
                  {TASK_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Fecha de vencimiento
                <input type="datetime-local" value={form.due_at} onChange={(event) => setForm({ ...form, due_at: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3" />
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
                    <option value="">Usar asignado del lead</option>
                    {salesReps.map((rep) => <option key={rep.id} value={rep.id}>{rep.name}</option>)}
                  </select>
                </label>
              ) : (
                <label className="block text-sm font-semibold text-slate-700">
                  Asignado a
                  <input value={profile?.full_name || form.assigned_to} onChange={(event) => setForm({ ...form, assigned_to: event.target.value })} className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" placeholder="Nombre del vendedor" />
                </label>
              )}
            </div>
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              Notas
              <textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows="3" className="mt-2 w-full rounded-lg border border-slate-200 px-4 py-3 outline-none focus:border-brand-blue" />
            </label>
            <button type="submit" className="mt-5 w-full rounded-lg bg-brand-blue px-5 py-3 font-bold text-white hover:bg-blue-600">
              Guardar tarea
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ title, value, tone }) {
  const toneClass = {
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-brand-danger',
    green: 'bg-green-50 text-brand-success',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 flex items-center justify-between">
        <p className="text-3xl font-black text-brand-navy">{value}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>Fase 2</span>
      </div>
    </div>
  );
}



