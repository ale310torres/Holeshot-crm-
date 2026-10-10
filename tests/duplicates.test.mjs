import { test } from 'node:test';
import assert from 'node:assert/strict';
import {duplicateReason,duplicatePairs} from '../src/utils/duplicates.js';
test('normalizes US phones and email without matching empty or short contacts',()=>{
 assert.equal(duplicateReason({phone:'+1 (787) 555-1234'},{phone:'7875551234'}),'Mismo teléfono');
 assert.equal(duplicateReason({email:' USER@Example.com '},{email:'user@example.com'}),'Mismo correo');
 assert.equal(duplicateReason({phone:'1234'},{phone:'1234'}),'');
 assert.equal(duplicateReason({},{ }), '');
 assert.equal(duplicateReason({phone:'+447875551234'},{phone:'7875551234'}),'');
});
test('flags name variants for review without merging or flagging unrelated prefixes',()=>{
 assert.equal(duplicatePairs([{id:'1',full_name:'PEYO'},{id:'2',full_name:'Peyo XR'}]).length,1);
 assert.ok(duplicateReason({full_name:'José Torres'},{full_name:'JOSE TORRES'}).includes('confirmar'));
 assert.equal(duplicateReason({full_name:'Ana'},{full_name:'Anabel'}),'');
 assert.equal(duplicateReason({id:'1',phone:'7875551234'},{id:'1',phone:'7875551234'}),'');
});
