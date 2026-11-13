import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Ghost,
  Mail,
  Sun,
  Moon,
  Laptop,
  Trash2,
  ExternalLink,
  LogOut,
  LogIn,
  Inbox,
  CheckCircle,
  FileText
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth, UserSession } from '../context/AuthContext.js';
import { offlineDb } from '../services/db.js';

interface AccountPageProps {
  onLogout?: () => void;
  onOpenLogin?: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onLogout, onOpenLogin }) => {
  const { theme, setTheme } = useTheme();
  const { user, setUser, isAdmin, isGuest } = useAuth();
  const [draftCount, setDraftCount] = useState(0);
  const [editName, setEditName] = useState(user.displayName);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    offlineDb.getAllDrafts().then((d) => setDraftCount(d.length));
  }, []);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    setUser({ ...user, displayName: editName.trim() });
    setMessage('Nombre actualizado correctamente.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleToggleAdminDemo = (role: 'USUARIO' | 'ADMIN') => {
    setUser({ ...user, role });
    setMessage(`Rol cambiado a ${role}.`);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearDrafts = async () => {
    await offlineDb.clearAll();
    setDraftCount(0);
    setMessage('Borradores locales eliminados.');
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <main className="container" style={{ paddingBottom: '40px' }}>
      <section style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
          Cuenta y configuración
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Gestiona tu perfil, rol, preferencias visuales y almacenamiento.
        </p>
      </section>

      {message && (
        <div
          role="status"
          className="glass-strong"
          style={{
            padding: '10px 16px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--text-sm)',
            marginBottom: '16px',
            borderLeft: '4px solid var(--accent)'
          }}
        >
          {message}
        </div>
      )}

      {/* Contenedor Responsivo Grid en Desktop */}
      <div className="desktop-grid-2col">
        {/* Columna Izquierda: Datos de la cuenta */}
        <div>
          {/* 1. Datos de la cuenta */}
          <section className="surface-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              fontWeight: 600
            }}
          >
            {isGuest ? <Ghost size={24} /> : isAdmin ? <ShieldCheck size={24} /> : <User size={24} />}
          </div>
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600 }}>
              {isGuest ? 'Modo invitado (sin registro)' : user.displayName}
            </h2>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Rol: <strong>{user.role}</strong></span>
              <span>•</span>
              <span>{isGuest ? 'Acceso temporal' : 'Cuenta activa'}</span>
              {user.provider && (
                <>
                  <span>•</span>
                  <span>
                    {user.provider === 'google' && '🔵 Conectado con Google'}
                    {user.provider === 'facebook' && '🔷 Conectado con Facebook'}
                    {user.provider === 'local' && '✉️ Correo y contraseña'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Editar nombre visible */}
        <form onSubmit={handleSaveName} style={{ marginBottom: '16px' }}>
          <label htmlFor="account-name" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
            Nombre visible en reportes y comentarios:
          </label>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <input
              id="account-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="form-input"
              placeholder="Tu nombre o apodo"
              style={{ height: '38px', fontSize: 'var(--text-sm)' }}
            />
            <button
              type="submit"
              className="btn-primary"
              style={{ height: '38px', fontSize: 'var(--text-xs)', padding: '0 14px', whiteSpace: 'nowrap' }}
            >
              Guardar
            </button>
          </div>
        </form>

        {user.email && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Mail size={14} /> Correo: {user.email}
          </div>
        )}

        {/* Selector de rol de prueba (Usuario / Admin) */}
        <div style={{ borderTop: '1px solid var(--hairline)', paddingTop: '14px', marginTop: '10px' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
            Cambiar rol activo (Demo):
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleToggleAdminDemo('USUARIO')}
              className="glass"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: !isAdmin ? 600 : 400,
                border: !isAdmin ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <User size={14} /> Usuario
            </button>
            <button
              type="button"
              onClick={() => handleToggleAdminDemo('ADMIN')}
              className="glass"
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: isAdmin ? 600 : 400,
                border: isAdmin ? '2px solid var(--accent)' : '1px solid var(--hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <ShieldCheck size={14} /> Administrador
            </button>
          </div>
        </div>

        {/* Acceso a bandeja de gestión si es Admin */}
        {isAdmin && (
          <div style={{ marginTop: '14px' }}>
            <Link
              to="/bandeja"
              className="btn-primary"
              style={{ width: '100%', height: '40px', fontSize: 'var(--text-xs)', gap: '8px' }}
            >
              <Inbox size={16} /> Abrir bandeja de gestión de reportes
            </Link>
          </div>
        )}

        {/* Botón Iniciar sesión si es invitado, o Cerrar sesión si tiene cuenta */}
        <div style={{ marginTop: '14px', borderTop: '1px solid var(--hairline)', paddingTop: '14px' }}>
          {isGuest ? (
            <button
              type="button"
              onClick={onOpenLogin || onLogout}
              className="btn-secondary"
              style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', gap: '6px' }}
            >
              <LogIn size={15} /> Iniciar sesión o registrarme
            </button>
          ) : (
            <button
              type="button"
              onClick={onLogout}
              className="btn-secondary"
              style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', gap: '6px', color: 'var(--danger)' }}
            >
              <LogOut size={15} /> Cerrar sesión
            </button>
          )}
        </div>
      </section>
    </div>

    {/* Columna Derecha: Tema, Almacenamiento y Sistema */}
    <div>
      {/* 2. Selector de tema visual (Sistema, Claro, Oscuro) */}
      <section className="surface-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '12px' }}>
          Tema visual
        </h2>
        <div
          className="glass"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            gap: '4px'
          }}
        >
          <button
            onClick={() => setTheme('system')}
            style={{
              padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              fontWeight: theme === 'system' ? 600 : 400,
              background: theme === 'system' ? 'var(--accent)' : 'transparent',
              color: theme === 'system' ? 'var(--on-accent)' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Laptop size={16} /> Sistema
          </button>
          <button
            onClick={() => setTheme('light')}
            style={{
              padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              fontWeight: theme === 'light' ? 600 : 400,
              background: theme === 'light' ? 'var(--accent)' : 'transparent',
              color: theme === 'light' ? 'var(--on-accent)' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Sun size={16} /> Claro
          </button>
          <button
            onClick={() => setTheme('dark')}
            style={{
              padding: '10px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              fontWeight: theme === 'dark' ? 600 : 400,
              background: theme === 'dark' ? 'var(--accent)' : 'transparent',
              color: theme === 'dark' ? 'var(--on-accent)' : 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <Moon size={16} /> Oscuro
          </button>
        </div>
      </section>

      {/* 3. Borradores locales y almacenamiento */}
      <section className="surface-card" style={{ padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '8px' }}>
          Almacenamiento y modo offline
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text)' }}>
            Borradores offline en dispositivo:
          </span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>
            {draftCount}
          </span>
        </div>
        <button
          onClick={handleClearDrafts}
          disabled={draftCount === 0}
          className="btn-secondary"
          style={{ height: '36px', fontSize: 'var(--text-xs)', gap: '6px' }}
        >
          <Trash2 size={14} color="var(--danger)" /> Eliminar borradores guardados
        </button>
      </section>

      {/* 4. Enlace al repositorio GitHub */}
      <section className="surface-card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '6px' }}>
          Civora — Alerta Vecinal
        </h2>
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
          Plataforma comunitaria de reporte y seguimiento de incidentes con detección explicable de duplicados en AWS.
        </p>
        <a
          href="https://github.com/PonchoSaldana/Civora-Neighborhood-Alert.git"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{ height: '36px', fontSize: 'var(--text-xs)', display: 'inline-flex', gap: '6px' }}
        >
          <ExternalLink size={14} /> Repositorio en GitHub
        </a>
      </section>
    </div>
  </div>
</main>
  );
};

