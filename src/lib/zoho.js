import { supabase } from './supabaseClient.js';
export async function zoho(action, body={}) {
 const {data:{session}}=await supabase.auth.getSession();
 if(!session) throw new Error('Inicia sesión nuevamente.');
 const response=await fetch(`/api/zoho/${action}`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();
 if(!response.ok) throw new Error(data.error||'No se pudo completar la operación.');
 return data;
}
