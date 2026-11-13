import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  MapPin,
  Filter,
  Layers,
  ThumbsUp,
  ChevronRight,
  AlertCircle,
  Compass
} from 'lucide-react';
import { Incident, IncidentCategory, CATEGORY_LABELS, STATUS_LABELS } from '@shared/types.js';
import { calculateDistanceMeters } from '@shared/duplicates.js';
import { api } from '../services/api.js';
import { StatusChip } from '../components/StatusChip.js';

interface IncidentWithDistance extends Incident {
  distanceM?: number;
}

export const MapPage: React.FC = () => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [incidents, setIncidents] = useState<IncidentWithDistance[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [activeRadius, setActiveRadius] = useState<number | null>(null); // meters
  const [selectedIncident, setSelectedIncident] = useState<IncidentWithDistance | null>(null);

  // 1. Cargar incidentes
  useEffect(() => {
    api.getIncidents().then((list) => {
      setIncidents(list);
    });
  }, []);

  // 2. Inicializar mapa Leaflet
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centro inicial por defecto
    const defaultCenter: [number, number] = [20.6736, -103.3638];

    const map = L.map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 14,
      zoomControl: false
    });

    // Añadir control de zoom abajo a la derecha
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CartoDB Positron / OSM tiles (diseño limpio y profesional acorde al tema)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      maxZoom: 19
    }).addTo(map);

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;
    mapInstanceRef.current = map;

    // Intentar geolocalización al abrir si está disponible
    getUserLocation(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Función para obtener ubicación del usuario
  const getUserLocation = (mapToCenter?: L.Map) => {
    if (!navigator.geolocation) return;
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });
        setLocating(false);

        const currentMap = mapToCenter || mapInstanceRef.current;
        if (currentMap) {
          currentMap.setView([lat, lng], 15);

          // Marcador de usuario con pulso azul
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: `
              <div style="position:relative; width:22px; height:22px;">
                <div style="position:absolute; inset:0; border-radius:50%; background:#2563EB; border:3px solid #fff; box-shadow:0 0 10px rgba(37,99,235,0.6);"></div>
                <div style="position:absolute; inset:-6px; border-radius:50%; background:rgba(37,99,235,0.25); animation:pulse 2s infinite;"></div>
              </div>
            `,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
          });

          const uMarker = L.marker([lat, lng], { icon: userIcon }).addTo(currentMap);
          uMarker.bindPopup('<b>Tu ubicación actual</b>');
          userMarkerRef.current = uMarker;
        }
      },
      () => {
        setLocating(false);
      },
      { timeout: 7000 }
    );
  };

  // 4. Calcular distancias si hay coordenadas de usuario
  useEffect(() => {
    if (!userCoords) return;

    setIncidents((prev) =>
      prev.map((inc) => {
        if (inc.coordinates) {
          const dist = calculateDistanceMeters(
            userCoords.lat,
            userCoords.lng,
            inc.coordinates.latitude,
            inc.coordinates.longitude
          );
          return { ...inc, distanceM: dist };
        }
        return inc;
      })
    );
  }, [userCoords]);

  // 5. Renderizar pines en el mapa según filtros
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();

    // Filtrar incidentes
    const filtered = incidents.filter((inc) => {
      if (selectedCategory !== 'all' && inc.category !== selectedCategory) return false;
      if (activeRadius && inc.distanceM !== undefined && inc.distanceM > activeRadius) return false;
      return true;
    });

    filtered.forEach((inc) => {
      const lat = inc.coordinates?.latitude || 20.6736 + (Math.random() - 0.5) * 0.02;
      const lng = inc.coordinates?.longitude || -103.3638 + (Math.random() - 0.5) * 0.02;

      // Color del pin según estado
      const pinColor =
        inc.status === 'RESUELTO'
          ? '#3F8062'
          : inc.status === 'EN_PROCESO'
          ? '#A87F2E'
          : inc.status === 'ASIGNADO'
          ? '#7A6FA3'
          : '#3F5F8F';

      const customIcon = L.divIcon({
        className: 'incident-marker-pin',
        html: `
          <div style="
            width: 32px;
            height: 32px;
            background: ${pinColor};
            color: #ffffff;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            display: flex;
            align-items: center;
            justify-content: center;
            border: 2px solid #ffffff;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            cursor: pointer;
          ">
            <div style="transform: rotate(45deg); font-size: 13px; font-weight: bold;">
              •
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -28]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersGroup);

      const distText = inc.distanceM ? `<div style="font-size:11px; color:#2563EB; font-weight:600; margin-bottom:4px;">A ${inc.distanceM < 1000 ? `${inc.distanceM} m` : `${(inc.distanceM / 1000).toFixed(1)} km`} de ti</div>` : '';

      marker.bindPopup(`
        <div style="font-family: inherit; padding: 4px; max-width: 200px;">
          ${distText}
          <div style="font-size: 11px; color: #64748B; margin-bottom: 2px;">${CATEGORY_LABELS[inc.category]}</div>
          <b style="font-size: 13px; display: block; margin-bottom: 4px; color: #0F172A;">${inc.title}</b>
          <div style="font-size: 11px; color: #475569; margin-bottom: 8px;">${inc.areaId}</div>
          <a href="/incidente/${inc.id}" style="display: inline-block; background: #3F5F8F; color: #fff; padding: 4px 10px; border-radius: 6px; font-size: 11px; text-decoration: none; font-weight: 500;">Ver detalle →</a>
        </div>
      `);

      marker.on('click', () => {
        setSelectedIncident(inc);
      });
    });
  }, [incidents, selectedCategory, activeRadius]);

  // Centrar mapa en un incidente seleccionado
  const handleSelectIncident = (inc: IncidentWithDistance) => {
    setSelectedIncident(inc);
    const map = mapInstanceRef.current;
    if (map && inc.coordinates) {
      map.setView([inc.coordinates.latitude, inc.coordinates.longitude], 16, { animate: true });
    }
  };

  // Ordenar los incidentes filtrados por distancia si está disponible
  const sortedIncidents = [...incidents]
    .filter((inc) => {
      if (selectedCategory !== 'all' && inc.category !== selectedCategory) return false;
      if (activeRadius && inc.distanceM !== undefined && inc.distanceM > activeRadius) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.distanceM !== undefined && b.distanceM !== undefined) {
        return a.distanceM - b.distanceM;
      }
      return 0;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', position: 'relative' }}>
      {/* ── Barra superior de controles del mapa ── */}
      <div
        className="glass"
        style={{
          margin: '0 12px 10px 12px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          zIndex: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={18} color="var(--accent)" />
            <h1 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, margin: 0 }}>
              Mapa de incidentes cercanos
            </h1>
          </div>

          <button
            onClick={() => getUserLocation()}
            disabled={locating}
            className="btn-primary"
            style={{ height: '32px', fontSize: 'var(--text-xs)', padding: '0 10px', gap: '4px' }}
          >
            <Compass size={14} className={locating ? 'spin' : ''} />
            <span>{locating ? 'Localizando...' : userCoords ? 'Centrar en mí' : 'Mi ubicación'}</span>
          </button>
        </div>

        {/* Filtros de distancia (Radio) */}
        {userCoords && (
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', overflowX: 'auto', paddingBottom: '2px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Radio:</span>
            {[
              { label: 'Todos', val: null },
              { label: '500 m', val: 500 },
              { label: '1 km', val: 1000 },
              { label: '3 km', val: 3000 },
              { label: '5 km', val: 5000 }
            ].map((r) => (
              <button
                key={r.label}
                onClick={() => setActiveRadius(r.val)}
                className="glass"
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '11px',
                  fontWeight: activeRadius === r.val ? 600 : 400,
                  background: activeRadius === r.val ? 'var(--accent)' : 'transparent',
                  color: activeRadius === r.val ? 'var(--on-accent)' : 'var(--text)',
                  border: '1px solid var(--hairline)',
                  whiteSpace: 'nowrap'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        )}

        {/* Filtro por categorías */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            style={{
              padding: '3px 10px',
              borderRadius: 'var(--radius-pill)',
              fontSize: '11px',
              fontWeight: selectedCategory === 'all' ? 600 : 400,
              background: selectedCategory === 'all' ? 'var(--accent)' : 'var(--glass)',
              color: selectedCategory === 'all' ? 'var(--on-accent)' : 'var(--text)',
              border: '1px solid var(--hairline)',
              whiteSpace: 'nowrap'
            }}
          >
            Todas
          </button>
          {Object.entries(CATEGORY_LABELS).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSelectedCategory(k)}
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-pill)',
                fontSize: '11px',
                fontWeight: selectedCategory === k ? 600 : 400,
                background: selectedCategory === k ? 'var(--accent)' : 'var(--glass)',
                color: selectedCategory === k ? 'var(--on-accent)' : 'var(--text)',
                border: '1px solid var(--hairline)',
                whiteSpace: 'nowrap'
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Contenedor del Mapa ── */}
      <div style={{ flex: 1, position: 'relative', margin: '0 12px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--hairline)' }}>
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* ── Panel / Carrusel inferior con reportes cercanos ── */}
      <div
        className="glass-strong"
        style={{
          margin: '10px 12px 0 12px',
          padding: '10px 14px',
          borderRadius: 'var(--radius-md)',
          maxHeight: '140px',
          overflowY: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
            {userCoords ? `Reportes ordenados por cercanía (${sortedIncidents.length})` : `Reportes en el área (${sortedIncidents.length})`}
          </span>
          <Link to="/" style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
            Ver lista completa
          </Link>
        </div>

        {sortedIncidents.length === 0 ? (
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>
            No se encontraron incidentes con los filtros actuales.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {sortedIncidents.slice(0, 5).map((inc) => (
              <div
                key={inc.id}
                onClick={() => handleSelectIncident(inc)}
                className="surface-card"
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  border: selectedIncident?.id === inc.id ? '2px solid var(--accent)' : '1px solid var(--hairline)'
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{CATEGORY_LABELS[inc.category]}</span>
                    {inc.distanceM !== undefined && (
                      <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent)' }}>
                        • a {inc.distanceM < 1000 ? `${inc.distanceM} m` : `${(inc.distanceM / 1000).toFixed(1)} km`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inc.title}
                  </div>
                </div>

                <Link
                  to={`/incidente/${inc.id}`}
                  className="btn-secondary"
                  style={{ height: '28px', fontSize: '11px', padding: '0 8px', flexShrink: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

