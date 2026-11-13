import { IncidentStatus } from './types.js';

export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  RECIBIDO: ['EN_REVISION', 'NO_PROCEDENTE'],
  EN_REVISION: ['ASIGNADO', 'NO_PROCEDENTE'],
  ASIGNADO: ['EN_PROCESO', 'NO_PROCEDENTE'],
  EN_PROCESO: ['RESUELTO', 'NO_PROCEDENTE'],
  RESUELTO: [],
  NO_PROCEDENTE: []
};

export interface StatusValidationResult {
  allowed: boolean;
  reason?: string;
}

export function validateStatusTransition(
  currentStatus: IncidentStatus,
  targetStatus: IncidentStatus,
  note?: string
): StatusValidationResult {
  if (currentStatus === targetStatus) {
    return { allowed: false, reason: `El incidente ya se encuentra en estado ${currentStatus}.` };
  }

  const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      allowed: false,
      reason: `Transición no válida: no se puede pasar de ${currentStatus} a ${targetStatus}. Transiciones válidas: ${allowedNext.join(', ') || 'Ninguna (estado terminal)'}.`
    };
  }

  if (targetStatus === 'NO_PROCEDENTE' && (!note || note.trim().length < 5)) {
    return {
      allowed: false,
      reason: 'El estado NO_PROCEDENTE exige un motivo o nota pública de al menos 5 caracteres.'
    };
  }

  return { allowed: true };
}

