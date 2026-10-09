export const DEPOSIT_STAGE = 'Venta confirmada - deposito recibido';
export const COMPLETED_STAGE = 'Trabajo completado y pagado';

export function paymentForStage(stage, current) {
  if (stage === COMPLETED_STAGE) return 'Pagado';
  if (stage === DEPOSIT_STAGE) return current === 'Pagado' ? current : 'Deposito recibido';
  return current || 'Pendiente';
}

export function isConverted(lead) {
  return lead.zoho_paid === true || [DEPOSIT_STAGE, COMPLETED_STAGE].includes(lead.stage)
    || ['Deposito recibido', 'Pagado', 'Balance pendiente'].includes(lead.payment_status);
}

export function customerConversion(leads,links=[],documents=[]){
  const byLead=new Map(links.map(l=>[l.lead_id,l.zoho_contact_id]));
  const paid=new Set(documents.filter(d=>d.document_type==='invoice'&&d.status==='paid'&&Number(d.total)>0).map(d=>d.zoho_contact_id));
  const phone=value=>{let n=String(value||'').replace(/\D/g,'');if(n.length===11&&n[0]==='1')n=n.slice(1);return n.length===10?n:'';};
  const email=value=>String(value||'').trim().toLowerCase();
  const owners=new Map();
  for(const lead of leads){const contact=byLead.get(lead.id);if(!contact)continue;
    for(const key of [phone(lead.phone)&&'p:'+phone(lead.phone),email(lead.email)&&'e:'+email(lead.email)].filter(Boolean)){
      const values=owners.get(key)||new Set();values.add(contact);owners.set(key,values);
    }
  }
  const customers=new Map();
  for(const lead of leads){
    const identities=[phone(lead.phone)&&'p:'+phone(lead.phone),email(lead.email)&&'e:'+email(lead.email)].filter(Boolean);
    const inferred=new Set(identities.flatMap(key=>[...(owners.get(key)||[])]));
    const contact=byLead.get(lead.id)||(inferred.size===1?[...inferred][0]:null);
    const key=contact?'z:'+contact:identities[0]||'l:'+lead.id;
    customers.set(key,!!customers.get(key)||isConverted(lead)||!!(contact&&paid.has(contact)));
  }
  const total=customers.size,converted=[...customers.values()].filter(Boolean).length;
  return {total,converted,percentage:total?converted/total*100:0,paidContacts:paid};
}

export function isCompleted(lead) {
  return lead.stage === COMPLETED_STAGE;
}
