import {paymentForStage} from '../utils/conversion.js';
export async function savePipelineStage(client,organizationId,lead,nextStage){
 const {data,error}=await client.from('leads')
  .update({stage:nextStage,payment_status:paymentForStage(nextStage,lead.payment_status),updated_at:new Date().toISOString()})
  .eq('id',lead.id).eq('organization_id',organizationId)
  .select('id,stage,payment_status').single();
 if(error||!data)throw new Error('No se pudo guardar la etapa. Actualiza el pipeline y vuelve a intentar.');
 return data;
}
