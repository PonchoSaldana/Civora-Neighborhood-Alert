import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, CheckCircle2, Clock, GitMerge, Filter, ChevronRight, UserCheck } from 'lucide-react';
import { Incident, IncidentStatus, STATUS_LABELS } from '@shared/types.js';
import { api } from '../services/api.js';
import { StatusChip } from '../components/StatusChip.js';
import { DuplicateCard } from '../components/DuplicateCard.js';
import { BottomSheet } from '../components/BottomSheet.js';
import { useAuth } from '../context/AuthContext.js';

const STATUS_TABS: IncidentStatus[] = ['RECIBIDO', 'EN_REVISION', 'ASIGNADO', 'EN_PROCESO', 'RESUELTO'];

export const ManagerInboxPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<IncidentStatus>('RECIBIDO');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents({ status: activeTab });
      setIncidents(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      } else if (data.length === 0) {
        setSelectedIncident(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, [activeTab]);

  const handleLinkDuplicate = async (childId: string, parentId: string) => {
    try {
      await api.linkDuplicate(childId, parentId);
      setToast(`Reporte #${childId} vinculado como duplicado.`);
      loadIncidents();
    } catch (err: any) {
      setToast(err.message || 'Error al vincular.');
    }
  };

  return (
    <main className="container-wide" style={{ paddingBottom: '32px' }}>
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

      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
          Bandeja de gestión de incidentes
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Revisa, prioriza, evalúa duplicados y actualiza el avance de los reportes comunitarios.
        </p>
      </div>

      {/* Status tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          marginBottom: '20px',
          paddingBottom: '4px'
        }}
      >
        {STATUS_TABS.map((st) => (
          <button
            key={st}
            onClick={() => setActiveTab(st)}
            className="glass"
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-pill)',
              fontSize: 'var(--text-xs)',
              fontWeight: activeTab === st ? 600 : 400,
              background: activeTab === st ? 'var(--accent)' : 'var(--glass)',
              color: activeTab === st ? 'var(--on-accent)' : 'var(--text)',
              whiteSpace: 'nowrap'
            }}
          >
            {STATUS_LABELS[st]}
          </button>
        ))}
      </div>

      {/* Grid: 2 columns on desktop (>=1024px) per Section 10.7 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px',
          alignItems: 'start'
        }}
      >
        {/* Left Column: List of incidents */}
        <section>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '12px' }}>
            Reportes ({incidents.length})
          </div>

          {loading ? (
            <div className="surface-card" style={{ padding: '24px', textAlign: 'center', opacity: 0.6 }}>
              Cargando bandeja...
            </div>
          ) : incidents.length === 0 ? (
            <div className="surface-card" style={{ padding: '32px 20px', textAlign: 'center' }}>
              <Inbox size={32} color="var(--text-muted)" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                No hay incidentes pendientes en estado {STATUS_LABELS[activeTab]}.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incidents.map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className="surface-card"
                  style={{
                    padding: '14px',
                    cursor: 'pointer',
                    border: selectedIncident?.id === inc.id ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                    transition: 'border-color var(--motion-fast) var(--ease)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)' }}>
                      #{inc.id}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {new Date(inc.createdAt).toLocaleDateString('es-MX')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
                    {inc.title}
                  </h3>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {inc.areaId}
                    </span>
                    {inc.duplicateCandidates && inc.duplicateCandidates.length > 0 && (
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--st-asignado)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <GitMerge size={12} /> {inc.duplicateCandidates.length} dup
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Active Incident Panel */}
        <section className="surface-card" style={{ padding: '20px' }}>
          {selectedIncident ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Folio #{selectedIncident.id}
                  </span>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
                    {selectedIncident.title}
                  </h2>
                </div>
                <StatusChip status={selectedIncident.status} isProcessing={selectedIncident.isProcessing} />
              </div>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', marginBottom: '16px', lineHeight: 1.5 }}>
                {selectedIncident.description}
              </p>

              {/* Duplicate review section */}
              {selectedIncident.duplicateCandidates && selectedIncident.duplicateCandidates.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--st-asignado)', marginBottom: '8px' }}>
                    Candidatos duplicados detectados automáticamente
                  </div>
                  {selectedIncident.duplicateCandidates.map((cand) => (
                    <DuplicateCard
                      key={cand.candidateId}
                      candidate={cand}
                      onLink={(cid) => handleLinkDuplicate(cid, selectedIncident.id)}
                      onDismiss={(cid) => {
                        setSelectedIncident({
                          ...selectedIncident,
                          duplicateCandidates: selectedIncident.duplicateCandidates?.filter((c) => c.candidateId !== cid)
                        });
                      }}
                    />
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <Link to={`/incidente/${selectedIncident.id}`} className="btn-primary" style={{ height: '38px', fontSize: 'var(--text-xs)' }}>
                  Abrir seguimiento completo <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Selecciona un incidente de la lista para ver su detalle y gestionar duplicados.
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

