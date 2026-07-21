import React from 'react';

const stageColors = {
  'Nueva solicitud': 'bg-blue-50 text-brand-blue',
  'Nuevo lead': 'bg-blue-50 text-brand-blue',
  'Nuevo Lead': 'bg-blue-50 text-brand-blue',
  Contactado: 'bg-cyan-50 text-cyan-700',
  'No contesto': 'bg-slate-100 text-slate-700',
  'Validando vehiculo': 'bg-indigo-50 text-indigo-700',
  'Cotizacion enviada': 'bg-amber-50 text-amber-700',
  'Esperando piezas': 'bg-orange-50 text-orange-700',
  'Servicio agendado': 'bg-purple-50 text-purple-700',
  'En trabajo': 'bg-teal-50 text-teal-700',
  Seguimiento: 'bg-yellow-50 text-yellow-700',
  'Listo para entregar': 'bg-lime-50 text-lime-700',
  'Cerrado ganado': 'bg-green-50 text-brand-success',
  'Cerrado perdido': 'bg-red-50 text-brand-danger',
};

export default function LeadStageBadge({ stage }) {
  const normalizedStage =
    stage === 'Nuevo Lead' || stage === 'Nuevo lead'
      ? 'Nueva solicitud'
      : stage === 'Cualificando' || stage === 'Interesado'
        ? 'Validando vehiculo'
        : stage === 'Cita agendada'
          ? 'Servicio agendado'
          : stage === 'No contesto'
            ? 'Seguimiento'
            : stage || 'Nueva solicitud';

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${stageColors[normalizedStage] || 'bg-slate-100 text-slate-700'}`}>
      {normalizedStage}
    </span>
  );
}
