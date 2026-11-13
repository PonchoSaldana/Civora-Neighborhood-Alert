import React from 'react';
import { Link } from 'react-router-dom';
import { GitMerge, Check, X, AlertCircle } from 'lucide-react';
import { DuplicateCandidate } from '@shared/types.js';

interface DuplicateCardProps {
  candidate: DuplicateCandidate;
  onLink: (candidateId: string) => void;
  onDismiss: (candidateId: string) => void;
  loading?: boolean;
}

export const DuplicateCard: React.FC<DuplicateCardProps> = ({
  candidate,
  onLink,
  onDismiss,
  loading = false
}) => {
  return (
    <div
      className="glass-strong"
      style={{
        padding: '14px 16px',
        marginBottom: '12px',
        borderLeft: '4px solid var(--st-asignado)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GitMerge size={16} color="var(--st-asignado)" />
          <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
            Candidato a duplicado
          </span>
        </div>
        <span
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 700,
            color: 'var(--st-asignado)',
            background: 'var(--glass)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--st-asignado)'
          }}
        >
          {candidate.score} / 100
        </span>
      </div>

      <Link
        to={`/incidente/${candidate.candidateId}`}
        style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--accent)', display: 'block', marginBottom: '8px' }}
      >
        #{candidate.candidateId} — {candidate.candidateTitle}
      </Link>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 12px 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {candidate.reasons.map((r, i) => (
          <li key={i} style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--text-muted)' }} />
            {r}
          </li>
        ))}
      </ul>

      <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px', fontStyle: 'italic' }}>
        Vincular suma las confirmaciones al reporte principal y conserva ambos registros intactos.
      </p>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onDismiss(candidate.candidateId)}
          disabled={loading}
          className="btn-secondary"
          style={{ height: '34px', fontSize: 'var(--text-xs)', padding: '0 10px' }}
        >
          <X size={14} /> No es duplicado
        </button>
        <button
          onClick={() => onLink(candidate.candidateId)}
          disabled={loading}
          className="btn-primary"
          style={{ height: '34px', fontSize: 'var(--text-xs)', padding: '0 12px', background: 'var(--st-asignado)' }}
        >
          <GitMerge size={14} /> Vincular reporte
        </button>
      </div>
    </div>
  );
};

