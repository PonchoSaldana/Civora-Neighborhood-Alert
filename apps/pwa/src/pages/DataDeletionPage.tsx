import React, { useState } from 'react';

export const DataDeletionPage: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('saldanaalfonso68@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '32px 20px 80px' }}>
      <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '8px' }}>
        Eliminación de datos de usuario
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: '32px' }}>
        Respetamos tu privacidad. Puedes solicitar la eliminación de tu cuenta y todos tus datos
        personales en cualquier momento.
      </p>

      <div
        className="surface-card"
        style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px' }}
      >
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '12px' }}>
          ¿Qué datos se eliminan?
        </h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.9', margin: 0 }}>
          <li>Tu cuenta y credenciales de acceso (Amazon Cognito)</li>
          <li>Todos los reportes que hayas creado</li>
          <li>Las fotos que hayas subido</li>
          <li>Tu historial de actividad en la plataforma</li>
        </ul>
      </div>

      <div
        className="surface-card"
        style={{ padding: '24px', marginBottom: '24px', borderRadius: '16px' }}
      >
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '12px' }}>
          Cómo solicitar la eliminación
        </h2>
        <p style={{ marginBottom: '16px' }}>
          Envía un correo electrónico a la siguiente dirección con el asunto{' '}
          <strong>"Eliminar cuenta Civora"</strong> e indica el correo con el que te registraste:
        </p>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'var(--bg-canvas)',
            borderRadius: '10px',
            padding: '12px 16px',
            border: '1px solid var(--hairline)',
          }}
        >
          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 'var(--text-sm)' }}>
            saldanaalfonso68@gmail.com
          </span>
          <button
            onClick={handleCopy}
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 'var(--text-sm)',
            }}
          >
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>
        </div>
      </div>

      <div
        className="surface-card"
        style={{ padding: '24px', borderRadius: '16px' }}
      >
        <h2 style={{ fontSize: 'var(--text-md)', marginBottom: '12px' }}>
          Plazos y confirmación
        </h2>
        <ul style={{ paddingLeft: '20px', lineHeight: '1.9', margin: 0 }}>
          <li>Responderemos tu solicitud en un plazo máximo de <strong>5 días hábiles</strong>.</li>
          <li>La eliminación completa de los datos se realiza en un máximo de <strong>30 días</strong>.</li>
          <li>Recibirás un correo de confirmación cuando el proceso haya concluido.</li>
        </ul>
      </div>

      <p style={{ marginTop: '28px', color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
        Para más información consulta nuestra{' '}
        <a href="/privacidad" style={{ color: 'var(--accent)' }}>Política de Privacidad</a>.
      </p>
    </div>
  );
};
