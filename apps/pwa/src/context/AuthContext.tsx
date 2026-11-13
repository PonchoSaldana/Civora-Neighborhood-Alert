import React, { createContext, useContext, useState } from 'react';
import { UserRole, SessionMode } from '@shared/types.js';

export interface UserSession {
  sub: string | null;        // null = invitado/anónimo
  email: string | null;
  displayName: string;       // nombre mostrado
  role: UserRole;
  mode: SessionMode;         // 'registered' | 'guest' | 'anonymous'
}

interface AuthContextType {
  user: UserSession;
  setUser: (u: UserSession) => void;
  logout: () => void;
  isAdmin: boolean;
  isGuest: boolean;
  isRegistered: boolean;
}

const GUEST_SESSION: UserSession = {
  sub: null,
  email: null,
  displayName: 'Invitado',
  role: 'USUARIO',
  mode: 'guest',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<UserSession>(() => {
    try {
      const saved = localStorage.getItem('civora_session');
      if (saved) return JSON.parse(saved);
    } catch {}
    return GUEST_SESSION;
  });

  const setUser = (u: UserSession) => {
    setUserState(u);
    localStorage.setItem('civora_session', JSON.stringify(u));
  };

  const logout = () => {
    localStorage.removeItem('civora_session');
    localStorage.removeItem('civora_logged_in');
    setUserState(GUEST_SESSION);
  };

  const isAdmin = user.role === 'ADMIN';
  const isGuest = user.mode === 'guest';
  const isRegistered = user.mode === 'registered';

  return (
    <AuthContext.Provider value={{ user, setUser, logout, isAdmin, isGuest, isRegistered }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
