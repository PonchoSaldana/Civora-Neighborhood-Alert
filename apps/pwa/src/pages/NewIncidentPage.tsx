import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Navigation, AlertCircle, User, Ghost } from 'lucide-react';
import { IncidentCategory, CATEGORY_LABELS } from '@shared/types.js';
import { api } from '../services/api.js';
import { offlineDb } from '../services/db.js';
import { useAuth } from '../context/AuthContext.js';

const PRESET_AREAS = [
  'Colonia Del Valle',
  'Sector Reforma',
  'Parque Central',
  'Zona Universitaria',
  'Centro Histórico',
  'Barrio San Juan',
  'Fraccionamiento Las Palmas'
];

export const NewIncidentPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState<IncidentCategory>('baches');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState(PRESET_AREAS[0]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | undefined>();
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  // Identificación del autor: anónimo o con nombre
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [customAuthorName, setCustomAuthorName] = useState(
    user.mode === 'registered' ? user.displayName : ''
  );

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Ubicación GPS opcional
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocalización no soportada por el navegador.');
      return;
    }

    setGpsLoading(true);
    setGpsStatus('Obteniendo coordenadas aproximadas...');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates({
          latitude: parseFloat(pos.coords.latitude.toFixed(5)),
          longitude: parseFloat(pos.coords.longitude.toFixed(5))
        });
        setGpsLoading(false);
        setGpsStatus('Ubicación aproximada registrada ✓');
      },
      () => {
        setGpsLoading(false);
        setGpsStatus('No se pudo acceder a la ubicación. Puedes continuar con la zona seleccionada.');
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('Solo se admiten formatos JPEG, PNG o WebP.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('La imagen supera el límite permitido de 5 MB.');
      return;
    }

    setErrorMsg(null);
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (title.trim().length < 4) {
      setErrorMsg('El título debe tener al menos 4 caracteres.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMsg('La descripción debe tener al menos 10 caracteres.');
      return;
    }

    const finalAuthorName = isAnonymous
      ? 'Anónimo'
      : customAuthorName.trim() || user.displayName || 'Vecino';

    setSubmitting(true);
    const idempotencyKey = `civ-idemp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Guardado offline si no hay red
    if (!navigator.onLine) {
      try {
        const localId = `draft-${Date.now()}`;
        await offlineDb.saveDraft({
          localId,
          title: title.trim(),
          description: description.trim(),
          category,
          areaId,
          coordinates,
          photoBlob: photoFile || undefined,
          photoName: photoFile?.name,
          photoType: photoFile?.type,
          createdAt: Date.now(),
          syncStatus: 'DRAFT',
          idempotencyKey,
          authorName: finalAuthorName
        });

        navigate('/', {
          state: { message: 'Borrador guardado localmente. Se enviará al reconectar internet.' }
        });
        return;
      } catch {
        setErrorMsg('Error al guardar el borrador en el dispositivo.');
        setSubmitting(false);
        return;
      }
    }

    // Envío en línea
    try {
      const res = await api.createIncident({
        title: title.trim(),
        description: description.trim(),
        category,
        areaId,
        coordinates,
        photoBlob: photoFile || undefined,
        photoName: photoFile?.name,
        authorId: isAnonymous ? null : user.sub,
        authorName: finalAuthorName,
        idempotencyKey
      });

      navigate(`/incidente/${res.incidentId}`, {
        state: { newIncident: true }
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al enviar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ paddingBottom: '40px' }}>
      <section style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
          Crear reporte de incidente
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Completa el formulario para reportar un desperfecto en tu comunidad.
        </p>
      </section>

      {errorMsg && (
        <div
          role="alert"
          style={{
            background: 'var(--danger)',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface-card" style={{ padding: '20px' }}>
        {/* Identificación del autor: anónimo o con nombre */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label" style={{ marginBottom: '8px' }}>
            ¿Cómo quieres identificarte en este reporte?
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAnonymous(false)}
              className="glass"
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: !isAnonymous ? 600 : 400,
                border: !isAnonymous ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                background: !isAnonymous ? 'var(--glass-strong)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <User size={14} color="var(--accent)" /> Con mi nombre
            </button>
            <button
              type="button"
              onClick={() => setIsAnonymous(true)}
              className="glass"
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: isAnonymous ? 600 : 400,
                border: isAnonymous ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                background: isAnonymous ? 'var(--glass-strong)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Ghost size={14} color="var(--text-muted)" /> Reporte anónimo
            </button>
          </div>

          {!isAnonymous && (
            <input
              type="text"
              placeholder="Escribe tu nombre o apodo (ej. Juan Pérez, Vecina de la calle 4)"
              value={customAuthorName}
              onChange={(e) => setCustomAuthorName(e.target.value)}
              className="form-input"
              maxLength={60}
            />
          )}
          {isAnonymous && (
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0 2px' }}>
              Tu reporte se publicará firmado como "Anónimo" sin asociar tu cuenta.
            </p>
          )}
        </div>

        {/* 1. Categoría */}
        <div className="form-group">
          <label htmlFor="category" className="form-label">
            1. Categoría del desperfecto
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value as IncidentCategory)}
            className="form-select"
          >
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div className="form-group">
          <label htmlFor="title" className="form-label">
            Título breve
          </label>
          <input
            id="title"
            type="text"
            placeholder="Ej. Fuga de agua en banqueta frente a farmacia"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="form-input"
            maxLength={100}
            required
          />
        </div>

        {/* 2. Descripción */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            2. Descripción y referencias
          </label>
          <textarea
            id="description"
            rows={3}
            placeholder="Describe qué ocurre, calles cercanas o puntos de referencia..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="form-textarea"
            maxLength={600}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: 'var(--text-muted)' }}>
            {description.length}/600 caracteres
          </div>
        </div>

        {/* 3. Fotografía opcional */}
        <div className="form-group">
          <label className="form-label">
            3. Evidencia fotográfica (opcional, máx. 5 MB)
          </label>
          <div
            style={{
              border: '2px dashed var(--hairline)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              background: 'var(--glass)',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            {photoPreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <img
                  src={photoPreview}
                  alt="Vista previa de evidencia"
                  style={{ maxHeight: '160px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                  className="btn-secondary"
                  style={{ height: '28px', fontSize: 'var(--text-xs)' }}
                >
                  Quitar foto
                </button>
              </div>
            ) : (
              <label htmlFor="photoInput" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Camera size={28} color="var(--accent)" />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
                  Tomar foto o seleccionar archivo
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  Formatos admitidos: JPEG, PNG, WebP
                </span>
              </label>
            )}
            <input
              id="photoInput"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>
        </div>

        {/* 4. Zona o colonia */}
        <div className="form-group">
          <label htmlFor="areaId" className="form-label">
            4. Zona comunitaria o colonia
          </label>
          <select
            id="areaId"
            value={areaId}
            onChange={(e) => setAreaId(e.target.value)}
            className="form-select"
          >
            {PRESET_AREAS.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>

          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              className="btn-secondary"
              style={{ height: '36px', fontSize: 'var(--text-xs)', width: '100%', gap: '6px' }}
            >
              <Navigation size={14} />
              {gpsLoading ? 'Fijando GPS...' : coordinates ? 'Coordenadas registradas ✓' : 'Usar mi ubicación GPS (opcional)'}
            </button>
            {gpsStatus && (
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                {gpsStatus}
              </div>
            )}
          </div>
        </div>

        {/* Botón enviar */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
          style={{ width: '100%', marginTop: '16px' }}
        >
          {submitting ? 'Enviando reporte...' : 'Enviar reporte'}
        </button>
      </form>
    </main>
  );
};
