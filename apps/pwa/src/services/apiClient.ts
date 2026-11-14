/**
 * apiClient.ts — Cliente HTTP para la API de Civora en AWS API Gateway
 *
 * Funciona en dos modos automáticamente:
 *   - DEMO: Sin credenciales AWS (VITE_API_URL vacío) → usa LocalApiService (localStorage)
 *   - REAL: Con VITE_API_URL configurado → llama a API Gateway con JWT de Cognito
 */

const API_BASE = import.meta.env.VITE_API_URL || '';

/** Obtiene el JWT de Cognito (si Amplify está activo) o devuelve null */
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
    try {
      const body = await response.json();
      errorMsg = body?.error?.message || body?.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

/** GET /incidents */
export const remoteApi = {
  getIncidents: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<{ items: unknown[]; nextToken?: string }>(`/incidents${qs}`);
  },

  getMyIncidents: () =>
    apiFetch<{ items: unknown[]; nextToken?: string }>('/me/incidents'),

  getIncidentById: (id: string) =>
    apiFetch<unknown>(`/incidents/${id}`),

  createIncident: (body: Record<string, unknown>, idempotencyKey?: string) =>
    apiFetch<{ incidentId: string; isProcessing: boolean }>('/incidents', {
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

  linkDuplicate: (childId: string, parentId: string) =>
    apiFetch<void>(`/incidents/${childId}/link-duplicate`, {
      method: 'POST',
      body: JSON.stringify({ parentId }),
    }),

  presignUpload: (filename: string, contentType: string) =>
    apiFetch<{
      url: string;
      uploadUrl?: string;
      fields: Record<string, string>;
      key: string;
      objectKey?: string;
    }>('/uploads/presign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    }),
};

