// Servicio de autenticación con AWS Cognito (Amplify v6) o modo demo local
import { isAwsConfigured, isSocialEnabled } from '../config/aws.js';

export interface AuthUser {
  sub: string;
  email: string;
  groups: string[];
}

export type AuthSignInStep =
  | 'DONE'
  | 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  | 'CONFIRM_SIGN_UP'
  | 'CONTINUE_SIGN_IN_WITH_MFA_SELECTION'
  | 'CONFIRM_SIGN_IN_WITH_SMS_CODE'
  | 'RESET_PASSWORD';

export interface SignInResult {
  step: AuthSignInStep;
  user?: AuthUser;
  message?: string;
}

// Import dinámico de funciones de autenticación de Amplify v6
async function getAmplifyAuth() {
  if (!isAwsConfigured) return null;
  try {
    const { fetchAuthSession, signIn, confirmSignIn, signOut, signInWithRedirect } = await import('aws-amplify/auth');
    return { fetchAuthSession, signIn, confirmSignIn, signOut, signInWithRedirect };
  } catch (err) {
    console.warn('[Civora] Error al cargar módulo aws-amplify/auth:', err);
    return null;
  }
}

export const authService = {
  /**
   * Obtiene la sesión actual verificando el ID token en Cognito
   */
  async getSession(): Promise<{ token: string; user: AuthUser } | null> {
    const amplify = await getAmplifyAuth();
    if (!amplify) return null;

    try {
      let session = await amplify.fetchAuthSession();
      if (!session.tokens?.idToken) {
        await new Promise((r) => setTimeout(r, 150));
        session = await amplify.fetchAuthSession();
      }
      const tokens = session.tokens;
      if (!tokens?.idToken) return null;

      const payload = tokens.idToken.payload;
      let groups: string[] = [];
      const rawGroups = payload['cognito:groups'];
      if (Array.isArray(rawGroups)) {
        groups = rawGroups.map(String);
      } else if (typeof rawGroups === 'string') {
        try {
          groups = JSON.parse(rawGroups);
        } catch {
          groups = [rawGroups];
        }
      }

      return {
        token: tokens.idToken.toString(),
        user: {
          sub: (payload.sub as string) || '',
          email: (payload.email as string) || '',
          groups,
        },
      };
    } catch {
      return null;
    }
  },

  /**
   * Inicia sesión con correo y contraseña en Cognito (flujo SRP de Amplify v6)
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    const amplify = await getAmplifyAuth();
    if (!amplify) {
      throw new Error('AWS Cognito no está configurado. La app opera en modo demo.');
    }

    try {
      const output = await amplify.signIn({
        username: email.trim(),
        password,
      });

      const nextStep = output.nextStep;

      if (nextStep.signInStep === 'DONE' || (output as any).isSignedIn) {
        const session = await this.getSession();
        return {
          step: 'DONE',
          user: session?.user,
        };
      }

      if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        return {
          step: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
          message: 'Se requiere establecer una nueva contraseña permanente para tu cuenta.',
        };
      }

      if (nextStep.signInStep === 'CONFIRM_SIGN_UP') {
        return {
          step: 'CONFIRM_SIGN_UP',
          message: 'Tu cuenta aún no ha sido confirmada. Revisa tu correo electrónico para activarla.',
        };
      }

      return {
        step: nextStep.signInStep as AuthSignInStep,
        message: 'Acción adicional requerida para completar el inicio de sesión.',
      };
    } catch (err: any) {
      const errorName = err?.name || '';
      const errorMessage = err?.message || '';

      // Si el usuario ya está autenticado, cerramos la sesión previa y reintentamos con las credenciales dadas
      if (errorName === 'UserAlreadyAuthenticatedException') {
        try {
          await amplify.signOut();
          const retry = await amplify.signIn({ username: email.trim(), password });
          if (retry.nextStep.signInStep === 'DONE' || (retry as any).isSignedIn) {
            const session = await this.getSession();
            return { step: 'DONE', user: session?.user };
          }
          if (retry.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
            return {
              step: 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED',
              message: 'Se requiere establecer una nueva contraseña permanente para tu cuenta.',
            };
          }
        } catch {
          const session = await this.getSession();
          if (session) {
            return { step: 'DONE', user: session.user };
          }
        }
      }

      if (errorName === 'UserNotFoundException' || errorName === 'NotAuthorizedException') {
        throw new Error('Correo o contraseña incorrectos.');
      }

      if (errorName === 'UserNotConfirmedException') {
        throw new Error('Tu cuenta no ha sido confirmada. Revisa tu correo electrónico.');
      }

      if (errorName === 'PasswordResetRequiredException') {
        throw new Error('Debes restablecer tu contraseña para continuar.');
      }

      if (errorName === 'NetworkError' || errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        throw new Error('No se pudo conectar con el servicio de autenticación. Verifica tu conexión a internet.');
      }

      throw new Error(err.message || 'Error al iniciar sesión. Inténtalo de nuevo.');
    }
  },

  /**
   * Confirma una nueva contraseña cuando Cognito exige cambio obligatorio
   */
  async confirmNewPassword(newPassword: string): Promise<SignInResult> {
    const amplify = await getAmplifyAuth();
    if (!amplify) throw new Error('AWS no está configurado.');

    try {
      const output = await amplify.confirmSignIn({
        challengeResponse: newPassword,
      });

      if (output.nextStep.signInStep === 'DONE') {
        const session = await this.getSession();
        return { step: 'DONE', user: session?.user };
      }

      return {
        step: output.nextStep.signInStep as AuthSignInStep,
        message: 'Paso adicional requerido tras cambio de contraseña.',
      };
    } catch (err: any) {
      throw new Error(err.message || 'No se pudo actualizar la contraseña requerida.');
    }
  },

  /**
   * Cierra sesión en Cognito a través de Amplify
   */
  async signOut(): Promise<void> {
    const amplify = await getAmplifyAuth();
    if (!amplify) return;

    try {
      await amplify.signOut();
    } catch (err) {
      console.warn('[Civora] Error al cerrar sesión en Amplify:', err);
    }
  },

  /**
   * Inicio de sesión con proveedor federado (solo si está habilitado)
   */
  async signInWithSocial(provider: 'Google' | 'Facebook') {
    if (!isSocialEnabled) {
      throw new Error('El inicio de sesión social no está habilitado en este entorno.');
    }
    const amplify = await getAmplifyAuth();
    if (!amplify) throw new Error('AWS no está configurado.');
    return amplify.signInWithRedirect({
      provider: provider as any,
    });
  },
};
