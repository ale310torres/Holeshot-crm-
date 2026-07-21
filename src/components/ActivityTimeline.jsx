import React from 'react';
import { AlertTriangle, CheckCircle2, Clock, Mail, MessageCircle, NotebookPen, Phone, RefreshCcw } from 'lucide-react';
import { ACTIVITY_TYPE_LABELS } from '../utils/constants.js';
import { formatDate } from '../utils/formatters.js';

const iconMap = {
  lead_created: CheckCircle2,
  lead_updated: RefreshCcw,
  stage_changed: RefreshCcw,
  note_created: NotebookPen,
  call_logged: Phone,
  whatsapp_opened: MessageCircle,
  email_opened: Mail,
  task_created: Clock,
  task_completed: CheckCircle2,
  automation_error: AlertTriangle,
  facebook_lead_received: CheckCircle2,
};

export default function ActivityTimeline({ activities }) {
  if (!activities.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center">
        <h3 className="font-bold text-brand-navy">Sin actividades todavia</h3>
        <p className="mt-1 text-sm text-slate-500">Las llamadas, notas, cambios y tareas apareceran aqui.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = iconMap[activity.activity_type] || Clock;
        return (
          <article key={activity.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-blue">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                <p className="font-bold text-brand-navy">{ACTIVITY_TYPE_LABELS[activity.activity_type] || activity.activity_type}</p>
                <p className="text-xs text-slate-500">{formatDate(activity.created_at)}</p>
              </div>
              {activity.message && <p className="mt-1 text-sm text-slate-600">{activity.message}</p>}
              {(activity.channel || activity.direction) && (
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {[activity.channel, activity.direction].filter(Boolean).join(' / ')}
                </p>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}



