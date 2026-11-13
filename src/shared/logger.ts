export interface LogContext {
  requestId?: string;
  incidentId?: string;
  userSub?: string;
  [key: string]: unknown;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...sanitizeContext(context)
    }));
  },
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...sanitizeContext(context)
    }));
  },
  error: (message: string, error?: unknown, context?: LogContext) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
      ...sanitizeContext(context)
    }));
  }
};

function sanitizeContext(context?: LogContext): Record<string, unknown> {
  if (!context) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    // Strip sensitive fields per Section 5 & 12
    if (/token|authorization|secret|password|presigned|jwt/i.test(key)) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

