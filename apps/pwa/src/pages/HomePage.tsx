import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { Incident, IncidentCategory, CATEGORY_LABELS } from '@shared/types.js';
import { api } from '../services/api.js';
import { IncidentCard } from '../components/IncidentCard.js';
import { SyncBanner } from '../components/SyncBanner.js';
import { useAuth } from '../context/AuthContext.js';

export const HomePage: React.FC = () => {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchArea, setSearchArea] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const data = await api.getIncidents({ areaId: searchArea || undefined });
      setIncidents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, [searchArea]);

  const handleConfirm = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await api.confirmIncident(id, user.sub || 'guest-user');
      setToastMessage('Incidente confirmado. Gracias por apoyar a tu comunidad.');
      fetchIncidents();
    } catch (err: any) {
      setToastMessage(err.message || 'Error al confirmar incidente.');
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  const filteredIncidents = incidents.filter((inc) => {
    if (selectedCategory !== 'all' && inc.category !== selectedCategory) return false;
    return true;
  });

  return (
    <main className="container" style={{ paddingBottom: '32px' }}>
      <SyncBanner onSyncComplete={fetchIncidents} />

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

      {/* Layout Grid Responsivo para Computadora */}
      <div className="desktop-grid-home">
        {/* Columna Principal: Filtros y Lista de Incidentes */}
        <div>
          {/* Header section */}
          <section style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
                Incidentes en tu comunidad
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                Consulta reportes cercanos o confirma incidentes existentes para evitar duplicados.
              </p>
            </div>

            <Link
              to="/mapa"
              className="btn-secondary mobile-only"
              style={{ height: '36px', fontSize: 'var(--text-xs)', gap: '6px', whiteSpace: 'nowrap' }}
            >
              <MapPin size={15} color="var(--accent)" /> Ver en el mapa
            </Link>
          </section>

          {/* Filter and Search Bar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={18}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                type="text"
                placeholder="Filtrar por colonia o zona..."
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="form-input"
                style={{ paddingLeft: '38px', height: '42px' }}
              />
            </div>

            {/* Category Pills */}
            <div
              className="category-pills-bar"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                scrollbarWidth: 'none'
              }}
            >
              <button
                onClick={() => setSelectedCategory('all')}
                className="glass"
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: 'var(--text-xs)',
                  fontWeight: selectedCategory === 'all' ? 600 : 400,
                  background: selectedCategory === 'all' ? 'var(--accent)' : 'var(--glass)',
                  color: selectedCategory === 'all' ? 'var(--on-accent)' : 'var(--text)',
                  whiteSpace: 'nowrap'
                }}
              >
                Todas las categorías
              </button>
              {Object.entries(CATEGORY_LABELS).map(([catKey, label]) => (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className="glass"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: selectedCategory === catKey ? 600 : 400,
                    background: selectedCategory === catKey ? 'var(--accent)' : 'var(--glass)',
                    color: selectedCategory === catKey ? 'var(--on-accent)' : 'var(--text)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents List (Grid en escritorio) */}
          {loading ? (
            <div className="desktop-incidents-grid">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="surface-card"
                  style={{
                    height: '140px',
                    opacity: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Cargando reportes...</span>
                </div>
              ))}
            </div>
          ) : filteredIncidents.length === 0 ? (
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
              <AlertCircle size={32} color="var(--text-muted)" />
              <p style={{ fontSize: 'var(--text-md)', color: 'var(--text)' }}>
                No se encontraron incidentes con los filtros aplicados.
              </p>
              <button onClick={() => { setSelectedCategory('all'); setSearchArea(''); }} className="btn-secondary">
                Restablecer filtros
              </button>
            </div>
          ) : (
            <div className="desktop-incidents-grid">
              {filteredIncidents.map((incident) => (
                <IncidentCard
                  key={incident.id}
                  incident={incident}
                  onConfirm={handleConfirm}
                />
              ))}
            </div>
          )}
        </div>

        {/* Barra Lateral Desktop (Visible solo en computadoras) */}
        <aside
          className="desktop-only"
          style={{
            flexDirection: 'column',
            gap: '14px',
            position: 'sticky',
            top: '80px',
            width: '280px',
            maxWidth: '280px',
            flexShrink: 0,
            boxSizing: 'border-box'
          }}
        >
          {/* Tarjeta de Acción Rápida */}
          <div className="surface-card" style={{ padding: '16px' }}>
            <h2 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: '6px' }}>
              Acciones comunitarias
            </h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
              ¿Detectaste un desperfecto? Repórtalo con o sin fotografía.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Link
                to="/nuevo"
                className="btn-primary"
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', gap: '6px' }}
              >
                + Crear nuevo reporte
              </Link>
              <Link
                to="/mapa"
                className="btn-secondary"
                style={{ width: '100%', height: '36px', fontSize: 'var(--text-xs)', gap: '6px' }}
              >
                <MapPin size={14} color="var(--accent)" /> Explorar mapa
              </Link>
            </div>
          </div>

          {/* Tarjeta de Resumen del Vecindario */}
          <div className="surface-card" style={{ padding: '16px' }}>
            <h3 style={{ fontSize: 'var(--text-xs)', fontWeight: 600, marginBottom: '10px', color: 'var(--text)' }}>
              Estado del vecindario
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div className="glass" style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--accent)' }}>
                  {incidents.length}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Total reportes</div>
              </div>
              <div className="glass" style={{ padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--st-proceso)' }}>
                  {incidents.filter(i => i.status !== 'RESUELTO' && i.status !== 'NO_PROCEDENTE').length}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>En atención</div>
              </div>
            </div>
          </div>

          {/* Guía Rápida */}
          <div className="glass" style={{ padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text)', marginBottom: '6px' }}>
              💡 ¿Cómo colaborar?
            </div>
            <ul style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5, paddingLeft: '14px', margin: 0 }}>
              <li>Apoya reportes para elevar su prioridad.</li>
              <li>La IA detecta reportes repetidos.</li>
              <li>Aporta detalles comentando en reportes.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
};

