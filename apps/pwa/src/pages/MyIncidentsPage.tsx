import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Trash2, Send, AlertCircle, Clock } from 'lucide-react';
import { Incident, IncidentDraft } from '@shared/types.js';
import { api } from '../services/api.js';
import { offlineDb } from '../services/db.js';
import { IncidentCard } from '../components/IncidentCard.js';
import { useAuth } from '../context/AuthContext.js';

export const MyIncidentsPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [drafts, setDrafts] = useState<IncidentDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>((location.state as any)?.message || null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [remoteIncidents, localDrafts] = await Promise.all([
        api.getIncidents({ mine: true, userSub: user.sub }),
        offlineDb.getAllDrafts()
      ]);
      setIncidents(remoteIncidents);
      setDrafts(localDrafts);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDeleteDraft = async (localId: string) => {
    await offlineDb.deleteDraft(localId);
    setToast('Borrador eliminado del dispositivo.');
    loadData();
  };

  const handleSendDraft = async (draft: IncidentDraft) => {
    if (!navigator.onLine) {
      setToast('No hay conexión a internet para enviar el reporte.');
      return;
    }
    try {
      await api.createIncident({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        areaId: draft.areaId,
        coordinates: draft.coordinates,
        photoBlob: draft.photoBlob,
        photoName: draft.photoName,
        authorId: user.sub,
        authorName: user.displayName || 'Vecino',
        idempotencyKey: draft.idempotencyKey
      });
      await offlineDb.deleteDraft(draft.localId);
      setToast('Borrador enviado con éxito.');
      loadData();
    } catch (err: any) {
      setToast(err.message || 'Error al enviar borrador.');
    }
  };

  return (
    <main className="container" style={{ paddingBottom: '32px' }}>
      {toast && (
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
          {toast}
        </div>
      )}

      <section style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
          Mis reportes
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Seguimiento puntual a los reportes que has creado en tu comunidad.
        </p>
      </section>

      {/* Seccion de Borradores Locales (Seccion 9) */}
      {drafts.length > 0 && (
        <section style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '8px', color: 'var(--st-proceso)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Clock size={16} /> Borradores locales ({drafts.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {drafts.map((draft) => (
              <div
                key={draft.localId}
                className="surface-card"
                style={{
                  padding: '14px',
                  borderLeft: '4px solid var(--st-proceso)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h3 style={{ fontSize: 'var(--text-md)', fontWeight: 600 }}>{draft.title}</h3>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'var(--glass)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-pill)',
                      color: 'var(--st-proceso)',
                      border: '1px solid var(--st-proceso)'
                    }}
                  >
                    Borrador local
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  {draft.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    onClick={() => handleDeleteDraft(draft.localId)}
                    className="btn-secondary"
                    style={{ height: '32px', fontSize: 'var(--text-xs)', padding: '0 8px' }}
                    title="Eliminar borrador"
                  >
                    <Trash2 size={13} color="var(--danger)" /> Eliminar
                  </button>
                  <button
                    onClick={() => handleSendDraft(draft)}
                    className="btn-primary"
                    style={{ height: '32px', fontSize: 'var(--text-xs)', padding: '0 12px' }}
                  >
                    <Send size={13} /> Enviar ahora
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lista de reportes remotos */}
      <section>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '12px' }}>
          Reportes enviados al sistema
        </h2>

        {loading ? (
          <div className="surface-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.6 }}>
            Cargando tus reportes...
          </div>
        ) : incidents.length === 0 ? (
          <div
            className="surface-card"
            style={{
              padding: '36px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <FileText size={32} color="var(--text-muted)" />
            <p style={{ fontSize: 'var(--text-md)', color: 'var(--text)' }}>
              Aún no has enviado ningún reporte de incidente.
            </p>
            <Link to="/nuevo" className="btn-primary">
              Crear mi primer reporte
            </Link>
          </div>
        ) : (
          <div className="desktop-incidents-grid">
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                showConfirmButton={false}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
};

