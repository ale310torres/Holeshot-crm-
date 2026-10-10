export function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}
const email = value => String(value || '').trim().toLowerCase();
const name = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
export function duplicateReason(a, b) {
  if (a.id && a.id === b.id) return '';
  const phoneA = normalizePhone(a.phone), phoneB = normalizePhone(b.phone);
  if (phoneA.length >= 10 && phoneA === phoneB) return 'Mismo teléfono';
  if (email(a.email) && email(a.email) === email(b.email)) return 'Mismo correo';
  const nameA = name(a.full_name), nameB = name(b.full_name);
  if (nameA.length >= 3 && nameB.length >= 3 && (nameA === nameB || nameA.startsWith(`${nameB} `) || nameB.startsWith(`${nameA} `))) return 'Nombre parecido · confirmar identidad';
  return '';
}
export function duplicatePairs(leads) {
  const pairs = [];
  for (let i=0;i<leads.length;i++) for(let j=i+1;j<leads.length;j++) {
    const reason = duplicateReason(leads[i],leads[j]);
    if(reason) pairs.push({a:leads[i],b:leads[j],reason});
  }
  return pairs;
}
