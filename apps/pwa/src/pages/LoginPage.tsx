import React, { useState } from 'react';
import { ShieldCheck, AlertCircle, Eye, EyeOff, UserCheck, Ghost, ArrowRight, KeyRound, Mail, CheckCircle2 } from 'lucide-react';
import { UserSession, deriveRoleFromGroups } from '../context/AuthContext.js';
import { authService } from '../services/auth.js';
import { isAwsConfigured, isSocialEnabled } from '../config/aws.js';

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

  // Estado para cambio de contraseña obligatorio (flujo NEW_PASSWORD_REQUIRED de Cognito)
  const [requiresNewPassword, setRequiresNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Estado para confirmación de código de registro (Cognito CONFIRM_SIGN_UP)
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [confirmationSuccess, setConfirmationSuccess] = useState<string | null>(null);

  /* ── Login con Redes Sociales (oculto por defecto) ── */
  const handleSocialLogin = async (provider: 'Google' | 'Facebook') => {
    if (!isSocialEnabled) return;
    setError(null);
    setLoading(true);

    try {
      await authService.signInWithSocial(provider);
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el proveedor social.');
      setLoading(false);
    }
  };

  /* ── Iniciar sesión ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setLoading(true);

    // ── MODO REAL CON AWS COGNITO ──────────────────────────
    if (isAwsConfigured) {
      try {
        const result = await authService.signIn(email.trim(), password);

        if (result.step === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
          setRequiresNewPassword(true);
          setError(null);
          setLoading(false);
          return;
        }

        if (result.step === 'CONFIRM_SIGN_UP') {
          setError('Tu cuenta aún no ha sido confirmada. Revisa tu correo electrónico para activarla.');
          setLoading(false);
          return;
        }

        if (result.step === 'DONE') {
          const session = await authService.getSession();
          const userObj = session?.user || result.user;
          if (userObj) {
            const { role, hasNoRole } = deriveRoleFromGroups(userObj.groups || []);
            const displayName = userObj.email ? userObj.email.split('@')[0] : 'Usuario';
            onLogin({
              sub: userObj.sub,
              email: userObj.email,
              displayName,
              role,
              groups: userObj.groups || [],
              mode: 'registered',
              hasNoRole,
              provider: 'cognito',
            });
            return;
          }
        }

        setError('No se pudo verificar la sesión. Inténtalo de nuevo.');
      } catch (err: any) {
        setError(err.message || 'Error al iniciar sesión.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ── MODO DEMO LOCAL (sin AWS) ──────────────────────────
    setTimeout(() => {
      const ADMIN_EMAIL = 'admin@civora.com';
      const ADMIN_PASS = 'admin1234';
      const isAdmin = email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASS;

      if (!isAdmin && email.toLowerCase() === ADMIN_EMAIL) {
        setError('Contraseña incorrecta.');
        setLoading(false);
        return;
      }

      onLogin({
        sub: `usr-${Date.now()}`,
        email: email.trim(),
        displayName: isAdmin ? 'Administrador' : email.split('@')[0],
        role: isAdmin ? 'ADMIN' : 'USUARIO',
        groups: isAdmin ? ['ADMIN'] : ['REPORTER'],
        mode: 'registered',
        provider: 'local',
      });
      setLoading(false);
    }, 400);
  };

  /* ── Confirmar nueva contraseña obligatoria (Cognito) ── */
  const handleConfirmNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.confirmNewPassword(newPassword);
      if (result.step === 'DONE') {
        const session = await authService.getSession();
        const userObj = session?.user || result.user;
        if (userObj) {
          const { role, hasNoRole } = deriveRoleFromGroups(userObj.groups || []);
          const displayName = userObj.email ? userObj.email.split('@')[0] : 'Usuario';
          onLogin({
            sub: userObj.sub,
            email: userObj.email,
            displayName,
            role,
            groups: userObj.groups || [],
            mode: 'registered',
            hasNoRole,
            provider: 'cognito',
          });
          return;
        }
      }
      setError('No se pudo completar el cambio de contraseña.');
    } catch (err: any) {
      setError(err.message || 'Error al actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Registro de cuenta ── */
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setConfirmationSuccess(null);

    if (!name.trim()) { setError('Escribe tu nombre o apodo.'); return; }
    if (!email || !password) { setError('Completa todos los campos.'); return; }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return; }

    setLoading(true);

    if (isAwsConfigured) {
      try {
        const result = await authService.signUp(email.trim(), password, name.trim());
        if (result.isSignUpComplete) {
          // El usuario ya fue confirmado automáticamente
          const session = await authService.getSession();
          if (session?.user) {
            const { role, hasNoRole } = deriveRoleFromGroups(session.user.groups || []);
            onLogin({
              sub: session.user.sub,
              email: session.user.email,
              displayName: name.trim() || session.user.email.split('@')[0],
              role,
              groups: session.user.groups || [],
              mode: 'registered',
              hasNoRole,
              provider: 'cognito',
            });
            return;
          }
        }

        // Requiere confirmación por código enviado a su correo
        setNeedsConfirmation(true);
        setConfirmationSuccess(`Te enviamos un código de verificación a ${email.trim()}.`);
      } catch (err: any) {
        setError(err.message || 'Error al crear la cuenta en Cognito.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Modo local / demo
    setTimeout(() => {
      onLogin({
        sub: `usr-${Date.now()}`,
        email: email.trim(),
        displayName: name.trim(),
        role: 'USUARIO',
        groups: ['REPORTER'],
        mode: 'registered',
        provider: 'local',
      });
      setLoading(false);
    }, 400);
  };

  /* ── Confirmación de código de registro ── */
  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!confirmationCode.trim()) {
      setError('Ingresa el código de verificación que llegó a tu correo.');
      return;
    }

    setLoading(true);
    try {
      await authService.confirmSignUp(email.trim(), confirmationCode.trim());
      
      // Tras confirmar, iniciamos sesión automáticamente
      try {
        const loginRes = await authService.signIn(email.trim(), password);
        if (loginRes.step === 'DONE') {
          const session = await authService.getSession();
          const userObj = session?.user || loginRes.user;
          if (userObj) {
            const { role, hasNoRole } = deriveRoleFromGroups(userObj.groups || []);
            onLogin({
              sub: userObj.sub,
              email: userObj.email,
              displayName: name.trim() || userObj.email.split('@')[0],
              role,
              groups: userObj.groups || [],
              mode: 'registered',
              hasNoRole,
              provider: 'cognito',
            });
            return;
          }
        }
      } catch {
        // Si el auto-login falla por alguna razón, lo cambiamos a la pestaña de login
        setNeedsConfirmation(false);
        setTab('login');
        setConfirmationSuccess('Cuenta confirmada exitosamente. Ya puedes iniciar sesión.');
      }
    } catch (err: any) {
      setError(err.message || 'Error al validar el código.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Reenviar código de verificación ── */
  const handleResendCode = async () => {
    setError(null);
    setLoading(true);
    try {
      await authService.resendSignUpCode(email.trim());
      setConfirmationSuccess('Se ha enviado un nuevo código a tu correo.');
    } catch (err: any) {
      setError(err.message || 'No se pudo reenviar el código.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Entrar como invitado ── */
  const handleGuest = () => {
    onLogin({
      sub: null,
      email: null,
      displayName: 'Invitado',
      role: 'USUARIO',
      groups: [],
      mode: 'guest',
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div
        className="glass-strong"
        style={{
          width: '100%',
          maxWidth: '420px',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
        }}
      >
        {/* Cabecera con logo */}
        <div style={{
          padding: '32px 28px 20px 28px',
          borderBottom: '1px solid var(--hairline)',
          textAlign: 'center',
        }}>
          <img
            src="/logo.png"
            alt="Civora Logo"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              display: 'block',
              margin: '0 auto 12px auto',
              filter: 'drop-shadow(0 4px 12px rgba(66, 133, 244, 0.25))',
            }}
          />
          <h1 style={{ fontSize: 'var(--text-2xl, 24px)', fontWeight: 700, letterSpacing: '-0.5px' }}>
            Civora
          </h1>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isAwsConfigured ? 'Acceso a la plataforma comunitaria' : 'Modo Demostración Local'}
          </p>
        </div>

        <div style={{ padding: '20px 24px 28px 24px' }}>
          {/* Formulario de cambio de contraseña obligatorio */}
          {requiresNewPassword ? (
            <form onSubmit={handleConfirmNewPassword}>
              <div style={{
                background: 'var(--glass)',
                borderLeft: '4px solid var(--accent)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text)',
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <KeyRound size={14} /> Nueva contraseña requerida
                </div>
                Tu cuenta requiere establecer una nueva contraseña permanente antes de continuar.
              </div>

              {error && (
                <div role="alert" style={{
                  background: 'var(--danger)', color: '#fff',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label htmlFor="auth-new-password" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                  Nueva contraseña (mínimo 8 caracteres)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="auth-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    className="form-input"
                    style={{ height: '38px', fontSize: 'var(--text-sm)', paddingRight: '40px' }}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    aria-label={showNewPassword ? 'Ocultar' : 'Mostrar'}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent',
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="auth-confirm-password" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                  Confirmar nueva contraseña
                </label>
                <input
                  id="auth-confirm-password"
                  type="password"
                  className="form-input"
                  style={{ height: '38px', fontSize: 'var(--text-sm)' }}
                  placeholder="••••••••"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', height: '42px', fontSize: 'var(--text-sm)' }}
              >
                {loading ? 'Actualizando...' : 'Guardar contraseña y entrar'}
              </button>
            </form>
          ) : needsConfirmation ? (
            /* Formulario de confirmación de código de Cognito */
            <form onSubmit={handleConfirmSignUp}>
              <div style={{
                background: 'var(--glass)',
                borderLeft: '4px solid var(--accent)',
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: '16px',
                fontSize: 'var(--text-xs)',
                color: 'var(--text)',
              }}>
                <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <Mail size={14} /> Verifica tu correo
                </div>
                {confirmationSuccess || `Ingresa el código de 6 dígitos que enviamos a ${email}.`}
              </div>

              {error && (
                <div role="alert" style={{
                  background: 'var(--danger)', color: '#fff',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label htmlFor="auth-conf-code" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                  Código de verificación
                </label>
                <input
                  id="auth-conf-code"
                  type="text"
                  className="form-input"
                  style={{ height: '42px', fontSize: 'var(--text-lg)', textAlign: 'center', letterSpacing: '4px', fontWeight: 600 }}
                  placeholder="123456"
                  maxLength={10}
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  autoComplete="one-time-code"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', height: '42px', fontSize: 'var(--text-sm)', marginBottom: '12px' }}
              >
                {loading ? 'Verificando...' : 'Confirmar cuenta y entrar'}
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0 }}
                >
                  ¿No recibiste el código? Reenviar
                </button>
                <button
                  type="button"
                  onClick={() => { setNeedsConfirmation(false); setError(null); }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: 0 }}
                >
                  Regresar
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Botón para entrar como invitado (siempre visible) */}
              <button
                type="button"
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
                  borderLeft: '4px solid var(--accent)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Ghost size={20} color="var(--accent)" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text)' }}>
                      Entrar como invitado
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Explorar sin iniciar sesión (acceso limitado)
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="var(--accent)" />
              </button>

              {/* Tabs Login / Registro (siempre visibles) */}
              <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr',
                  background: 'var(--glass)', borderRadius: 'var(--radius-sm)',
                  padding: '3px', marginBottom: '16px', gap: '4px',
                }}>
                  {(['login', 'register'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setTab(t); setError(null); }}
                      style={{
                        padding: '7px', borderRadius: 'calc(var(--radius-sm) - 2px)',
                        fontSize: 'var(--text-xs)', fontWeight: tab === t ? 600 : 400,
                        background: tab === t ? 'var(--accent)' : 'transparent',
                        color: tab === t ? 'var(--on-accent)' : 'var(--text)',
                      }}
                    >
                      {t === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                    </button>
                  ))}
                </div>

              {/* Mensaje de Error */}
              {error && (
                <div role="alert" style={{
                  background: 'var(--danger)', color: '#fff',
                  padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)', marginBottom: '14px',
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Formulario Correo / Contraseña */}
              <form onSubmit={tab === 'login' ? handleLogin : handleRegister}>
                {tab === 'register' && (
                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor="reg-name" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Nombre o apodo</label>
                    <input
                      id="reg-name"
                      type="text"
                      className="form-input"
                      style={{ height: '38px', fontSize: 'var(--text-sm)' }}
                      placeholder="Ej. María Pérez"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label htmlFor="auth-email" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Correo electrónico
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    className="form-input"
                    style={{ height: '38px', fontSize: 'var(--text-sm)' }}
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label htmlFor="auth-password" className="form-label" style={{ fontSize: 'var(--text-xs)' }}>
                    Contraseña
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      style={{ height: '38px', fontSize: 'var(--text-sm)', paddingRight: '40px' }}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                      style={{
                        position: 'absolute', right: '10px', top: '50%',
                        transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent',
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: '100%', height: '42px', fontSize: 'var(--text-sm)' }}
                >
                  <UserCheck size={16} />
                  {loading ? 'Verificando...' : tab === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
                </button>
              </form>

              {/* Botones Sociales (solo si VITE_ENABLE_SOCIAL=true) */}
              {isSocialEnabled && (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    margin: '20px 0 16px 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)',
                  }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
                    o continuar con
                    <div style={{ flex: 1, height: '1px', background: 'var(--hairline)' }} />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleSocialLogin('Google')}
                      disabled={loading}
                      className="btn-secondary"
                      style={{
                        width: '100%', height: '44px',
                        background: 'var(--surface)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '10px', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)',
                      }}
                    >
                      <GoogleIcon />
                      <span>Continuar con Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSocialLogin('Facebook')}
                      disabled={loading}
                      className="btn-secondary"
                      style={{
                        width: '100%', height: '44px',
                        background: 'var(--surface)',
                        border: '1px solid var(--hairline)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        gap: '10px', fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text)',
                      }}
                    >
                      <FacebookIcon />
                      <span>Continuar con Facebook</span>
                    </button>
                  </div>
                </>
              )}

              
            </>
          )}
        </div>
      </div>
    </div>
  );
};
