import React from 'react';

export const PrivacyPage: React.FC = () => (
  <div style={{ maxWidth: '760px', margin: '0 auto', padding: '32px 20px 80px' }}>
    <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: '8px' }}>Política de Privacidad</h1>
    <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', marginBottom: '32px' }}>
      Última actualización: noviembre 2026
    </p>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>1. Responsable del tratamiento</h2>
      <p>
        Civora es una plataforma de reporte ciudadano desarrollada y operada con fines comunitarios.
        Para cualquier consulta, escríbenos a{' '}
        <a href="mailto:saldanaalfonso68@gmail.com" style={{ color: 'var(--accent)' }}>
          saldanaalfonso68@gmail.com
        </a>.
      </p>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>2. Datos que recopilamos</h2>
      <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
        <li><strong>Cuenta:</strong> correo electrónico y contraseña (gestionados por Amazon Cognito).</li>
        <li><strong>Reportes:</strong> descripción, categoría, fotos y ubicación geográfica aproximada que tú eliges compartir.</li>
        <li><strong>Uso:</strong> registros técnicos básicos (errores, rendimiento) sin identificación personal.</li>
      </ul>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>3. Finalidad y base legal</h2>
      <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
        <li>Gestionar tu cuenta y autenticar tus accesos (ejecución de contrato).</li>
        <li>Publicar y gestionar reportes ciudadanos visibles para la comunidad (consentimiento).</li>
        <li>Mejorar la estabilidad y seguridad de la plataforma (interés legítimo).</li>
      </ul>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>4. Compartición de datos</h2>
      <p>
        Los reportes que publicas son visibles para otros usuarios de la comunidad. No vendemos
        ni cedemos tus datos personales a terceros con fines comerciales. Utilizamos servicios
        de Amazon Web Services (AWS) para almacenamiento y autenticación, sujetos a sus propias
        políticas de privacidad.
      </p>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>5. Conservación</h2>
      <p>
        Conservamos tus datos mientras tu cuenta esté activa. Los reportes eliminados se borran
        de forma permanente en un plazo de 30 días. Puedes solicitar la eliminación de tu cuenta
        en cualquier momento (ver sección 7).
      </p>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>6. Tus derechos</h2>
      <p>
        Tienes derecho a acceder, rectificar, suprimir, oponerte y limitar el tratamiento de tus
        datos. Escríbenos a{' '}
        <a href="mailto:saldanaalfonso68@gmail.com" style={{ color: 'var(--accent)' }}>
          saldanaalfonso68@gmail.com
        </a>{' '}
        con el asunto "Derechos ARCO" y atenderemos tu solicitud en un plazo de 30 días.
      </p>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>7. Eliminación de cuenta y datos</h2>
      <p>
        Para eliminar tu cuenta y todos tus datos personales, visita{' '}
        <a href="/eliminar-datos" style={{ color: 'var(--accent)' }}>
          /eliminar-datos
        </a>{' '}
        o envíanos un correo con el asunto "Eliminar cuenta". Procesaremos la solicitud
        en un plazo máximo de 30 días.
      </p>
    </section>

    <section style={{ marginBottom: '28px' }}>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>8. Cookies y almacenamiento local</h2>
      <p>
        La App utiliza almacenamiento local del navegador (localStorage / IndexedDB) únicamente
        para guardar borradores de reportes y preferencias de tema. No utilizamos cookies de
        seguimiento de terceros.
      </p>
    </section>

    <section>
      <h2 style={{ fontSize: 'var(--text-lg)', marginBottom: '10px' }}>9. Cambios en esta política</h2>
      <p>
        Notificaremos cambios relevantes mediante un aviso en la App. El uso continuado tras la
        notificación implica aceptación.
      </p>
    </section>
  </div>
);
