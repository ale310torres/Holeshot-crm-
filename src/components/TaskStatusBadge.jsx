import React from 'react';
import { TASK_STATUS_LABELS } from '../utils/constants.js';
import { isOverdue } from '../utils/formatters.js';

export default function TaskStatusBadge({ status, dueAt }) {
  const overdue = status === 'pending' && isOverdue(dueAt);
  const label = overdue ? 'Vencida' : TASK_STATUS_LABELS[status] || status;
  const className = overdue
    ? 'bg-red-50 text-brand-danger'
    : {
        pending: 'bg-yellow-50 text-yellow-700',
        completed: 'bg-green-50 text-brand-success',
        cancelled: 'bg-slate-100 text-slate-600',
      }[status] || 'bg-slate-100 text-slate-600';

  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${className}`}>{label}</span>;
}



