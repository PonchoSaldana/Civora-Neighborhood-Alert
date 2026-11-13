import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { offlineDb } from '../services/db.js';
import { api } from '../services/api.js';

interface SyncBannerProps {
  onSyncComplete?: () => void;
}

export const SyncBanner: React.FC<SyncBannerProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const checkPending = async () => {
    try {
      const drafts = await offlineDb.getAllDrafts();
      setPendingCount(drafts.length);
    } catch {}
  };

  useEffect(() => {
    checkPending();
    const handleOnline = () => {
      setIsOnline(true);
      checkPending();
    };
    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncAll = async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      const drafts = await offlineDb.getAllDrafts();
      for (const draft of drafts) {
        await api.createIncident({
          title: draft.title,
          description: draft.description,
          category: draft.category,
          areaId: draft.areaId,
          coordinates: draft.coordinates,
          photoBlob: draft.photoBlob,
          photoName: draft.photoName,
          authorId: null,
          authorName: draft.authorName || 'Vecino',
          idempotencyKey: draft.idempotencyKey
        });
        await offlineDb.deleteDraft(draft.localId);
      }
      await checkPending();
      if (onSyncComplete) onSyncComplete();
    } catch (e) {
      console.error('Error sincronizando borradores', e);
    } finally {
      setSyncing(false);
    }
  };

  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className="glass"
      style={{
        margin: '0 12px 16px 12px',
        padding: '10px 14px',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        borderLeft: isOnline ? '4px solid var(--st-proceso)' : '4px solid var(--danger)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {!isOnline ? <WifiOff size={18} color="var(--danger)" /> : <AlertCircle size={18} color="var(--st-proceso)" />}
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text)' }}>
          {!isOnline
            ? 'Modo sin conexión. Los reportes se guardarán como borradores en este dispositivo.'
            : `Tienes ${pendingCount} reporte(s) guardado(s) localmente listos para enviar.`}
        </span>
      </div>

      {isOnline && pendingCount > 0 && (
        <button
          onClick={handleSyncAll}
          disabled={syncing}
          className="btn-primary"
          style={{ height: '32px', fontSize: 'var(--text-xs)', padding: '0 10px', whiteSpace: 'nowrap' }}
        >
          <RefreshCw size={12} className={syncing ? 'spin' : ''} />
          {syncing ? 'Enviando...' : 'Enviar borradores'}
        </button>
      )}
    </div>
  );
};

