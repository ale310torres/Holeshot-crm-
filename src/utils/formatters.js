export function formatDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value) {
  if (!value) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-PR', { dateStyle: 'medium' }).format(new Date(value));
}

export function cleanPhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}

export function getCallHref(phone) {
  return phone ? `tel:${cleanPhone(phone)}` : '#';
}

export function getEmailHref(email) {
  return email ? `mailto:${email}` : '#';
}

export function getWhatsAppHref(phone, name, businessName = 'Holeshot') {
  const clean = cleanPhone(phone);
  const message = `Hola ${name || ''}, soy de ${businessName}. Recibimos tu solicitud sobre servicio o piezas y queria ayudarte con la informacion. Tienes unos minutos?`;
  return clean ? `https://wa.me/${clean.replace('+', '')}?text=${encodeURIComponent(message)}` : '#';
}

export function formatCurrency(value) {
  const amount = Number(value || 0);
  if (!amount) return '-';
  return new Intl.NumberFormat('es-PR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatVehicleSummary(lead) {
  const year = lead?.vehicle_year ? String(lead.vehicle_year) : '';
  const make = lead?.vehicle_make || '';
  const model = lead?.vehicle_model || '';
  const cc = lead?.engine_cc ? `${lead.engine_cc}cc` : '';
  const type = lead?.vehicle_type || '';
  const summary = [year, make, model, cc].filter(Boolean).join(' ');
  return summary || type || 'Vehiculo sin especificar';
}

export function formatLeadInterest(lead) {
  const interest = lead?.interest_type || 'Servicio';
  const detail = lead?.requested_service || lead?.requested_part || lead?.service_interest || lead?.service_category || '';
  return detail ? `${interest}: ${detail}` : interest;
}

export function percentage(value) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

export function formatDateTimeLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function toIsoFromLocalInput(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function isOverdue(value) {
  if (!value) return false;
  return new Date(value).getTime() < Date.now();
}



