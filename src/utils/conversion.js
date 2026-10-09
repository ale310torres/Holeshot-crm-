export const DEPOSIT_STAGE = 'Venta confirmada - deposito recibido';
export const COMPLETED_STAGE = 'Trabajo completado y pagado';

export function paymentForStage(stage, current) {
  if (stage === COMPLETED_STAGE) return 'Pagado';
  if (stage === DEPOSIT_STAGE) return current === 'Pagado' ? current : 'Deposito recibido';
  return current || 'Pendiente';
}

export function isConverted(lead) {
  return [DEPOSIT_STAGE, COMPLETED_STAGE].includes(lead.stage)
    || ['Deposito recibido', 'Pagado', 'Balance pendiente'].includes(lead.payment_status);
}

export function isCompleted(lead) {
  return lead.stage === COMPLETED_STAGE;
}

