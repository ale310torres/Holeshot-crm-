import React,{useEffect,useState} from 'react';
import {supabase} from '../lib/supabaseClient.js';
import {zoho} from '../lib/zoho.js';
export default function ZohoSync({organizationId,onUpdated}){
 const [state,setState]=useState(null),[issues,setIssues]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[automatic,setAutomatic]=useState(false);
 async function load(){
  const [status,pending,connection]=await Promise.all([
   supabase.from('zoho_sync_state').select('*').eq('organization_id',organizationId).maybeSingle(),
   supabase.from('zoho_imported_contacts').select('zoho_contact_id,contact_name,issue').eq('organization_id',organizationId).not('issue','is',null),
   zoho('status')
  ]);
  if(status.error||pending.error){setMessage('No se pudo consultar el estado de sincronización.');return;}
  setState(status.data);setIssues(pending.data||[]);setAutomatic(connection.background_enabled);
 }
 useEffect(()=>{if(organizationId)load().catch(()=>setMessage('No se pudo consultar la conexión de Zoho.'));},[organizationId]);
 async function sync(){setBusy(true);setMessage('');try{
  const result=await zoho('sync');
  setMessage(result.busy?'La sincronización ya está en curso.':result.completed?'Clientes y documentos actualizados.':'Se guardó el avance. Pulsa otra vez para continuar.');
  await load();await onUpdated();
 }catch(error){setMessage(error.message);}finally{setBusy(false);}}
 return <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
  <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-brand-navy">Clientes y documentos de Zoho</h3>
   <button className="rounded-lg bg-brand-blue px-4 py-2 font-bold text-white disabled:opacity-50" onClick={sync} disabled={busy}>{busy?'Sincronizando…':'Sincronizar Zoho ahora'}</button></div>
  <p className="text-sm text-slate-500">{automatic?'Actualización automática diaria habilitada.':'La actualización diaria está pendiente de activación; puedes sincronizar ahora.'} Los clientes importados aparecen con fuente «Zoho Books» y no se cuentan como captación ni se añaden al pipeline. No se cambian las etapas ni se registran pagos automáticamente.</p>
  <p className="text-sm">Última sincronización completa: {state?.last_completed_at?new Date(state.last_completed_at).toLocaleString('es-PR'):'Todavía no completada'}.</p>
  {(message||state?.last_error)&&<p role="status" className="text-sm">{message||state.last_error}</p>}
  {!!issues.length&&<details><summary className="cursor-pointer font-semibold">{issues.length} clientes requieren revisar el vínculo</summary>
   <ul className="mt-2 space-y-2 text-sm">{issues.map(c=><li key={c.zoho_contact_id}><a className="text-brand-blue underline" href={`https://books.zoho.com/app/932241248#/contacts/${c.zoho_contact_id}`} target="_blank" rel="noreferrer">{c.contact_name}</a>: {c.issue}. Corrige teléfono o correo, o vincula el cliente desde su ficha CRM y vuelve a sincronizar.</li>)}</ul>
  </details>}
 </section>;
}
