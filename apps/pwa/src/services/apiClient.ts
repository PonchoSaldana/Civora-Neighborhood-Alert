/**
 * apiClient.ts — Cliente HTTP para la API de Civora en AWS API Gateway
 *
 * Funciona en dos modos automáticamente:
 *   - DEMO: Sin credenciales AWS (VITE_API_URL vacío) → usa LocalApiService (localStorage)
 *   - REAL: Con VITE_API_URL configurado → llama a API Gateway con JWT (ID token) de Cognito
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Obtiene el ID Token de Cognito (si Amplify está activo) o devuelve null */
async function getJwt(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch {
    return null;
  }
}

/** Realiza un fetch autenticado a la API Gateway */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!API_BASE) {
    throw new Error('VITE_API_URL no configurado — usando modo demo local');
  }

  const jwt = await getJwt();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (jwt) {
    headers['Authorization'] = `Bearer ${jwt}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('civora:auth_required'));
      }
      errorMsg = jwt
        ? 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.'
        : 'Necesitas iniciar sesión con tu cuenta para continuar.';
    }
    try {
      const body = await response.json();
      if (response.status !== 401) {
        errorMsg = body?.error?.message || body?.message || errorMsg;
      }
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

/** Endpoints remotos de la API de Civora */
export const remoteApi = {
  getIncidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ items: unknown[]; nextToken?: string; count?: number }>(`/incidents${qs}`);
  },

  getMyIncidents: () =>
    apiFetch<{ items: unknown[]; nextToken?: string; count?: number }>('/me/incidents'),

  getIncidentById: (id: string) =>
    apiFetch<unknown>(`/incidents/${id}`),

  createIncident: (body: Record<string, unknown>, idempotencyKey?: string) =>
    apiFetch<{ incidentId: string; executionArn?: string; status?: string; isProcessing: boolean; message?: string }>('/incidents', {
      method: 'POST',
      headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      body: JSON.stringify(body),
    }),

  confirmIncident: (id: string) =>
    apiFetch<void>(`/incidents/${id}/confirm`, { method: 'POST' }),

  updateStatus: (id: string, status: string, publicNote?: string) =>
    apiFetch<unknown>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, publicNote }),
    }),

  linkDuplicate: (childId: string, parentIncidentId: string) =>
    apiFetch<void>(`/incidents/${childId}/link-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ parentIncidentId }),
    }),

  presignUpload: (filename: string, contentType: string, sizeBytes?: number) =>
    apiFetch<{
      url: string;
      uploadUrl?: string;
      fields: Record<string, string>;
      key: string;
      objectKey?: string;
      expiresInSeconds?: number;
    }>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType, sizeBytes }),
    }),
};
