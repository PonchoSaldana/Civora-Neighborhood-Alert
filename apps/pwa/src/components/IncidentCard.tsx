import React from 'react';
import { Link } from 'react-router-dom';
import { ThumbsUp, MapPin, AlertCircle, CopyCheck } from 'lucide-react';
import { Incident, CATEGORY_LABELS } from '@shared/types.js';
import { StatusChip } from './StatusChip.js';

interface IncidentCardProps {
  incident: Incident;
  onConfirm?: (e: React.MouseEvent, id: string) => void;
  showConfirmButton?: boolean;
}

export const IncidentCard: React.FC<IncidentCardProps> = ({
  incident,
  onConfirm,
  showConfirmButton = true
}) => {
  const formatRelativeDate = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 1) return 'Hace unos momentos';
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Ayer';
    return `Hace ${diffDays} días`;
  };

  return (
    <article
      className="surface-card"
      style={{
        padding: '16px',
        marginBottom: '12px',
        transition: 'transform var(--motion-fast) var(--ease), box-shadow var(--motion-fast) var(--ease)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <StatusChip status={incident.status} isProcessing={incident.isProcessing} />
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              background: 'var(--glass)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--hairline)'
            }}
          >
            {CATEGORY_LABELS[incident.category] || incident.category}
          </span>
          {incident.duplicateOf && (
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--st-asignado)',
                background: 'var(--glass)',
                padding: '2px 8px',
                borderRadius: 'var(--radius-pill)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <CopyCheck size={12} /> Vinculado a #{incident.duplicateOf}
            </span>
          )}
        </div>

        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {formatRelativeDate(incident.createdAt)}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <Link to={`/incidente/${incident.id}`} style={{ textDecoration: 'none' }}>
            <h3
              style={{
                fontSize: 'var(--text-md)',
                color: 'var(--text)',
                fontWeight: 600,
                marginBottom: '4px'
              }}
            >
              {incident.title}
            </h3>
            <p
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {incident.description}
            </p>
          </Link>
        </div>

        {incident.photoUrls && incident.photoUrls.length > 0 && (
          <img
            src={incident.photoUrls[0]}
            alt="Evidencia fotográfica"
            loading="lazy"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'cover',
              border: '1px solid var(--hairline)',
              flexShrink: 0
            }}
          />
        )}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          paddingTop: '8px',
          borderTop: '1px solid var(--hairline)'
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)'
          }}
        >
          <MapPin size={14} />
          {incident.areaId}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ThumbsUp size={13} />
            {incident.confirmationCount} confirmación(es)
          </span>

          {showConfirmButton && onConfirm && (
            <button
              onClick={(e) => onConfirm(e, incident.id)}
              className="btn-secondary"
              style={{
                height: '30px',
                padding: '0 8px',
                fontSize: 'var(--text-xs)',
                borderRadius: 'var(--radius-pill)',
                gap: '4px'
              }}
              title="Confirmar que este incidente existe en tu zona"
            >
              <ThumbsUp size={12} /> Confirmar
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

