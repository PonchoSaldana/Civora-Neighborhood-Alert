import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, AlertCircle, RefreshCw, MapPin } from 'lucide-react';
import { Incident, IncidentCategory, CATEGORY_LABELS } from '@shared/types.js';
import { api } from '../services/api.js';
import { IncidentCard } from '../components/IncidentCard.js';
import { SyncBanner } from '../components/SyncBanner.js';
import { useAuth } from '../context/AuthContext.js';

export const HomePage: React.FC = () => {
  const { user, isGuest } = useAuth();
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
    } catch {
      // Manejo de error de conexión silencioso
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
              </h1>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
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

          {/* Banner informativo solo si es invitado */}
          {isGuest && (
            <div
              className="glass"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderLeft: '4px solid var(--accent)'
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>Modo invitado:</strong> Estás viendo reportes comunitarios de demostración. Inicia sesión con tu cuenta para crear y sincronizar reportes reales con la red.
              </div>
              <Link to="/cuenta" className="btn-secondary" style={{ height: '32px', fontSize: '11px', whiteSpace: 'nowrap' }}>
                Iniciar sesión
              </Link>
            </div>
          )}

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
      </div>
    </main>
  );
};

