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
  const message = `Hola ${name || ''}, soy de ${businessName}. Recibimos tu solicitud y queria ayudarte con la informacion. Tienes unos minutos?`;
  return clean ? `https://wa.me/${clean.replace('+', '')}?text=${encodeURIComponent(message)}` : '#';
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



