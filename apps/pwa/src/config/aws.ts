// Configuración de AWS Amplify para Civora
// Los valores reales se inyectan por variables de entorno VITE_* en .env.local
// Ver .env.example para las variables necesarias

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
    },
  },
  API: {
    REST: {
      CivoraApi: {
        endpoint: import.meta.env.VITE_API_URL || '',
        region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      },
    },
  },
};

// Verifica si hay configuración real de AWS disponible
export const isAwsConfigured =
  !!import.meta.env.VITE_COGNITO_USER_POOL_ID &&
  !!import.meta.env.VITE_COGNITO_CLIENT_ID &&
  !!import.meta.env.VITE_API_URL;

