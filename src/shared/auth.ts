import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { UserRole } from './types.js';

export interface AuthContext {
  sub: string;
  email?: string;
  roles: UserRole[];
  isManager: boolean;
  isAdmin: boolean;
}

export function extractAuth(event: APIGatewayProxyEventV2): AuthContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jwt = (event.requestContext as any)?.authorizer?.jwt;
  const claims = jwt?.claims || {};

  const sub = claims.sub || 'anonymous';
  const email = claims.email;

  // In Cognito, groups can come as a string, array, or space-separated string
  let groups: string[] = [];
  const rawGroups = claims['cognito:groups'];
  if (Array.isArray(rawGroups)) {
    groups = rawGroups;
  } else if (typeof rawGroups === 'string') {
    try {
      groups = JSON.parse(rawGroups);
    } catch {
      groups = rawGroups.split(/[\s,]+/);
    }
  }

  const roles: UserRole[] = [];
  if (groups.includes('ADMIN')) roles.push('ADMIN');
  if (groups.includes('MANAGER')) roles.push('MANAGER');
  if (groups.includes('REPORTER') || roles.length === 0) roles.push('REPORTER');

  const isAdmin = roles.includes('ADMIN');
  const isManager = isAdmin || roles.includes('MANAGER');

  return {
    sub,
    email,
    roles,
    isManager,
    isAdmin
  };
}

export function jsonResponse(statusCode: number, data: unknown, requestId?: string) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Credentials': 'true'
    },
    body: JSON.stringify(
      statusCode >= 400
        ? {
            error: {
              code: getErrorCode(statusCode),
              message: typeof data === 'string' ? data : (data as { message?: string }).message || 'Error en la solicitud',
              details: typeof data === 'object' ? data : undefined,
              requestId
            }
          }
        : data
    )
  };
}

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 413: return 'PAYLOAD_TOO_LARGE';
    case 429: return 'TOO_MANY_REQUESTS';
    default: return 'INTERNAL_SERVER_ERROR';
  }
}

