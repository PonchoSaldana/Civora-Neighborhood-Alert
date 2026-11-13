import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Eye, EyeOff, UserCheck, Ghost, ArrowRight } from 'lucide-react';
import { UserSession } from '../context/AuthContext.js';

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Login con cuenta local (simulado) ── */
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
        mode: 'registered'
      });
      setLoading(false);
    }, 600);
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
        mode: 'registered'
      });
      setLoading(false);
    }, 600);
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
        {/* ── Cabecera con nuevo logo ── */}
        <div style={{
          padding: '28px 28px 20px 28px',
          borderBottom: '1px solid var(--hairline)',
          textAlign: 'center'
        }}>
          <img
            src="/logo.png"
            alt="Civora Logo"
            style={{
              width: '64px',
              height: '64px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 12px auto'
            }}
          />
          <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 600 }}>Civora</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '4px' }}>
            Alerta vecinal — reporte y seguimiento comunitario
          </p>
        </div>

        <div style={{ padding: '24px 28px 28px 28px' }}>
          {/* ── Botón Invitado (destacado) ── */}
          <button
            onClick={handleGuest}
            className="glass"
            style={{
              width: '100%',
              padding: '14px 16px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              cursor: 'pointer',
              borderLeft: '4px solid var(--accent)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Ghost size={22} color="var(--accent)" />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
                  Entrar sin registrarme
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Ve reportes y sube uno de forma anónima o con tu nombre
                </div>
              </div>
            </div>
            <ArrowRight size={18} color="var(--accent)" />
          </button>

          {/* ── Divisor ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            marginBottom: '20px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)'
          }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
            o crea una cuenta para seguir tus reportes
            <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
          </div>

          {/* ── Tabs Login / Registro ── */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'var(--glass)', borderRadius: 'var(--radius-sm)',
            padding: '4px', marginBottom: '20px', gap: '4px'
          }}>
            {(['login', 'register'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(null); }}
                style={{
                  padding: '8px', borderRadius: 'calc(var(--radius-sm) - 2px)',
                  fontSize: 'var(--text-sm)', fontWeight: tab === t ? 600 : 400,
                  background: tab === t ? 'var(--accent)' : 'transparent',
                  color: tab === t ? 'var(--on-accent)' : 'var(--text)'
                }}>
                {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
              </button>
            ))}
          </div>

          {/* ── Error ── */}
          {error && (
            <div role="alert" style={{
              background: 'var(--danger)', color: '#fff',
              padding: '10px 14px', borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── Formulario ── */}
          <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
            {tab === 'register' && (
              <div className="form-group">
                <label htmlFor="reg-name" className="form-label">Nombre o apodo</label>
                <input id="reg-name" type="text" className="form-input"
                  placeholder="Ej. María, Vecino del Centro..."
                  value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email" className="form-label">Correo electrónico</label>
              <input id="auth-email" type="email" className="form-input"
                placeholder="tu@correo.com"
                value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password" className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                  style={{
                    position: 'absolute', right: '10px', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent'
                  }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
              <UserCheck size={18} />
              {loading ? 'Verificando...' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
            </button>
          </form>

          {/* Nota admin demo */}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px' }}>
            Demo: usa cualquier correo que contenga "admin" para acceder como administrador.
          </p>
        </div>
      </div>
    </div>
  );
};
