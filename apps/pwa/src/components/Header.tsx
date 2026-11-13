import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Ghost, ShieldCheck, WifiOff } from 'lucide-react';
import { useTheme } from '../context/ThemeContext.js';
import { useAuth } from '../context/AuthContext.js';

interface HeaderProps {
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const { effectiveTheme, setTheme } = useTheme();
  const { user, isAdmin, isGuest } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  return (
    <header className="glass" style={{
      position: 'sticky', top: 0, zIndex: 50,
      margin: '8px 12px 16px 12px',
      padding: '10px 16px',
      borderRadius: 'var(--radius-lg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <img
          src="/logo.png"
          alt="Civora"
          style={{
            width: '34px',
            height: '34px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
        <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)' }}>Civora</span>
      </Link>

      {/* Controles derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {/* Sin conexión */}
        {!isOnline && (
          <span style={{
            fontSize: '11px', color: 'var(--st-proceso)',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '2px 8px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--st-proceso)'
          }}>
            <WifiOff size={12} /> Sin conexión
          </span>
        )}

        {/* Badge de sesión */}
        <span style={{
          fontSize: '11px', fontWeight: 600,
          padding: '3px 10px', borderRadius: 'var(--radius-pill)',
          background: isAdmin ? 'var(--accent)' : 'var(--glass)',
          color: isAdmin ? 'var(--on-accent)' : 'var(--text-muted)',
          border: '1px solid var(--hairline)',
          display: 'inline-flex', alignItems: 'center', gap: '4px'
        }}>
          {isGuest ? <Ghost size={12} /> : isAdmin ? <ShieldCheck size={12} /> : <User size={12} />}
          {isGuest ? 'Invitado' : isAdmin ? 'Admin' : user.displayName}
        </span>

        {/* Tema */}
        <button onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar tema" className="btn-secondary"
          style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Cerrar sesión */}
        {onLogout && (
          <button onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"
            className="btn-secondary"
            style={{ width: '32px', height: '32px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
