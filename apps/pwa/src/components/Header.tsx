import React, { useState, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import {
  Sun,
  Moon,
  LogOut,
  User,
  Ghost,
  ShieldCheck,
  WifiOff,
  Home,
  MapPin,
  PlusCircle,
  FileText,
  Inbox
} from 'lucide-react';
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
      margin: '8px auto 16px auto',
      width: 'calc(100% - 32px)',
      maxWidth: '1200px',
      padding: '10px 18px',
      borderRadius: 'var(--radius-lg)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '12px',
      boxSizing: 'border-box'
    }}>
      {/* Logo */}
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flexShrink: 0 }}>
        <img
          src="/logo.png"
          alt="Civora"
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
        <span style={{ fontWeight: 700, fontSize: 'var(--text-lg)', letterSpacing: '-0.3px' }}>Civora</span>
      </Link>

      {/* Navegación Desktop (Visible en computadoras >= 768px) */}
      <nav className="desktop-only" style={{ alignItems: 'center', gap: '6px' }}>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
        >
          <Home size={15} />
          <span>Inicio</span>
        </NavLink>

        <NavLink
          to="/mapa"
          className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
        >
          <MapPin size={15} />
          <span>Mapa</span>
        </NavLink>

        <NavLink
          to="/mis-reportes"
          className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
        >
          <FileText size={15} />
          <span>Mis reportes</span>
        </NavLink>

        <NavLink
          to="/cuenta"
          className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
        >
          <User size={15} />
          <span>Cuenta</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/bandeja"
            className={({ isActive }) => `desktop-nav-link ${isActive ? 'active' : ''}`}
          >
            <Inbox size={15} />
            <span>Bandeja Admin</span>
          </NavLink>
        )}

        <NavLink
          to="/nuevo"
          className="btn-primary"
          style={{
            height: '36px',
            fontSize: 'var(--text-xs)',
            padding: '0 16px',
            borderRadius: 'var(--radius-pill)',
            gap: '6px',
            marginLeft: '6px'
          }}
        >
          <PlusCircle size={15} />
          <span>Reportar</span>
        </NavLink>
      </nav>

      {/* Controles derecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        {/* Sin conexión */}
        {!isOnline && (
          <span style={{
            fontSize: '11px', color: 'var(--st-proceso)',
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '3px 10px', borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--st-proceso)',
            background: 'var(--glass)'
          }}>
            <WifiOff size={12} /> Sin conexión
          </span>
        )}

        {/* Badge de sesión */}
        <Link
          to="/cuenta"
          style={{
            fontSize: '11px', fontWeight: 600,
            padding: '4px 12px', borderRadius: 'var(--radius-pill)',
            background: isAdmin ? 'var(--accent)' : 'var(--glass)',
            color: isAdmin ? 'var(--on-accent)' : 'var(--text)',
            border: '1px solid var(--hairline)',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            textDecoration: 'none'
          }}
        >
          {isGuest ? <Ghost size={13} /> : isAdmin ? <ShieldCheck size={13} /> : <User size={13} />}
          <span>{isGuest ? 'Invitado' : isAdmin ? 'Admin' : user.displayName}</span>
        </Link>

        {/* Tema */}
        <button onClick={() => setTheme(effectiveTheme === 'dark' ? 'light' : 'dark')}
          aria-label="Cambiar tema" className="btn-secondary"
          style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Cerrar sesión */}
        {onLogout && (
          <button onClick={onLogout} aria-label="Cerrar sesión" title="Cerrar sesión"
            className="btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  );
};
