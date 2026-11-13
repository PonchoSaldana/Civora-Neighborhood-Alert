import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  MapPin,
  ThumbsUp,
  MessageSquare,
  GitMerge,
  AlertCircle,
  Send,
  User,
  Ghost,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  Incident,
  IncidentStatus,
  IncidentComment,
  STATUS_LABELS,
  CATEGORY_LABELS
} from '@shared/types.js';
import { ALLOWED_TRANSITIONS } from '@shared/status.js';
import { api } from '../services/api.js';
import { StatusChip } from '../components/StatusChip.js';
import { DuplicateCard } from '../components/DuplicateCard.js';
import { BottomSheet } from '../components/BottomSheet.js';
import { useAuth } from '../context/AuthContext.js';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Comentarios
  const [comments, setComments] = useState<IncidentComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [commentAsAnonymous, setCommentAsAnonymous] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  // Status modal state (para Admin)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<IncidentStatus>('EN_REVISION');
  const [statusNote, setStatusNote] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadIncident = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.getIncidentById(id);
      if (data) {
        setIncident(data);
        setComments(data.comments || []);
        const validNext = (ALLOWED_TRANSITIONS[data.status] || [])[0];
        if (validNext) setTargetStatus(validNext);
      } else {
        setError('El incidente no fue encontrado.');
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar el incidente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncident();
  }, [id]);

  // Si está en procesamiento por Step Functions, recargar automáticamente
  useEffect(() => {
    if (!incident?.isProcessing) return;
    const interval = setInterval(() => {
      loadIncident();
    }, 2000);
    return () => clearInterval(interval);
  }, [incident?.isProcessing]);

  // Apoyar / confirmar incidente
  const handleConfirm = async () => {
    if (!incident) return;
    try {
      await api.confirmIncident(incident.id, user.sub || `guest-${Date.now()}`);
      setToastMessage('¡Gracias por apoyar este reporte comunitario!');
      await loadIncident();
    } catch (err: any) {
      setToastMessage(err.message || 'Error al apoyar el reporte.');
    }
  };

  // Enviar comentario
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !commentText.trim()) return;

    setSendingComment(true);
    try {
      const authorName = commentAsAnonymous
        ? 'Anónimo'
        : user.displayName || 'Vecino';

      const newComment = await api.addComment(
        incident.id,
        commentText.trim(),
        authorName,
        commentAsAnonymous ? null : user.sub,
        isAdmin
      );

      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      setToastMessage('Comentario publicado correctamente.');
    } catch (err: any) {
      setToastMessage(err.message || 'Error al publicar comentario.');
    } finally {
      setSendingComment(false);
    }
  };

  // Cambiar estado (Admin)
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident) return;
    setActionError(null);

    if (targetStatus === 'NO_PROCEDENTE' && statusNote.trim().length < 5) {
      setActionError('Debes ingresar un motivo público de al menos 5 caracteres para marcar como No procedente.');
      return;
    }

    setUpdatingStatus(true);
    try {
      await api.updateStatus(incident.id, targetStatus, statusNote.trim());
      setIsStatusModalOpen(false);
      setStatusNote('');
      setToastMessage(`Estado cambiado a ${STATUS_LABELS[targetStatus]}`);
      await loadIncident();
    } catch (err: any) {
      setActionError(err.message || 'Error al actualizar el estado.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLinkDuplicate = async (candidateId: string) => {
    if (!incident) return;
    try {
      await api.linkDuplicate(candidateId, incident.id);
      setToastMessage(`Reporte #${candidateId} vinculado a este incidente.`);
      await loadIncident();
    } catch (err: any) {
      setToastMessage(err.message || 'Error al vincular duplicado.');
    }
  };

  const handleDismissDuplicate = (candidateId: string) => {
    if (!incident) return;
    setIncident({
      ...incident,
      duplicateCandidates: incident.duplicateCandidates?.filter((c) => c.candidateId !== candidateId)
    });
    setToastMessage('Candidato descartado.');
  };

  if (loading) {
    return (
      <main className="container" style={{ padding: '40px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Cargando detalle del incidente...</p>
      </main>
    );
  }

  if (error || !incident) {
    return (
      <main className="container" style={{ padding: '40px 0', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto 12px auto' }} />
        <h2 style={{ marginBottom: '8px' }}>Incidente no disponible</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>{error}</p>
        <Link to="/" className="btn-secondary">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const allowedNextStatuses = ALLOWED_TRANSITIONS[incident.status] || [];

  return (
    <main className="container" style={{ paddingBottom: '40px' }}>
      {toastMessage && (
        <div
          className="glass-strong"
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
            padding: '10px 20px',
            borderRadius: 'var(--radius-pill)',
            fontSize: 'var(--text-sm)',
            borderLeft: '4px solid var(--accent)',
            boxShadow: 'var(--glass-shadow)'
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Barra superior de navegación */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => navigate(-1)}
          className="btn-secondary"
          style={{ width: '36px', height: '36px', padding: 0 }}
          aria-label="Regresar"
        >
          <ArrowLeft size={18} />
        </button>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          Folio #{incident.id}
        </span>
      </div>

      {/* Banner si Step Functions está procesando */}
      {incident.isProcessing && (
        <div
          className="glass"
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '16px',
            borderLeft: '4px solid var(--st-proceso)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <Clock size={20} color="var(--st-proceso)" className="spin" />
          <div>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
              Orquestación en proceso (Step Functions)
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Validando evidencia y evaluando duplicados...
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta principal del reporte */}
      <article className="surface-card" style={{ padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <StatusChip status={incident.status} isProcessing={incident.isProcessing} />
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            {new Date(incident.createdAt).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </span>
        </div>

        <h1 style={{ fontSize: 'var(--text-lg)', marginBottom: '8px' }}>
          {incident.title}
        </h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              background: 'var(--glass)',
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              border: '1px solid var(--hairline)'
            }}
          >
            {CATEGORY_LABELS[incident.category]}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <MapPin size={13} /> {incident.areaId}
          </span>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <User size={13} /> Reportado por: {incident.creatorDisplayName}
          </span>
        </div>

        <p style={{ fontSize: 'var(--text-md)', lineHeight: 1.6, marginBottom: '20px', whiteSpace: 'pre-wrap' }}>
          {incident.description}
        </p>

        {/* Foto de evidencia */}
        {incident.photoUrls && incident.photoUrls.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
              <img
                src={incident.photoUrls[0]}
                alt="Evidencia fotográfica"
                style={{ width: '100%', maxHeight: '380px', objectFit: 'cover', display: 'block' }}
              />
            </div>
          </div>
        )}

        {/* Barra de acción: Apoyar reporte */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '12px',
            borderTop: '1px solid var(--hairline)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            <ThumbsUp size={16} color="var(--accent)" />
            <span>{incident.confirmationCount} personas apoyan este reporte</span>
          </div>

          <button
            onClick={handleConfirm}
            className="btn-primary"
            style={{ height: '36px', fontSize: 'var(--text-xs)', padding: '0 14px', gap: '6px' }}
          >
            <ThumbsUp size={14} /> Apoyar reporte
          </button>
        </div>

        {/* Panel de administración (solo para ADMIN) */}
        {isAdmin && (
          <div
            className="glass"
            style={{
              padding: '14px',
              borderRadius: 'var(--radius-sm)',
              marginTop: '16px',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              borderLeft: '4px solid var(--accent)'
            }}
          >
            <div>
              <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text)' }}>
                Herramientas de Administrador
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {allowedNextStatuses.length > 0 ? 'Puedes actualizar el avance' : 'Incidente resuelto'}
              </div>
            </div>

            {allowedNextStatuses.length > 0 && (
              <button
                onClick={() => setIsStatusModalOpen(true)}
                className="btn-primary"
                style={{ height: '34px', fontSize: 'var(--text-xs)', padding: '0 12px' }}
              >
                Cambiar estado
              </button>
            )}
          </div>
        )}
      </article>

      {/* Candidatos Duplicados (visible para Admin) */}
      {isAdmin && incident.duplicateCandidates && incident.duplicateCandidates.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GitMerge size={18} color="var(--st-asignado)" /> Posibles reportes duplicados ({incident.duplicateCandidates.length})
          </h2>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Detección explicable por categoría, distancia y tiempo.
          </p>
          {incident.duplicateCandidates.map((cand) => (
            <DuplicateCard
              key={cand.candidateId}
              candidate={cand}
              onLink={handleLinkDuplicate}
              onDismiss={handleDismissDuplicate}
            />
          ))}
        </section>
      )}

      {/* Sección de Comentarios (Usuarios y Admin pueden comentar) */}
      <section className="surface-card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <MessageSquare size={18} /> Comentarios comunitarios ({comments.length})
        </h2>

        {/* Lista de comentarios */}
        {comments.length === 0 ? (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '20px', textAlign: 'center' }}>
            Aún no hay comentarios. Sé el primero en aportar información sobre este incidente.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {comments.map((cmt) => (
              <div
                key={cmt.commentId}
                className="glass"
                style={{
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-sm)',
                  borderLeft: cmt.isAdmin ? '4px solid var(--accent)' : '1px solid var(--hairline)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600 }}>
                      {cmt.authorName}
                    </span>
                    {cmt.isAdmin && (
                      <span
                        style={{
                          fontSize: '10px',
                          background: 'var(--accent)',
                          color: 'var(--on-accent)',
                          padding: '1px 6px',
                          borderRadius: 'var(--radius-pill)',
                          fontWeight: 600
                        }}
                      >
                        Admin
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(cmt.createdAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                  {cmt.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Formulario para agregar comentario */}
        <form onSubmit={handleAddComment}>
          <div className="form-group" style={{ marginBottom: '8px' }}>
            <textarea
              rows={2}
              placeholder="Escribe un comentario o actualización sobre este reporte..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="form-textarea"
              maxLength={500}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: 'var(--text-xs)', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <input
                type="checkbox"
                checked={commentAsAnonymous}
                onChange={(e) => setCommentAsAnonymous(e.target.checked)}
              />
              Comentar como anónimo
            </label>

            <button
              type="submit"
              disabled={sendingComment || !commentText.trim()}
              className="btn-primary"
              style={{ height: '36px', fontSize: 'var(--text-xs)', padding: '0 16px', gap: '6px' }}
            >
              <Send size={13} />
              {sendingComment ? 'Publicando...' : 'Comentar'}
            </button>
          </div>
        </form>
      </section>

      {/* Modal para cambiar estado (Admin) */}
      <BottomSheet
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Actualizar estado del incidente"
      >
        <form onSubmit={handleUpdateStatus}>
          {actionError && (
            <div
              role="alert"
              style={{
                background: 'var(--danger)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                marginBottom: '12px'
              }}
            >
              {actionError}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="targetStatus" className="form-label">
              Nuevo estado
            </label>
            <select
              id="targetStatus"
              value={targetStatus}
              onChange={(e) => setTargetStatus(e.target.value as IncidentStatus)}
              className="form-select"
            >
              {allowedNextStatuses.map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="statusNote" className="form-label">
              Nota pública explicativa {targetStatus === 'NO_PROCEDENTE' && '(Obligatoria para No procedente)'}
            </label>
            <textarea
              id="statusNote"
              rows={3}
              placeholder="Explica las acciones realizadas o el motivo..."
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              className="form-textarea"
              required={targetStatus === 'NO_PROCEDENTE'}
            />
          </div>

          <button
            type="submit"
            disabled={updatingStatus}
            className="btn-primary"
            style={{ width: '100%', marginTop: '12px' }}
          >
            {updatingStatus ? 'Guardando...' : 'Guardar nuevo estado'}
          </button>
        </form>
      </BottomSheet>
    </main>
  );
};
