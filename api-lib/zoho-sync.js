import crypto from 'node:crypto';
export async function syncOrganization(client,org,access,books,documentRow,{budgetMs=40000}={}) {
 const started=Date.now();
 const inserted=await client.from('zoho_sync_state').upsert({organization_id:org},{onConflict:'organization_id',ignoreDuplicates:true});
 if(inserted.error) throw new Error('Sync state unavailable');
 const lease=await client.from('zoho_sync_state').update({locked_until:new Date(Date.now()+90000).toISOString()})
  .eq('organization_id',org).lt('locked_until',new Date().toISOString()).select('*').maybeSingle();
 if(lease.error) throw new Error('Sync lock unavailable');
 if(!lease.data) return {busy:true};
 let resource=lease.data.resource,page=lease.data.page,processed=0,pending=0,completed=false;
 try {
  while(Date.now()-started<budgetMs){
   const query=new URLSearchParams({page:String(page),per_page:'25',...(resource==='contacts'?{contact_type:'customer'}:{})});
   const batch=await books(access,`${resource}?${query}`);
   for(const item of batch[resource]||[]){
    if(resource==='contacts'){
     if(item.contact_type && item.contact_type!=='customer')continue;
     const result=await client.rpc('zoho_import_contact',{p_org:org,p_contact:item});
     if(result.error)throw new Error('Contact import failed');
     if(result.data!=='linked')pending++;
    }else{
     const row=documentRow(org,resource==='invoices'?'invoice':'estimate',item);
     const result=await client.from('zoho_documents').upsert(row);
     if(result.error)throw new Error('Document sync failed');
    }
    processed++;
   }
   if(batch.page_context?.has_more_page)page++;
   else if(resource==='contacts'){resource='invoices';page=1;}
   else if(resource==='invoices'){resource='estimates';page=1;}
   else{resource='contacts';page=1;completed=true;}
   const saved=await client.from('zoho_sync_state').update({resource,page,updated_at:new Date().toISOString(),last_error:null,
    ...(completed?{last_completed_at:new Date().toISOString()}:{}),locked_until:new Date(Date.now()+90000).toISOString()}).eq('organization_id',org);
   if(saved.error)throw new Error('Sync checkpoint failed');
   if(completed)break;
  }
  return {completed,processed,pending};
 }catch(error){
  await client.from('zoho_sync_state').update({last_error:'No se completó la sincronización. Reintenta o revisa la conexión Zoho.'}).eq('organization_id',org);
  throw error;
 }finally{
  await client.from('zoho_sync_state').update({locked_until:'1970-01-01T00:00:00Z'}).eq('organization_id',org);
 }
}

export function validCronAuthorization(header,secret){
 if(!secret||secret.length<32||typeof header!=='string')return false;
 // Constant length digest comparison avoids leaking the credential through timing.
 const digest=value=>crypto.createHash('sha256').update(value).digest();
 return crypto.timingSafeEqual(digest(header),digest(`Bearer ${secret}`));
}
