import { test } from 'node:test';
import assert from 'node:assert/strict';
import {duplicateReason,duplicatePairs,groupCustomerRecords} from '../src/utils/duplicates.js';
test('normalizes US phones and email without matching empty or short contacts',()=>{
 assert.equal(duplicateReason({phone:'+1 (787) 555-1234'},{phone:'7875551234'}),'Mismo teléfono');
 assert.equal(duplicateReason({email:' USER@Example.com '},{email:'user@example.com'}),'Mismo correo');
 assert.equal(duplicateReason({phone:'1234'},{phone:'1234'}),'');
 assert.equal(duplicateReason({},{ }), '');
 assert.equal(duplicateReason({phone:'+447875551234'},{phone:'7875551234'}),'');
});
test('customer view groups exact identities and confirmed Peyo but retains all work records',()=>{
 const rows=[{id:'a',organization_id:'org',phone:'+17875551234',full_name:'Juan'},{id:'b',organization_id:'org',phone:'7875551234',full_name:'Juan X',source:'Zoho Books'},{id:'c',organization_id:'org',full_name:'Jose'},{id:'d',organization_id:'org',full_name:'Jose'}];
 const grouped=groupCustomerRecords(rows);
 assert.equal(grouped.length,3);assert.equal(grouped[0].customer_records.length,2);assert.equal(rows.length,4);
 assert.equal(groupCustomerRecords([{id:'2f1ee921-1aaa-4511-9f12-befd08db6f67',full_name:'PEYO'},{id:'6df12c6e-5815-42cf-9279-782d60c5ede2',full_name:'Peyo XR'}]).length,1);
 assert.equal(groupCustomerRecords([{id:'1',organization_id:'a',phone:'7875551234'},{id:'2',organization_id:'b',phone:'7875551234'}]).length,2);
});
test('flags name variants for review without merging or flagging unrelated prefixes',()=>{
 assert.equal(duplicatePairs([{id:'1',full_name:'PEYO'},{id:'2',full_name:'Peyo XR'}]).length,1);
 assert.ok(duplicateReason({full_name:'José Torres'},{full_name:'JOSE TORRES'}).includes('confirmar'));
 assert.equal(duplicateReason({full_name:'Ana'},{full_name:'Anabel'}),'');
 assert.equal(duplicateReason({id:'1',phone:'7875551234'},{id:'1',phone:'7875551234'}),'');
});
