import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const ORIGIN = 'https://holeshot-crm.vercel.app';
const CALLBACK = `${ORIGIN}/api/zoho/callback`;
const ZOHO_ORG = '932241248';
const SCOPES = 'ZohoBooks.contacts.READ,ZohoBooks.estimates.READ,ZohoBooks.estimates.CREATE,ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE,ZohoBooks.settings.READ';
function env(name) { if (!process.env[name]) throw new Error('Configuration unavailable'); return process.env[name]; }
function db() { return createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}}); }
function hash(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function cipher(value, decrypt=false) {
  const key=Buffer.from(env('ZOHO_TOKEN_ENCRYPTION_KEY'),'base64');
  if (key.length!==32) throw new Error('Configuration unavailable');
  if (decrypt) {
    const [iv,tag,data]=value.split('.').map(v=>Buffer.from(v,'base64'));
    const dec=crypto.createDecipheriv('aes-256-gcm',key,iv); dec.setAuthTag(tag);
    return Buffer.concat([dec.update(data),dec.final()]).toString();
  }
  const iv=crypto.randomBytes(12), enc=crypto.createCipheriv('aes-256-gcm',key,iv);
  const data=Buffer.concat([enc.update(value,'utf8'),enc.final()]);
  return [iv,enc.getAuthTag(),data].map(v=>v.toString('base64')).join('.');
}
async function token(params) {
  const result=await fetch('https://accounts.zoho.com/oauth/v2/token',{method:'POST',body:new URLSearchParams({client_id:env('ZOHO_CLIENT_ID'),client_secret:env('ZOHO_CLIENT_SECRET'),...params}),signal:AbortSignal.timeout(20000)});
  const data=await result.json(); if (!result.ok || !data.access_token) throw new Error('Zoho authorization failed'); return data;
}
async function books(access,path,body) {
  const result=await fetch(`https://www.zohoapis.com/books/v3/${path}${path.includes('?')?'&':'?'}organization_id=${ZOHO_ORG}`,{method:body?'POST':'GET',headers:{Authorization:`Zoho-oauthtoken ${access}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
  const data=await result.json(); if (!result.ok || data.code!==0) throw new Error('Zoho request failed'); return data;
}
async function manager(req,client) {
  const bearer=req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!bearer) throw new Error('Unauthorized');
  const {data,error}=await client.auth.getUser(bearer);
  if (error || !data.user) throw new Error('Unauthorized');
  const result=await client.from('crm_user_profiles').select('organization_id,role').eq('user_id',data.user.id).eq('active',true).single();
  if (result.error || !['owner','admin','manager'].includes(result.data?.role)) throw new Error('Unauthorized');
  return result.data;
}
export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  try {
    const client=db(), action=req.query.action;
    if (action==='callback') {
      if (req.method!=='GET') return res.status(405).end();
      const {state,code}=req.query;
      if (typeof state!=='string' || typeof code!=='string') return res.status(400).send('Autorización incompleta');
      const used=await client.from('zoho_oauth_states').delete().eq('state_hash',hash(state)).gt('expires_at',new Date().toISOString()).select().maybeSingle();
      if (used.error || !used.data) return res.status(400).send('Autorización vencida o ya utilizada');
      const credentials=await token({grant_type:'authorization_code',code,redirect_uri:CALLBACK});
      if (!credentials.refresh_token) throw new Error('Refresh token missing');
      const organizations=await books(credentials.access_token,'organizations');
      if (!organizations.organizations?.some(o=>String(o.organization_id)===ZOHO_ORG)) throw new Error('Wrong Zoho organization');
      const saved=await client.from('zoho_connections').upsert({organization_id:used.data.organization_id,zoho_organization_id:ZOHO_ORG,encrypted_refresh_token:cipher(credentials.refresh_token)});
      if (saved.error) throw new Error('Connection persistence failed');
      return res.redirect(303,`${ORIGIN}/?zoho=connected`);
    }
    const profile=await manager(req,client);
    if (req.method!=='POST') return res.status(405).end();
    if (req.headers.origin && req.headers.origin!==ORIGIN) return res.status(403).end();
    if (action==='connect') {
      const state=crypto.randomBytes(32).toString('hex');
      const saved=await client.from('zoho_oauth_states').insert({state_hash:hash(state),organization_id:profile.organization_id,expires_at:new Date(Date.now()+600000).toISOString()});
      if(saved.error) throw new Error('Cannot prepare authorization');
      return res.json({url:'https://accounts.zoho.com/oauth/v2/auth?'+new URLSearchParams({scope:SCOPES,client_id:env('ZOHO_CLIENT_ID'),response_type:'code',access_type:'offline',prompt:'consent',redirect_uri:CALLBACK,state})});
    }
    const connection=await client.from('zoho_connections').select('*').eq('organization_id',profile.organization_id).single();
    if(action==='status') return res.json({connected:!!connection.data&&!connection.error});
    if (connection.error) return res.status(409).json({error:'Primero conecta Zoho Books.'});
    const access=(await token({grant_type:'refresh_token',refresh_token:cipher(connection.data.encrypted_refresh_token,true)})).access_token;
    const body=req.body||{};
    if(action==='contacts') {
      const query=String(body.search||'').trim().slice(0,100);
      if(query.length<2) return res.status(400).json({error:'Escribe al menos dos caracteres.'});
      const result=await books(access,'contacts?'+new URLSearchParams({search_text:query,contact_type:'customer',per_page:'100'}));
      return res.json({contacts:(result.contacts||[]).map(c=>({id:String(c.contact_id),name:c.contact_name,email:c.email,phone:c.phone||c.mobile})),more:!!result.page_context?.has_more_page});
    }
    if(['link','documents','create'].includes(action)) {
      const lead=await client.from('leads').select('id').eq('id',body.lead_id).eq('organization_id',profile.organization_id).maybeSingle();
      if(lead.error||!lead.data) return res.status(404).json({error:'Cliente no encontrado.'});
      if(action==='link') {
        const id=String(body.contact_id||'');
        if(!/^\d{1,30}$/.test(id)) return res.status(400).json({error:'Cliente de Zoho no válido.'});
        const contact=(await books(access,`contacts/${id}`)).contact;
        if(!contact||contact.contact_type!=='customer') return res.status(400).json({error:'Selecciona un cliente de Zoho.'});
        const saved=await client.from('zoho_customer_links').upsert({organization_id:profile.organization_id,lead_id:body.lead_id,zoho_contact_id:id});
        if(saved.error) throw new Error('Link failed');
        return res.json({linked:true});
      }
      const link=await client.from('zoho_customer_links').select('zoho_contact_id').eq('organization_id',profile.organization_id).eq('lead_id',body.lead_id).maybeSingle();
      if(link.error) throw new Error('Link unavailable');
      if(!link.data) return res.json({linked:false,documents:[]});
      const contactId=link.data.zoho_contact_id;
      if(action==='documents') {
        const type=body.type==='estimate'?'estimate':'invoice';
        const page=Number(body.page||1);
        if(!Number.isSafeInteger(page)||page<1||page>10000) return res.status(400).json({error:'Página no válida.'});
        const resource=type+'s';
        const batch=await books(access,`${resource}?`+new URLSearchParams({customer_id:contactId,page:String(page),per_page:'100'}));
        const documents=(batch[resource]||[]).map(d=>documentRow(profile.organization_id,type,d));
        if(documents.length){const saved=await client.from('zoho_documents').upsert(documents);if(saved.error)throw new Error('Persistence failed');}
        return res.json({linked:true,contact_id:contactId,documents,more:!!batch.page_context?.has_more_page,page});
      }
      const type=body.type, requestId=body.request_id;
      if(!['invoice','estimate'].includes(type)||! /^[a-f0-9-]{36}$/i.test(requestId||'')||!Array.isArray(body.items)||body.items.length<1||body.items.length>50) return res.status(400).json({error:'Documento no válido.'});
      const items=body.items.map(i=>({name:String(i.name||'').trim().slice(0,150),quantity:Number(i.quantity),rate:Number(i.rate),...(i.tax_id?{tax_id:String(i.tax_id)}:{})}));
      if(items.some(i=>!i.name||!Number.isFinite(i.quantity)||i.quantity<=0||!Number.isFinite(i.rate)||i.rate<0||i.quantity>1e6||i.rate>1e7)) return res.status(400).json({error:'Revisa los conceptos, cantidades y precios.'});
      const claimed=await client.from('zoho_creation_requests').insert({organization_id:profile.organization_id,request_id:requestId,lead_id:body.lead_id,document_type:type});
      if(claimed.error){
        const existing=await client.from('zoho_creation_requests').select('zoho_document_id').eq('organization_id',profile.organization_id).eq('request_id',requestId).maybeSingle();
        return res.status(409).json({error:existing.data?.zoho_document_id?'Este documento ya fue creado. Actualiza la lista.':'Solicitud en proceso o resultado pendiente. Revisa Zoho antes de volver a crear.'});
      }
      const created=(await books(access,type+'s',{customer_id:contactId,reference_number:`CRM-${requestId}`,date:new Date().toLocaleDateString('en-CA',{timeZone:'America/Puerto_Rico'}),line_items:items,notes:String(body.notes||'').slice(0,2000)}))[type];
      const row=documentRow(profile.organization_id,type,created);
      const saved=await client.from('zoho_documents').upsert(row);
      const marked=await client.from('zoho_creation_requests').update({zoho_document_id:row.zoho_document_id}).eq('organization_id',profile.organization_id).eq('request_id',requestId);
      if(saved.error||marked.error) throw new Error('Created but persistence pending');
      return res.json({document:row});
    }
    return res.status(404).json({error:'Acción no disponible'});
  } catch(error) {
    return res.status(error.message==='Unauthorized'?401:503).json({error:error.message==='Unauthorized'?'Acceso no autorizado.':'No se pudo completar la conexión. Revisa su configuración e inténtalo nuevamente.'});
  }
}
function documentRow(org,type,d){return {organization_id:org,zoho_document_id:String(d[`${type}_id`]),document_type:type,zoho_contact_id:String(d.customer_id),document_number:d[`${type}_number`],document_date:d.date,status:d.status,currency_code:d.currency_code,total:d.total,balance:d.balance??null,synced_at:new Date().toISOString()};}

