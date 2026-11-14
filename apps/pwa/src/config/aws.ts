// Configuración de AWS Amplify para Civora
import { Amplify } from 'aws-amplify';

export const isSocialEnabled = import.meta.env.VITE_ENABLE_SOCIAL === 'true';

const redirectUrl = typeof window !== 'undefined' ? (window.location.origin + '/') : 'http://localhost:5173/';

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || 'us-east-2_dckXMxoiO';
const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || 'qj34vrm8pjpo7sddvsuqo6be';
const region = import.meta.env.VITE_AWS_REGION || 'us-east-2';
const apiUrl = import.meta.env.VITE_API_URL || 'https://bts56gzayk.execute-api.us-east-2.amazonaws.com/dev';

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId,
      loginWith: {
        email: true,
        ...(isSocialEnabled && import.meta.env.VITE_COGNITO_DOMAIN
          ? {
              oauth: {
                domain: import.meta.env.VITE_COGNITO_DOMAIN,
                scopes: ['email', 'openid', 'profile'],
                redirectSignIn: [redirectUrl],
                redirectSignOut: [redirectUrl],
                responseType: 'code' as const,
                providers: ['Google', 'Facebook']
              }
            }
          : {})
      }
    }
  },
  API: {
    REST: {
      CivoraApi: {
        endpoint: apiUrl,
        region
      }
    }
  }
};

export const isAwsConfigured = Boolean(userPoolId && userPoolClientId && apiUrl);

if (isAwsConfigured) {
  try {
    Amplify.configure(amplifyConfig as any);
  } catch (err) {
    console.warn('[Civora] Error al configurar Amplify:', err);
  }
}
