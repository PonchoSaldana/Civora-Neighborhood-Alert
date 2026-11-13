// Servicio de autenticación con AWS Cognito (Amplify) o modo demo local
// Alterna automáticamente según VITE_COGNITO_USER_POOL_ID esté configurado
import { isAwsConfigured } from '../config/aws.js';

export interface AuthUser {
  sub: string;
  email: string;
  groups: string[];
}

// Lazy import of Amplify only when AWS is configured
async function getAmplifyAuth() {
  if (!isAwsConfigured) return null;
  try {
    const { fetchAuthSession, getCurrentUser, signIn, signOut, signInWithRedirect } = await import('aws-amplify/auth');
    return { fetchAuthSession, getCurrentUser, signIn, signOut, signInWithRedirect };
  } catch {
    return null;
  }
}

export const authService = {
  async getSession(): Promise<{ token: string; user: AuthUser } | null> {
    const amplify = await getAmplifyAuth();
    if (!amplify) return null;

    try {
      const session = await amplify.fetchAuthSession();
      const tokens = session.tokens;
      if (!tokens?.idToken) return null;

      const payload = tokens.idToken.payload;
      const groups: string[] = Array.isArray(payload['cognito:groups'])
        ? (payload['cognito:groups'] as string[])
        : [];

      return {
        token: tokens.idToken.toString(),
        user: {
          sub: payload.sub as string || '',
          email: payload.email as string || '',
          groups,
        },
      };
    } catch {
      return null;
    }
  },

  async signIn(email: string, password: string) {
    const amplify = await getAmplifyAuth();
    if (!amplify) throw new Error('AWS no está configurado. Usa el modo demo.');
    return amplify.signIn({ username: email, password });
  },

  async signInWithSocial(provider: 'Google' | 'Facebook') {
    const amplify = await getAmplifyAuth();
    if (!amplify) throw new Error('AWS no está configurado. Usa el modo demo.');
    return amplify.signInWithRedirect({
      provider: provider as any
    });
  },

  async signOut() {
    const amplify = await getAmplifyAuth();
    if (!amplify) return;
    await amplify.signOut();
  },
};
