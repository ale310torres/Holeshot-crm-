import React from 'react';

const stageColors = {
  'Nuevo lead': 'bg-blue-50 text-brand-blue',
  'Nuevo Lead': 'bg-blue-50 text-brand-blue',
  Contactado: 'bg-cyan-50 text-cyan-700',
  'No contesto': 'bg-slate-100 text-slate-700',
  Cualificando: 'bg-indigo-50 text-indigo-700',
  Interesado: 'bg-emerald-50 text-emerald-700',
  'Cita agendada': 'bg-purple-50 text-purple-700',
  'Cotizacion enviada': 'bg-amber-50 text-amber-700',
  'Oferta enviada': 'bg-amber-50 text-amber-700',
  Seguimiento: 'bg-yellow-50 text-yellow-700',
  'Cerrado ganado': 'bg-green-50 text-brand-success',
  'Cerrado perdido': 'bg-red-50 text-brand-danger',
};

export default function LeadStageBadge({ stage }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${stageColors[stage] || 'bg-slate-100 text-slate-700'}`}>
      {stage || 'Nuevo lead'}
    </span>
  );
}
