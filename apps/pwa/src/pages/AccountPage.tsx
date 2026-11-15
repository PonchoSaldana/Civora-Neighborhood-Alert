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
  LogOut,
  LogIn,
  Inbox,
  AlertTriangle,
  Key
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';
import { offlineDb } from '../services/db.js';
import { isAwsConfigured } from '../config/aws.js';

interface AccountPageProps {
  onLogout?: (clearDrafts?: boolean) => void | Promise<void>;
  onOpenLogin?: () => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({ onLogout, onOpenLogin }) => {
  const { theme, setTheme } = useTheme();
  const { user, setUser, logout, isAdmin, isGuest, hasNoRole } = useAuth();
  const [draftCount, setDraftCount] = useState(0);
  const [editName, setEditName] = useState(user.displayName);
  const [message, setMessage] = useState<string | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

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

  const handleClearDrafts = async () => {
    await offlineDb.clearAll();
    setDraftCount(0);
    setMessage('Borradores locales eliminados.');
    setTimeout(() => setMessage(null), 3000);
  };

  const handleConfirmLogout = async (clearDrafts: boolean) => {
    setShowLogoutModal(false);
    if (onLogout) {
      await onLogout(clearDrafts);
    } else {
      await logout(clearDrafts);
    }
  };

  return (
    <main className="container" style={{ paddingBottom: '40px' }}>
      <section style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '4px' }}>
          Cuenta y configuración
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Gestiona tu perfil, preferencias visuales y almacenamiento.
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

      {/* Modal de confirmación de cierre de sesión con opción de IndexedDB */}
      {showLogoutModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '16px'
        }}>
          <div className="surface-card" style={{ maxWidth: '420px', width: '100%', padding: '24px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <LogOut size={18} />
              </div>
              <h3 style={{ fontSize: 'var(--text-md)', margin: 0 }}>Cerrar sesión</h3>
            </div>

            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: 1.5 }}>
              ¿Estás seguro de que deseas salir? Elige qué deseas hacer con los borradores de reportes almacenados localmente en este dispositivo ({draftCount} guardados).
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                className="btn-primary"
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)' }}
                onClick={() => handleConfirmLogout(false)}
              >
                Cerrar sesión y conservar borradores
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', color: 'var(--danger)' }}
                onClick={() => handleConfirmLogout(true)}
              >
                <Trash2 size={14} /> Cerrar sesión y borrar borradores
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ width: '100%', height: '34px', fontSize: 'var(--text-xs)', marginTop: '4px' }}
                onClick={() => setShowLogoutModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
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
                  <span>Rol: <strong>{isAdmin ? 'Gestor (Admin/Manager)' : 'Reportante'}</strong></span>
                  <span>•</span>
                  <span>{isGuest ? 'Acceso temporal' : 'Sesión activa'}</span>
                </div>
              </div>
            </div>

            {/* Aviso si está autenticado pero no tiene ningún grupo en Cognito */}
            {hasNoRole && isAwsConfigured && (
              <div
                role="alert"
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid #eab308',
                  marginBottom: '16px',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--text)',
                  lineHeight: 1.4,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px'
                }}
              >
                <AlertTriangle size={16} color="#eab308" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>
                  <strong>Tu cuenta aún no tiene un rol asignado:</strong> En Amazon Cognito perteneces a ningún grupo activo (REPORTER o MANAGER). Contacta al administrador para que asigne tus permisos comunitarios.
                </span>
              </div>
            )}

            {/* Detalles de la cuenta */}
            {!isGuest && user.email && (
              <div style={{
                background: 'var(--glass)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                border: '1px solid var(--hairline)',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> Correo: <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
                </div>
              </div>
            )}

            {/* Selector de rol local ÚNICAMENTE en modo demo (sin AWS) */}
            {!isAwsConfigured && (
              <div style={{
                marginTop: '12px',
                marginBottom: '16px',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--glass)',
                border: '1px solid var(--hairline)'
              }}>
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>
                  Simulador de rol (Solo modo Demo local):
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={user.role === 'USUARIO' && !isGuest ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, height: '32px', fontSize: '11px' }}
                    onClick={() => setUser({ ...user, role: 'USUARIO', mode: 'registered' })}
                  >
                    Usuario
                  </button>
                  <button
                    type="button"
                    className={user.role === 'ADMIN' ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, height: '32px', fontSize: '11px' }}
                    onClick={() => setUser({ ...user, role: 'ADMIN', mode: 'registered' })}
                  >
                    Admin
                  </button>
                  <button
                    type="button"
                    className={isGuest ? 'btn-primary' : 'btn-secondary'}
                    style={{ flex: 1, height: '32px', fontSize: '11px' }}
                    onClick={() => setUser({ ...user, role: 'USUARIO', mode: 'guest' })}
                  >
                    Invitado
                  </button>
                </div>
              </div>
            )}

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

            {/* Acceso a bandeja de gestión si es Admin / Manager */}
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
                  onClick={onOpenLogin}
                  className="btn-secondary"
                  style={{ width: '100%', height: '38px', fontSize: 'var(--text-xs)', gap: '6px' }}
                >
                  <LogIn size={15} /> Iniciar sesión
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowLogoutModal(true)}
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

          {/* 4. Acerca de Civora */}
          <section className="surface-card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '6px' }}>
              Civora — Alerta Vecinal
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Plataforma comunitaria de reporte y seguimiento de incidentes en tu colonia.
              {isAwsConfigured ? ' Conectado a AWS Cloud (us-east-2).' : ' Modo demostración local.'}
            </p>
          </section>
        </div>
      </div>
    </main>
  );
};