export function intakeWindow(days,asOf){
 const count=Number(days);
 if(![1,7,30].includes(count))return null;
 const end=asOf&&Number.isFinite(Date.parse(asOf))?new Date(asOf):new Date();
 return {days:count,start:new Date(end.getTime()-count*86400000).toISOString(),end:end.toISOString()};
}
export async function loadIntakeLeads(client,organizationId,window){
 const rows=[];
 for(let offset=0;;offset+=500){
  let query=client.from('leads').select('*, sales_reps(id, name, initials)').eq('organization_id',organizationId);
  if(window)query=query.or('source.is.null,source.neq.Zoho Books').gte('created_at',window.start).lte('created_at',window.end);
  const {data,error}=await query.order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+499);
  if(error)throw error;
  rows.push(...(data||[]));
  if(!data||data.length<500)return rows;
 }
}
