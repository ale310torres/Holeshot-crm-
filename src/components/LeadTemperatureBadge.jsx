import React from 'react';

const tempColors = {
  Caliente: 'bg-red-50 text-red-700',
  Tibio: 'bg-yellow-50 text-yellow-700',
  Frio: 'bg-sky-50 text-sky-700',
  'Sin clasificar': 'bg-slate-100 text-slate-600',
};

export default function LeadTemperatureBadge({ temperature }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${tempColors[temperature] || tempColors['Sin clasificar']}`}>
      {temperature || 'Sin clasificar'}
    </span>
  );
}
