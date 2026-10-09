import {test} from 'node:test';
import assert from 'node:assert/strict';
import {customerConversion} from '../src/utils/conversion.js';
test('counts paid Zoho customers once including imported customers in denominator',()=>{
 const leads=[{id:'a',phone:'7871234567'},{id:'b',phone:'+1 (787) 123-4567'},{id:'c',source:'Zoho Books'},{id:'d'}];
 const links=[{lead_id:'a',zoho_contact_id:'1'},{lead_id:'c',zoho_contact_id:'2'}];
 const docs=[{zoho_contact_id:'1',document_type:'invoice',status:'paid',total:100},{zoho_contact_id:'1',document_type:'invoice',status:'paid',total:50},{zoho_contact_id:'2',document_type:'invoice',status:'paid',total:200}];
 const result=customerConversion(leads,links,docs);
 assert.equal(result.total,3);assert.equal(result.converted,2);assert.ok(Math.abs(result.percentage-200/3)<1e-8);
});
test('does not count quotations, unpaid invoices or zero-value invoices as revenue',()=>{
 const leads=[{id:'a'},{id:'b'},{id:'c'}];const links=leads.map((l,i)=>({lead_id:l.id,zoho_contact_id:String(i)}));
 const docs=[{zoho_contact_id:'0',document_type:'estimate',status:'paid',total:100},{zoho_contact_id:'1',document_type:'invoice',status:'sent',total:100},{zoho_contact_id:'2',document_type:'invoice',status:'paid',total:0}];
 assert.equal(customerConversion(leads,links,docs).converted,0);
});
test('preserves manual deposit conversion and separates records without identity',()=>{
 const result=customerConversion([{id:'a',payment_status:'Deposito recibido'},{id:'b'},{id:'c'}]);
 assert.equal(result.total,3);assert.equal(result.converted,1);
});
