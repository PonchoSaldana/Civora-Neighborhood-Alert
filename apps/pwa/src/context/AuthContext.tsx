import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, SessionMode } from '@shared/types.js';
import { authService, AuthUser } from '../services/auth.js';
import { isAwsConfigured } from '../config/aws.js';

export interface UserSession {
  sub: string | null;        // null = invitado/sin sesión
  email: string | null;
  displayName: string;       // nombre mostrado
  role: UserRole;            // 'ADMIN' para vista de gestor (MANAGER o ADMIN), 'USUARIO' para usuario
  groups: string[];          // grupos reales de Cognito
  mode: SessionMode;         // 'registered' | 'guest' | 'anonymous'
  hasNoRole?: boolean;       // true si autenticado pero sin grupos asignados
  provider?: 'local' | 'cognito' | 'google' | 'facebook';
}

export interface AuthContextType {
  user: UserSession;
  setUser: (u: UserSession) => void;
  logout: (clearOfflineDrafts?: boolean) => Promise<void>;
  isAdmin: boolean;
  isGuest: boolean;
  isRegistered: boolean;
  hasNoRole: boolean;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

export const GUEST_SESSION: UserSession = {
  sub: null,
  email: null,
  displayName: 'Invitado',
  role: 'USUARIO',
  groups: [],
  mode: 'guest',
  hasNoRole: false,
};

/**
 * El rol de la interfaz sale ÚNICAMENTE de los grupos del token Cognito:
 * - MANAGER o ADMIN => vista de gestor ('ADMIN')
 * - REPORTER => vista de usuario ('USUARIO')
 * - Sin grupos => usuario sin rol asignado
 */
export function deriveRoleFromGroups(groups: string[]): { role: UserRole; hasNoRole: boolean } {
  const upper = groups.map((g) => g.toUpperCase());
  if (upper.includes('ADMIN') || upper.includes('MANAGER')) {
    return { role: 'ADMIN', hasNoRole: false };
  }
  if (upper.includes('REPORTER') || upper.includes('USUARIO')) {
    return { role: 'USUARIO', hasNoRole: false };
  }
  return { role: 'USUARIO', hasNoRole: true };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isAwsConfigured);
  const [user, setUserState] = useState<UserSession>(() => {
    // En modo demo local, carga la sesión guardada en localStorage
    if (!isAwsConfigured) {
      try {
        const saved = localStorage.getItem('civora_session');
        if (saved) return JSON.parse(saved);
      } catch {}
    }
    return GUEST_SESSION;
  });

  const refreshSession = useCallback(async () => {
    if (!isAwsConfigured) return;

    try {
      const session = await authService.getSession();
      if (session) {
        const { role, hasNoRole } = deriveRoleFromGroups(session.user.groups);
        const displayName = session.user.email ? session.user.email.split('@')[0] : 'Usuario';
        setUserState({
          sub: session.user.sub,
          email: session.user.email,
          displayName,
          role,
          groups: session.user.groups,
          mode: 'registered',
          hasNoRole,
          provider: 'cognito',
        });
      } else {
        setUserState(GUEST_SESSION);
      }
    } catch {
      setUserState(GUEST_SESSION);
    }
  }, []);

  // Inicialización y escucha de eventos de Amplify Hub
  useEffect(() => {
    if (!isAwsConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const session = await authService.getSession();
        if (!isMounted) return;
        if (session) {
          const { role, hasNoRole } = deriveRoleFromGroups(session.user.groups);
          const displayName = session.user.email ? session.user.email.split('@')[0] : 'Usuario';
          setUserState({
            sub: session.user.sub,
            email: session.user.email,
            displayName,
            role,
            groups: session.user.groups,
            mode: 'registered',
            hasNoRole,
            provider: 'cognito',
          });
        } else {
          setUserState(GUEST_SESSION);
        }
      } catch {
        if (isMounted) setUserState(GUEST_SESSION);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    init();

    let unsubscribe: (() => void) | undefined;
    import('aws-amplify/utils').then(({ Hub }) => {
      if (!isMounted) return;
      unsubscribe = Hub.listen('auth', async ({ payload }) => {
        switch (payload.event) {
          case 'signedIn':
            await refreshSession();
            break;
          case 'signedOut':
            if (isMounted) setUserState(GUEST_SESSION);
            break;
          case 'tokenRefresh_failure':
            console.warn('[Civora] Token refresh falló. Sesión expirada.');
            await authService.signOut();
            if (isMounted) setUserState(GUEST_SESSION);
            break;
        }
      });
    }).catch((err) => {
      console.warn('[Civora] No se pudo inicializar Hub listener:', err);
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [refreshSession]);

  const setUser = (u: UserSession) => {
    setUserState(u);
    // Solo en modo demo local guardamos la sesión en localStorage
    if (!isAwsConfigured) {
      localStorage.setItem('civora_session', JSON.stringify(u));
    }
  };

  const logout = async (clearOfflineDrafts?: boolean) => {
    if (isAwsConfigured) {
      await authService.signOut();
    }
    localStorage.removeItem('civora_session');
    localStorage.removeItem('civora_logged_in');

    if (clearOfflineDrafts) {
      try {
        const { offlineDb } = await import('../services/db.js');
        await offlineDb.clearAll();
      } catch (e) {
        console.warn('[Civora] Error al limpiar borradores offline:', e);
      }
    }

    setUserState(GUEST_SESSION);
  };

  const isAdmin = user.role === 'ADMIN';
  const isGuest = user.mode === 'guest' || !user.sub;
  const isRegistered = user.mode === 'registered' && !!user.sub;
  const hasNoRole = !!user.hasNoRole;

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        logout,
        isAdmin,
        isGuest,
        isRegistered,
        hasNoRole,
        loading,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
