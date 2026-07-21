import React from 'react';

export default function MetricCard({ title, value, helper, tone = 'blue' }) {
  const toneClass = {
    blue: 'bg-blue-50 text-brand-blue',
    cyan: 'bg-cyan-50 text-cyan-600',
    green: 'bg-green-50 text-brand-success',
    red: 'bg-red-50 text-brand-danger',
    yellow: 'bg-yellow-50 text-yellow-700',
    navy: 'bg-slate-100 text-brand-navy',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold text-brand-navy">{value}</p>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${toneClass}`}>{helper}</span>
      </div>
    </div>
  );
}



