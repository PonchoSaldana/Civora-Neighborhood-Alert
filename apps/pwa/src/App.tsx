import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext.js';
import { AuthProvider, useAuth, UserSession } from './context/AuthContext.js';
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
  const { user, setUser, logout, isAdmin } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Si no ha elegido ninguna sesión ni modo invitado, mostramos la pantalla de bienvenida/login
  const hasSession = !!localStorage.getItem('civora_logged_in');

  if (!hasSession || showLoginModal) {
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
        onLogout={() => {
          logout();
          setShowLoginModal(true);
        }}
      />
      <div style={{ flex: 1 }}>
        <Routes>
          {/* 1. Inicio: donde se verán los reportes comunitarios */}
          <Route path="/" element={<HomePage />} />

          {/* 2. Mapa: incidencias cercanas según la ubicación */}
          <Route path="/mapa" element={<MapPage />} />

          {/* 3. Reportar: donde el usuario puede hacer un reporte */}
          <Route path="/nuevo" element={<NewIncidentPage />} />

          {/* 3. Mis Reportes: reportes del usuario y borradores locales */}
          <Route path="/mis-reportes" element={<MyIncidentsPage />} />

          {/* 4. Cuenta: donde puede ver y gestionar datos de la cuenta */}
          <Route
            path="/cuenta"
            element={
              <AccountPage
                onLogout={() => {
                  logout();
                  setShowLoginModal(true);
                }}
                onOpenLogin={() => setShowLoginModal(true)}
              />
            }
          />
          <Route path="/ajustes" element={<Navigate to="/cuenta" replace />} />

          {/* Detalle del incidente con comentarios y apoyo */}
          <Route path="/incidente/:id" element={<IncidentDetailPage />} />

          {/* Bandeja de administración — SOLO para rol ADMIN */}
          <Route
            path="/bandeja"
            element={isAdmin ? <ManagerInboxPage /> : <Navigate to="/" replace />}
          />

          {/* Redirección por defecto a inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {/* Barra de navegación inferior */}
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
