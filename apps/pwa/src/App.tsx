import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { AuthProvider, useAuth, UserSession } from './context/AuthContext.js';
import { isAwsConfigured } from './config/aws.js';
import { Header } from './components/Header.js';
import { BottomNav } from './components/BottomNav.js';
import { LoginPage } from './pages/LoginPage.js';
import { HomePage } from './pages/HomePage.js';
import { MapPage } from './pages/MapPage.js';
import { NewIncidentPage } from './pages/NewIncidentPage.js';
import { MyIncidentsPage } from './pages/MyIncidentsPage.js';
import { IncidentDetailPage } from './pages/IncidentDetailPage.js';
import { AccountPage } from './pages/AccountPage.js';
import { ManagerInboxPage } from './pages/ManagerInboxPage.js';

const AppRoutes: React.FC = () => {
  const { user, setUser, logout, isAdmin, isRegistered, hasNoRole, loading } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Escuchar evento de token expirado o petición 401 que requiera autenticación
  useEffect(() => {
    const handleAuthRequired = () => {
      setShowLoginModal(true);
    };
    window.addEventListener('civora:auth_required', handleAuthRequired);
    return () => {
      window.removeEventListener('civora:auth_required', handleAuthRequired);
    };
  }, []);

  // Pantalla de carga mientras se valida la sesión real de Cognito
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-canvas)'
      }}>
        <div className="surface-card" style={{ padding: '28px 36px', textAlign: 'center', maxWidth: '340px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid var(--hairline)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '6px' }}>Civora</h2>
          <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Verificando sesión segura...
          </p>
        </div>
      </div>
    );
  }

  // En modo AWS: el acceso exige login real (la API rechaza anónimos con 401).
  // En modo DEMO: se muestra LoginPage si no ha iniciado sesión ni elegido invitado.
  const hasDemoSession = !isAwsConfigured && !!localStorage.getItem('civora_logged_in');
  const needsLogin = (isAwsConfigured && !isRegistered) || (!isAwsConfigured && !hasDemoSession) || showLoginModal;

  if (needsLogin) {
    return (
      <LoginPage
        onLogin={(session: UserSession) => {
          setUser(session);
          localStorage.setItem('civora_logged_in', '1');
          setShowLoginModal(false);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        onLogout={async () => {
          await logout();
          setShowLoginModal(true);
        }}
      />

      {/* Aviso si el usuario está autenticado pero no tiene roles/grupos asignados en Cognito */}
      {hasNoRole && (
        <div
          role="alert"
          className="glass-strong"
          style={{
            margin: '0 auto 16px auto',
            width: 'calc(100% - 32px)',
            maxWidth: '1200px',
            padding: '12px 18px',
            borderRadius: 'var(--radius-sm)',
            borderLeft: '4px solid #eab308',
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'rgba(234, 179, 8, 0.08)'
          }}
        >
          <div>
            <strong>Aviso de cuenta:</strong> Tu cuenta aún no tiene un rol asignado. Contacta al administrador para que habilite tu rol en la colonia (REPORTER o MANAGER).
          </div>
        </div>
      )}

      <div style={{ flex: 1 }}>
        <Routes>
          {/* 1. Inicio: reportes comunitarios */}
          <Route path="/" element={<HomePage />} />

          {/* 2. Mapa: incidencias cercanas según ubicación */}
          <Route path="/mapa" element={<MapPage />} />

          {/* 3. Reportar: crear un reporte */}
          <Route path="/nuevo" element={<NewIncidentPage />} />

          {/* 4. Mis Reportes: reportes del usuario y borradores locales */}
          <Route path="/mis-reportes" element={<MyIncidentsPage />} />

          {/* 5. Cuenta: gestión de sesión, tema visual y almacenamiento */}
          <Route
            path="/cuenta"
            element={
              <AccountPage
                onLogout={async () => {
                  await logout();
                  setShowLoginModal(true);
                }}
                onOpenLogin={() => setShowLoginModal(true)}
              />
            }
          />
          <Route path="/ajustes" element={<Navigate to="/cuenta" replace />} />

          {/* Detalle del incidente */}
          <Route path="/incidente/:id" element={<IncidentDetailPage />} />

          {/* Bandeja de administración — SOLO para roles con permisos de gestor (MANAGER / ADMIN) */}
          <Route
            path="/bandeja"
            element={isAdmin ? <ManagerInboxPage /> : <Navigate to="/" replace />}
          />

          {/* Redirección por defecto a inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Barra de navegación inferior móvil */}
      <BottomNav />
    </div>
  );
};

export const App: React.FC = () => (
  <ThemeProvider>
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  </ThemeProvider>
);