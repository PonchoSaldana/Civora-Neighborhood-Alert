// ============================================================
// Civora — Tipos compartidos (Frontend PWA + Backend Lambda)
// ============================================================

/** Roles del sistema: sólo USUARIO y ADMIN */
export type UserRole = 'USUARIO' | 'ADMIN';

/** Modo de sesión: cuenta registrada, invitado anónimo o sin sesión */
export type SessionMode = 'registered' | 'guest' | 'anonymous';

export type IncidentCategory =
  | 'baches'
  | 'fugas_agua'
  | 'luminarias'
  | 'basura'
  | 'danos_infraestructura'
  | 'otros';

export const CATEGORY_LABELS: Record<IncidentCategory, string> = {
  baches: 'Baches y vialidad',
  fugas_agua: 'Fugas de agua y drenaje',
  luminarias: 'Luminarias y alumbrado público',
  basura: 'Basura acumulada y residuos',
  danos_infraestructura: 'Daños a infraestructura comunitaria',
  otros: 'Otros desperfectos'
};

export type IncidentStatus =
  | 'RECIBIDO'
  | 'EN_REVISION'
  | 'ASIGNADO'
  | 'EN_PROCESO'
  | 'RESUELTO'
  | 'NO_PROCEDENTE';

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  RECIBIDO: 'Recibido',
  EN_REVISION: 'En revisión',
  ASIGNADO: 'Asignado',
  EN_PROCESO: 'En proceso',
  RESUELTO: 'Resuelto',
  NO_PROCEDENTE: 'No procedente'
};

/** Transiciones válidas de estado (para validación en front y back) */
export const ALLOWED_TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  RECIBIDO: ['EN_REVISION', 'NO_PROCEDENTE'],
  EN_REVISION: ['ASIGNADO', 'NO_PROCEDENTE'],
  ASIGNADO: ['EN_PROCESO', 'NO_PROCEDENTE'],
  EN_PROCESO: ['RESUELTO', 'NO_PROCEDENTE'],
  RESUELTO: [],
  NO_PROCEDENTE: []
};

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  approximate?: boolean;
}

export interface DuplicateCandidate {
  candidateId: string;
  candidateTitle: string;
  candidateCategory: IncidentCategory;
  score: number; // 0 - 100
  reasons: string[];
  distanceMeters?: number;
  daysDifference?: number;
}

/** Comentario en un incidente */
export interface IncidentComment {
  commentId: string;
  incidentId: string;
  /** Nombre mostrado: nombre real, apodo, o "Anónimo" */
  authorName: string;
  /** Sub del autor si está registrado; null para invitados/anónimos */
  authorId: string | null;
  content: string;
  createdAt: string;
  isAdmin?: boolean;
}

export interface IncidentEvent {
  eventId: string;
  incidentId: string;
  timestamp: string;
  actorId: string;
  actorRole: UserRole | 'GUEST';
  eventType: 'CREATED' | 'STATUS_CHANGED' | 'CONFIRMED' | 'DUPLICATE_LINKED' | 'ASSIGNED';
  fromStatus?: IncidentStatus;
  toStatus?: IncidentStatus;
  publicNote?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  status: IncidentStatus;
  /** ID del autor; null si fue creado anónimamente */
  createdBy: string | null;
  /** Nombre visible del autor; "Anónimo" si eligió no compartirlo */
  creatorDisplayName: string;
  createdAt: string;
  updatedAt: string;
  areaId: string;
  coordinates?: LocationCoordinates;
  geohash?: string;
  photoKeys: string[];
  photoUrls?: string[];
  assignedTo?: string;
  duplicateOf?: string;
  duplicateCandidates?: DuplicateCandidate[];
  confirmationCount: number;
  commentCount: number;
  comments?: IncidentComment[];
  idempotencyKey?: string;
  workflowExecutionArn?: string;
  isProcessing?: boolean;
}

export interface IncidentDraft {
  localId: string;
  title: string;
  description: string;
  category: IncidentCategory;
  areaId: string;
  coordinates?: LocationCoordinates;
  photoBlob?: Blob;
  photoName?: string;
  photoType?: string;
  createdAt: number;
  syncStatus: 'DRAFT' | 'PENDING' | 'SYNCED' | 'ERROR';
  errorMessage?: string;
  idempotencyKey: string;
  /** Nombre que el autor eligió mostrar (puede ser "Anónimo") */
  authorName: string;
}
