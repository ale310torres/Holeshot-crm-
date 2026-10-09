import React,{useEffect,useState} from 'react';
import {zoho} from '../lib/zoho.js';
const input='w-full rounded-lg border border-slate-200 px-3 py-2';
const button='rounded-lg bg-brand-blue px-4 py-2 font-bold text-white disabled:opacity-50';
export default function ZohoDocuments({leadId}){
 const [connected,setConnected]=useState(false),[linked,setLinked]=useState(false),[docs,setDocs]=useState([]),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[search,setSearch]=useState(''),[contacts,setContacts]=useState([]),[selected,setSelected]=useState(''),[type,setType]=useState('estimate'),[items,setItems]=useState([{name:'',quantity:1,rate:''}]),[notes,setNotes]=useState(''),[requestId,setRequestId]=useState(()=>crypto.randomUUID());
 async function refresh(){
  const result=[];let isLinked=false;
  for(const type of ['invoice','estimate']){let page=1,more=true;while(more){const data=await zoho('documents',{lead_id:leadId,type,page});isLinked=data.linked;result.push(...data.documents);more=data.more;page++;}}
  setLinked(isLinked);setDocs(result.sort((a,b)=>String(b.document_date).localeCompare(String(a.document_date))));
 }
 async function run(fn){setBusy(true);setMessage('');try{await fn();}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 useEffect(()=>{let active=true;zoho('status').then(async data=>{if(!active)return;setConnected(data.connected);if(data.connected)await run(refresh);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false;};},[leadId]);
 return <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
  <h3 className="text-lg font-bold text-brand-navy">Cotizaciones y facturas · Zoho Books</h3>
  {message&&<p role="status" className="rounded-lg bg-blue-50 p-3 text-sm">{message}</p>}
  {!connected?<><p>Conecta Zoho para consultar documentos y crear borradores.</p><button className={button} disabled={busy} onClick={()=>run(async()=>{const data=await zoho('connect');window.location.assign(data.url);})}>Conectar Zoho Books</button></>:<>
   <button className={button} disabled={busy} onClick={()=>run(refresh)}>{busy?'Actualizando…':'Actualizar desde Zoho'}</button>
   <p className="text-sm text-slate-500">Los documentos corresponden al cliente vinculado, incluyendo sus distintas oportunidades. Actualiza para ver cambios hechos en Zoho.</p>
   <details open={!linked}><summary className="cursor-pointer font-semibold">{linked?'Cambiar cliente de Zoho':'Vincular cliente de Zoho'}</summary>
    <p className="my-2 text-sm">Confirma nombre y contacto antes de vincular. No se asocian clientes automáticamente por su nombre.</p>
    <label className="block">Buscar cliente<input className={input} value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <button className={button+' my-2'} disabled={busy||search.trim().length<2} onClick={()=>run(async()=>{const data=await zoho('contacts',{search});setContacts(data.contacts);setSelected('');if(data.more)setMessage('Hay más coincidencias; precisa la búsqueda.');else if(!data.contacts.length)setMessage('No se encontraron clientes. Crea el cliente en Zoho y vuelve a buscar.');})}>Buscar en Zoho</button>
    <select aria-label="Cliente de Zoho" className={input} value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Seleccionar cliente</option>{contacts.map(c=><option value={c.id} key={c.id}>{c.name} · {c.email||c.phone||c.id}</option>)}</select>
    <button className={button+' mt-2'} disabled={busy||!selected} onClick={()=>run(async()=>{await zoho('link',{lead_id:leadId,contact_id:selected});await refresh();})}>Confirmar vínculo</button>
   </details>
   {linked&&<>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Documento</th><th>Fecha</th><th>Estado</th><th>Total</th><th>Balance</th></tr></thead><tbody>{docs.map(d=><tr className="border-t" key={d.document_type+d.zoho_document_id}><td className="py-3"><a className="text-brand-blue underline" target="_blank" rel="noreferrer" href={`https://books.zoho.com/app/932241248#/${d.document_type==='invoice'?'invoices':'estimates'}/${d.zoho_document_id}`}>{d.document_type==='invoice'?'Factura':'Cotización'} {d.document_number}</a></td><td>{d.document_date}</td><td>{d.status}</td><td>{d.currency_code} {d.total}</td><td>{d.balance??'—'}</td></tr>)}</tbody></table>{!docs.length&&<p className="py-3">Este cliente no tiene documentos.</p>}</div>
    <details><summary className="cursor-pointer font-semibold">Crear cotización o factura</summary>
     <p className="my-3 text-sm">Se crea un borrador en Zoho. Revisa allí impuestos y términos antes de enviarlo al cliente. No registra pagos ni cambia la etapa de la oportunidad.</p>
     <select aria-label="Tipo de documento" className={input} value={type} onChange={e=>setType(e.target.value)}><option value="estimate">Cotización</option><option value="invoice">Factura</option></select>
     {items.map((item,index)=><div className="my-3 grid gap-2 sm:grid-cols-3" key={index}>{[['name','Concepto'],['quantity','Cantidad'],['rate','Precio unitario']].map(([key,label])=><label key={key}>{label}<input className={input} type={key==='name'?'text':'number'} min={key==='quantity'?'0.01':'0'} step="0.01" value={item[key]} onChange={e=>setItems(items.map((v,i)=>i===index?{...v,[key]:e.target.value}:v))}/></label>)}</div>)}
     <button className="font-bold text-brand-blue" disabled={busy||items.length>=50} onClick={()=>setItems([...items,{name:'',quantity:1,rate:''}])}>Añadir concepto</button>
     <label className="my-3 block">Notas<textarea className={input} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
     <button className={button} disabled={busy||items.some(i=>!i.name.trim()||i.rate===''||Number(i.quantity)<=0||Number(i.rate)<0)} onClick={()=>run(async()=>{await zoho('create',{lead_id:leadId,type,items,notes,request_id:requestId});setRequestId(crypto.randomUUID());setItems([{name:'',quantity:1,rate:''}]);setNotes('');await refresh();setMessage('Borrador creado. Revisa y envía desde Zoho.');})}>Crear borrador en Zoho</button>
    </details>
   </>}
  </>}
 </section>;
}
