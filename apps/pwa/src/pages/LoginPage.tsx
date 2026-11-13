import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Eye, EyeOff, UserCheck, Ghost, ArrowRight } from 'lucide-react';
import { UserSession } from '../context/AuthContext.js';
import { authService } from '../services/auth.js';
import { isAwsConfigured } from '../config/aws.js';

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
}

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>
);

const FacebookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" style={{ flexShrink: 0 }}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Login con Redes Sociales (Google / Facebook) ── */
  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    setError(null);
    setLoading(true);
    try {
      if (isAwsConfigured) {
        await authService.signInWithSocial(provider);
        return;
      }
      // Simulación en entorno demo local
      setTimeout(() => {
        onLogin({
          sub: `usr-${provider.toLowerCase()}-${Date.now().toString().slice(-4)}`,
          email: provider === 'Google' ? 'vecino.civora@gmail.com' : 'vecino.civora@facebook.com',
          displayName: provider === 'Google' ? 'Vecino Google' : 'Vecino Facebook',
          role: 'USUARIO',
          mode: 'registered',
          provider: provider === 'Google' ? 'google' : 'facebook'
        });
        setLoading(false);
      }, 400);
    } catch (err: any) {
      setError(err.message || `No se pudo iniciar sesión con ${provider}.`);
      setLoading(false);
    }
  };

  /* ── Login con cuenta local / correo ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) { setError('Completa todos los campos.'); return; }

    setLoading(true);
    setTimeout(() => {
      // Detectar admin por email de demo
      const isAdmin = email.toLowerCase().includes('admin');
      onLogin({
        sub: `usr-${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        role: isAdmin ? 'ADMIN' : 'USUARIO',
        mode: 'registered',
        provider: 'local'
      });
      setLoading(false);
    }, 500);
  };

  /* ── Registro de cuenta nueva ── */
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Escribe tu nombre o apodo.'); return; }
    if (!email || !password) { setError('Completa todos los campos.'); return; }
    if (password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres.'); return; }

    setLoading(true);
    setTimeout(() => {
      onLogin({
        sub: `usr-${Date.now()}`,
        email,
        displayName: name.trim(),
        role: 'USUARIO',
        mode: 'registered',
        provider: 'local'
      });
      setLoading(false);
    }, 500);
  };

  /* ── Entrar sin cuenta (invitado) ── */
  const handleGuest = () => {
    onLogin({
      sub: null,
      email: null,
      displayName: 'Invitado',
      role: 'USUARIO',
      mode: 'guest'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div
        className="glass-strong"
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden'
        }}
      >
        {/* ── Cabecera con logo oficial más grande ── */}
        <div style={{
          padding: '32px 28px 20px 28px',
          borderBottom: '1px solid var(--hairline)',
          textAlign: 'center'
        }}>
          <img
            src="/logo.png"
            alt="Civora Logo"
            style={{
              width: '110px',
              height: '110px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 14px auto',
              filter: 'drop-shadow(0 4px 12px rgba(66, 133, 244, 0.25))'
            }}
          />
          <h1 style={{ fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Civora
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
          </p>
        </div>

        <div style={{ padding: '20px 24px 28px 24px' }}>
          {/* ── Botón Invitado (sin registro) ── */}
          <button
            onClick={handleGuest}
            className="glass"
            style={{
              width: '100%',
              padding: '12px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              cursor: 'pointer',
              borderLeft: '4px solid var(--accent)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Ghost size={20} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
                  Entrar sin registrarme
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Explora reportes y reporta de forma anónima
                </div>
              </div>
            </div>
            <ArrowRight size={16} color="var(--accent)" />
          </button>

          {/* ── Tabs Login / Registro ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--glass)', borderRadius: 'var(--radius-sm)',
            padding: '3px', marginBottom: '16px', gap: '4px'
          }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); }}
                style={{
                  padding: '7px', borderRadius: 'calc(var(--radius-sm) - 2px)',
                  fontSize: 'var(--text-xs)', fontWeight: tab === t ? 600 : 400,
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? 'var(--on-accent)' : 'var(--text)'
                }}>
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {/* ── Mensaje de Error ── */}
          {error && (
            <div role="alert" style={{
              background: 'var(--danger)', color: '#fff',
              padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)', marginBottom: '14px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* ── Formulario Correo / Contraseña ── */}
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            {tab === 'register' && (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="reg-name" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Nombre o apodo</label>
                <input id="reg-name" type="text" className="form-input" style={{ height: '38px', fontSize: 'var(--text-sm)' }}
                  placeholder="Ej. María Pérez"
                  value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              </div>
            )}

            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label htmlFor="auth-email" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Correo electrónico</label>
              <input id="auth-email" type="email" className="form-input" style={{ height: '38px', fontSize: 'var(--text-sm)' }}
                placeholder="tu@correo.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label htmlFor="auth-password" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ height: '38px', fontSize: 'var(--text-sm)', paddingRight: '40px' }}
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent'
                  }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', height: '42px', fontSize: 'var(--text-sm)' }}>
              <UserCheck size={16} />
              {loading ? 'Verificando...' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          {/* ── Divisor Social (abajo) ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            margin: '20px 0 16px 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
            o continuar con
            <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
          </div>

          {/* ── Botones de Inicio de Sesión Social (Google y Facebook) hasta abajo ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
            {/* Google */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Google')}
              disabled={loading}
              className="btn-secondary"
              style={{
                width: '100%',
                height: '44px',
                background: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--text)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <GoogleIcon />
              <span>Continuar con Google</span>
            </button>

            {/* Facebook */}
            <button
              type="button"
              onClick={() => handleSocialLogin('Facebook')}
              disabled={loading}
              className="btn-secondary"
              style={{
                width: '100%',
                height: '44px',
                background: 'var(--surface)',
                border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--text)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}
            >
              <FacebookIcon />
              <span>Continuar con Facebook</span>
            </button>
          </div>

          {/* Nota de demostración */}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
            Demo: usa un correo con la palabra "admin" para probar funciones de administrador.
          </p>
        </div>
      </div>
    </div>
  );
};
