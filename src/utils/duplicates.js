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

// Customer view only: every original opportunity remains available and unchanged.
export function groupCustomerRecords(leads) {
  const confirmedPeyo = new Set(['2f1ee921-1aaa-4511-9f12-befd08db6f67','6df12c6e-5815-42cf-9279-782d60c5ede2']);
  const groups=[];
  for(const lead of leads) {
    const match=groups.find(group=>group.some(row=>{
      if(row.organization_id !== lead.organization_id)return false;
      if(confirmedPeyo.has(row.id)&&confirmedPeyo.has(lead.id))return true;
      return ['Mismo teléfono','Mismo correo'].includes(duplicateReason(row,lead));
    }));
    if(match)match.push(lead);else groups.push([lead]);
  }
  return groups.map(records=>{
    const primary=records.find(row=>row.source!=='Zoho Books')||records[0];
    return {...primary,customer_records:records};
  });
}
