import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, MapPin, PlusCircle, FileText, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  return (
    <nav
      className="glass-pill"
      style={{
        position: 'fixed',
        bottom: 'calc(12px + env(safe-area-inset-bottom))',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 20px)',
        maxWidth: '480px',
        height: '62px',
        padding: '6px 8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 50,
        boxShadow: 'var(--glass-shadow)'
      }}
    >
      {/* 1. Inicio */}
      <NavLink
        to="/"
        end
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400
        })}
      >
        <Home size={18} />
        <span>Inicio</span>
      </NavLink>

      {/* 2. Mapa */}
      <NavLink
        to="/mapa"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400
        })}
      >
        <MapPin size={18} />
        <span>Mapa</span>
      </NavLink>

      {/* 3. Reportar (Centro con acento) */}
      <NavLink
        to="/nuevo"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          background: 'var(--accent)',
          color: 'var(--on-accent)',
          padding: '6px 14px',
          borderRadius: 'var(--radius-pill)',
          fontSize: '11px',
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(63, 95, 143, 0.35)',
          transform: isActive ? 'scale(1.04)' : 'none',
          transition: 'transform var(--motion-fast) var(--ease)'
        })}
      >
        <PlusCircle size={16} />
        <span>Reportar</span>
      </NavLink>

      {/* 4. Mis Reportes */}
      <NavLink
        to="/mis-reportes"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400
        })}
      >
        <FileText size={18} />
        <span>Mis reportes</span>
      </NavLink>

      {/* 5. Cuenta */}
      <NavLink
        to="/cuenta"
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          color: isActive ? 'var(--accent)' : 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: isActive ? 600 : 400
        })}
      >
        <User size={18} />
        <span>Cuenta</span>
      </NavLink>
    </nav>
  );
};
