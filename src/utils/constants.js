export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Holeshot CRM';

export const LEAD_STAGES = [
  'Nuevo lead',
  'Contactado',
  'No contesto',
  'Cualificando',
  'Interesado',
  'Cotizacion enviada',
  'Seguimiento',
  'Cerrado ganado',
  'Cerrado perdido',
];

export const LEAD_TEMPERATURES = ['Caliente', 'Tibio', 'Frio', 'Sin clasificar'];

export const TASK_STATUSES = ['pending', 'completed', 'cancelled'];

export const TASK_STATUS_LABELS = {
  pending: 'Pendiente',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const TASK_TYPES = [
  { value: 'first_follow_up', label: 'Primer seguimiento' },
  { value: 'call', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'quote_follow_up', label: 'Seguimiento de cotizacion' },
  { value: 'service_follow_up', label: 'Seguimiento de servicio' },
  { value: 'general', label: 'General' },
];

export const TASK_TYPE_LABELS = TASK_TYPES.reduce((labels, item) => {
  labels[item.value] = item.label;
  return labels;
}, {});

export const USER_ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'rep', label: 'Rep' },
];

export const ROLE_LABELS = USER_ROLES.reduce((labels, item) => {
  labels[item.value] = item.label;
  return labels;
}, {});

export const ACTIVITY_TYPES = [
  'lead_created',
  'lead_updated',
  'stage_changed',
  'note_created',
  'call_logged',
  'whatsapp_opened',
  'email_opened',
  'task_created',
  'task_completed',
  'automation_error',
];

export const ACTIVITY_TYPE_LABELS = {
  lead_created: 'Lead creado',
  lead_updated: 'Lead actualizado',
  stage_changed: 'Etapa cambiada',
  note_created: 'Nota creada',
  call_logged: 'Llamada registrada',
  whatsapp_opened: 'WhatsApp abierto',
  email_opened: 'Email abierto',
  task_created: 'Tarea creada',
  task_completed: 'Tarea completada',
  automation_error: 'Error de automatizacion',
  facebook_lead_received: 'Lead recibido de Facebook',
};

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/', enabled: true },
  { label: 'Leads', path: '/leads', enabled: true },
  { label: 'Pipeline', path: '/pipeline', enabled: true },
  { label: 'Tareas', path: '/tareas', enabled: true },
  { label: 'Reportes', path: '/reportes', enabled: false },
  { label: 'Usuarios', path: '/usuarios', enabled: true },
  { label: 'Configuracion', path: '/configuracion', enabled: true },
];

export const SOURCES = [
  'Manual',
  'WhatsApp',
  'Instagram',
  'Referido',
  'Local',
  'Web',
  'Evento',
  'Marketplace',
  'n8n',
  'Otro',
];



