import React from 'react';
import { IncidentStatus, STATUS_LABELS } from '@shared/types.js';

interface StatusChipProps {
  status: IncidentStatus;
  isProcessing?: boolean;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, isProcessing }) => {
  const getStatusColorVar = (st: IncidentStatus) => {
    switch (st) {
      case 'RECIBIDO': return 'var(--st-recibido)';
      case 'EN_REVISION': return 'var(--st-revision)';
      case 'ASIGNADO': return 'var(--st-asignado)';
      case 'EN_PROCESO': return 'var(--st-proceso)';
      case 'RESUELTO': return 'var(--st-resuelto)';
      case 'NO_PROCEDENTE': return 'var(--st-no-proced)';
    }
  };

  return (
    <span
      className="glass"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 10px',
        borderRadius: 'var(--radius-pill)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        color: 'var(--text)',
        letterSpacing: '0.01em',
        border: '1px solid var(--hairline)'
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: isProcessing ? 'var(--st-proceso)' : getStatusColorVar(status),
          boxShadow: isProcessing ? '0 0 6px var(--st-proceso)' : undefined,
          display: 'inline-block'
        }}
      />
      {isProcessing ? 'Procesando validación...' : STATUS_LABELS[status]}
    </span>
  );
};

