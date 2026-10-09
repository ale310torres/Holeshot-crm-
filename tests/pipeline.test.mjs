import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {savePipelineStage} from '../src/lib/pipeline.js';
test('persists the stage using a real Supabase query builder and returns the saved row',async()=>{
 let request;
 const client=createClient('https://example.supabase.co','test',{global:{fetch:async(url,options)=>{
  request={url:new URL(url),options};return new Response(JSON.stringify({id:'lead',stage:'Contactado',payment_status:'Pendiente'}),{headers:{'Content-Type':'application/json'}});
 }}});
 const saved=await savePipelineStage(client,'org',{id:'lead',payment_status:'Pendiente'},'Contactado');
 assert.equal(request.options.method,'PATCH');assert.equal(request.url.searchParams.get('id'),'eq.lead');
 assert.equal(request.url.searchParams.get('organization_id'),'eq.org');assert.equal(JSON.parse(request.options.body).stage,'Contactado');
 assert.equal(saved.stage,'Contactado');
});
test('does not treat a missing updated row as success',async()=>{
 const client=createClient('https://example.supabase.co','test',{global:{fetch:async()=>new Response(JSON.stringify({code:'PGRST116',message:'No rows'}),{status:406,headers:{'Content-Type':'application/json'}})}});
 await assert.rejects(savePipelineStage(client,'org',{id:'lead'},'Contactado'),/No se pudo guardar/);
});
test('saved deposit stage also records deposit payment status',async()=>{
 let body;
 const client=createClient('https://example.supabase.co','test',{global:{fetch:async(url,options)=>{
  body=JSON.parse(options.body);return new Response(JSON.stringify({id:'lead',...body}),{headers:{'Content-Type':'application/json'}});
 }}});
 await savePipelineStage(client,'org',{id:'lead',payment_status:'Pendiente'},'Venta confirmada - deposito recibido');
 assert.equal(body.payment_status,'Deposito recibido');
});
