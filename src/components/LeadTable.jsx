import React from 'react';
import { Mail, Phone, UserCheck, MessageCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import LeadStageBadge from './LeadStageBadge.jsx';
import LeadTemperatureBadge from './LeadTemperatureBadge.jsx';
import { formatCurrency, formatLeadInterest, formatShortDate, formatVehicleSummary, getCallHref, getEmailHref, getWhatsAppHref } from '../utils/formatters.js';

export default function LeadTable({ leads, onMarkContacted, businessName }) {
  if (!leads.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center">
        <h3 className="text-lg font-bold text-brand-navy">No hay oportunidades todavia</h3>
        <p className="mt-2 text-slate-500">Registra una solicitud de servicio, una pieza o una cotizacion para empezar.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              {['Cliente', 'Telefono', 'Vehiculo', 'Solicitud', 'Urgencia', 'Cotizacion', 'Asignado', 'Etapa', 'Proxima accion', 'Fecha', 'Acciones'].map((header) => (
                <th key={header} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-slate-50">
                <td className="px-4 py-4">
                  <p className="font-semibold text-brand-navy">{lead.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-slate-500">{lead.property_city || lead.email || 'Sin zona'}</p>
                </td>
                <td className="px-4 py-4 text-sm text-slate-600">{lead.phone || '-'}</td>
                <td className="px-4 py-4 text-sm text-slate-600">{formatVehicleSummary(lead)}</td>
                <td className="max-w-[220px] px-4 py-4 text-sm text-slate-600">
                  <p className="font-semibold text-brand-navy">{formatLeadInterest(lead)}</p>
                  <p className="text-xs text-slate-500">{lead.part_number || lead.source || 'Manual'}</p>
                </td>
                <td className="px-4 py-4">
                  <LeadTemperatureBadge temperature={lead.urgency === 'Alta' ? 'Caliente' : lead.lead_temperature} />
                </td>
                <td className="px-4 py-4 text-sm font-bold text-brand-navy">{formatCurrency(lead.estimate_amount)}</td>
                <td className="px-4 py-4 text-sm font-semibold text-slate-700">{lead.sales_reps?.name || lead.assigned_to || 'Sin asignar'}</td>
                <td className="px-4 py-4"><LeadStageBadge stage={lead.stage} /></td>
                <td className="max-w-[220px] truncate px-4 py-4 text-sm text-slate-600">{lead.next_action || 'Sin proxima accion'}</td>
                <td className="px-4 py-4 text-sm text-slate-500">{formatShortDate(lead.created_at)}</td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <Link to={`/leads/${lead.id}`} className="rounded-lg bg-brand-navy p-2 text-white" title="Ver detalle">
                      <Eye className="h-4 w-4" />
                    </Link>
                    <a href={getCallHref(lead.phone)} className="rounded-lg bg-slate-100 p-2 text-slate-700" title="Llamar">
                      <Phone className="h-4 w-4" />
                    </a>
                    <a href={getWhatsAppHref(lead.phone, lead.full_name, businessName)} target="_blank" rel="noreferrer" className="rounded-lg bg-green-50 p-2 text-brand-success" title="WhatsApp">
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a href={getEmailHref(lead.email)} className="rounded-lg bg-blue-50 p-2 text-brand-blue" title="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                    <button onClick={() => onMarkContacted(lead)} className="rounded-lg bg-cyan-50 p-2 text-cyan-700" title="Marcar como contactado">
                      <UserCheck className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}



