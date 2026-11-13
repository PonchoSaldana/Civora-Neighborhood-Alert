import { Incident, IncidentStatus, IncidentCategory, IncidentComment } from '@shared/types.js';
import { findDuplicateCandidates } from '@shared/duplicates.js';
import { validateStatusTransition } from '@shared/status.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// ─── Datos sintéticos de demostración ────────────────────────────────────────
const SYNTHETIC: Incident[] = [
  {
    id: 'CIV-0482-A1',
    title: 'Bache profundo en Av. Juárez frente a la farmacia',
    description: 'Bache grande con agua estancada que ya provocó que dos autos poncharan llanta.',
    category: 'baches', status: 'RECIBIDO',
    createdBy: null, creatorDisplayName: 'Anónimo',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    areaId: 'Colonia Del Valle',
    coordinates: { latitude: 20.6736, longitude: -103.3638 },
    photoKeys: [], photoUrls: ['https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80'],
    confirmationCount: 4, commentCount: 2, isProcessing: false, duplicateCandidates: []
  },
  {
    id: 'CIV-0480-C9',
    title: 'Fuga de agua limpia en banqueta poniente',
    description: 'Brote constante de agua potable en la banqueta desde ayer en la madrugada.',
    category: 'fugas_agua', status: 'EN_REVISION',
    createdBy: 'usr-vecino-2', creatorDisplayName: 'Mariana S.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    areaId: 'Sector Reforma',
    coordinates: { latitude: 20.6780, longitude: -103.3590 },
    photoKeys: [], photoUrls: ['https://images.unsplash.com/photo-1541888946425-d0fbb186156f?w=600&auto=format&fit=crop&q=80'],
    confirmationCount: 7, commentCount: 1, isProcessing: false
  },
  {
    id: 'CIV-0475-D4',
    title: 'Luminaria apagada en parque central',
    description: 'El poste de luz número 14 permanece totalmente apagado dejando la zona oscura e insegura.',
    category: 'luminarias', status: 'ASIGNADO',
    createdBy: 'usr-vecino-3', creatorDisplayName: 'Carlos M.',
    createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    areaId: 'Parque Central',
    coordinates: { latitude: 20.6715, longitude: -103.3670 },
    photoKeys: [], confirmationCount: 12, commentCount: 3, isProcessing: false
  },
  {
    id: 'CIV-0460-F2',
    title: 'Basura acumulada en contenedor público',
    description: 'Desbordamiento de residuos que bloquea el paso peatonal en la esquina.',
    category: 'basura', status: 'RESUELTO',
    createdBy: 'usr-vecino-4', creatorDisplayName: 'Ana P.',
    createdAt: new Date(Date.now() - 3600000 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    areaId: 'Colonia Del Valle',
    coordinates: { latitude: 20.6750, longitude: -103.3610 },
    photoKeys: [], confirmationCount: 3, commentCount: 0, isProcessing: false
  }
];

const SYNTHETIC_COMMENTS: Record<string, IncidentComment[]> = {
  'CIV-0482-A1': [
    { commentId: 'c1', incidentId: 'CIV-0482-A1', authorName: 'Roberto V.', authorId: null, content: 'Confirmo, yo también ponché la llanta ahí. ¡Por favor que lo arreglen!', createdAt: new Date(Date.now() - 3600000 * 10).toISOString() },
    { commentId: 'c2', incidentId: 'CIV-0482-A1', authorName: 'Admin Civora', authorId: 'admin-1', content: 'Se notificó al área de vialidad. Se revisará en los próximos días hábiles.', createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), isAdmin: true }
  ],
  'CIV-0480-C9': [
    { commentId: 'c3', incidentId: 'CIV-0480-C9', authorName: 'Anónimo', authorId: null, content: 'El agua ya llegó a la calle, se está desperdiciando mucho.', createdAt: new Date(Date.now() - 3600000 * 24).toISOString() }
  ],
  'CIV-0475-D4': [
    { commentId: 'c4', incidentId: 'CIV-0475-D4', authorName: 'Vecino del Parque', authorId: 'usr-v5', content: 'Han pasado varias semanas y no viene nadie.', createdAt: new Date(Date.now() - 3600000 * 36).toISOString() },
    { commentId: 'c5', incidentId: 'CIV-0475-D4', authorName: 'Admin Civora', authorId: 'admin-1', content: 'Se asignó a Cuadrilla de Alumbrado #2. Programado para esta semana.', createdAt: new Date(Date.now() - 3600000 * 10).toISOString(), isAdmin: true },
    { commentId: 'c6', incidentId: 'CIV-0475-D4', authorName: 'Anónimo', authorId: null, content: 'Gracias por el seguimiento.', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() }
  ]
};

class IncidentApiService {
  private incidents: Incident[];
  private comments: Record<string, IncidentComment[]>;
  private confirmations: Set<string>;

  constructor() {
    try {
      const saved = localStorage.getItem('civora_incidents');
      this.incidents = saved ? JSON.parse(saved) : [...SYNTHETIC];
    } catch {
      this.incidents = [...SYNTHETIC];
    }
    try {
      const savedComments = localStorage.getItem('civora_comments');
      this.comments = savedComments ? JSON.parse(savedComments) : { ...SYNTHETIC_COMMENTS };
    } catch {
      this.comments = { ...SYNTHETIC_COMMENTS };
    }
    this.confirmations = new Set();
    this.save();
  }

  private save() {
    try {
      localStorage.setItem('civora_incidents', JSON.stringify(this.incidents));
      localStorage.setItem('civora_comments', JSON.stringify(this.comments));
    } catch {}
  }

  // ── Incidentes ─────────────────────────────────────────────────────────────

  async getIncidents(params?: { status?: IncidentStatus; areaId?: string; mine?: boolean; userSub?: string | null }): Promise<Incident[]> {
    let results = [...this.incidents];
    if (params?.mine) {
      let myIds: string[] = [];
      try {
        myIds = JSON.parse(localStorage.getItem('civora_my_ids') || '[]');
      } catch {}
      results = results.filter(i => (params.userSub && i.createdBy === params.userSub) || myIds.includes(i.id));
    } else if (params?.status) {
      results = results.filter(i => i.status === params.status);
    }
    if (params?.areaId) results = results.filter(i => i.areaId.toLowerCase().includes(params.areaId!.toLowerCase()));
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getIncidentById(id: string): Promise<Incident | null> {
    const inc = this.incidents.find(i => i.id === id) || null;
    if (!inc) return null;
    // Attach comments
    return { ...inc, comments: this.comments[id] || [] };
  }

  async createIncident(payload: {
    title: string; description: string; category: IncidentCategory;
    areaId: string; coordinates?: { latitude: number; longitude: number };
    photoBlob?: Blob; photoName?: string;
    authorId: string | null; authorName: string;
    idempotencyKey?: string;
  }): Promise<{ incidentId: string; isProcessing: boolean }> {
    if (payload.idempotencyKey) {
      const dup = this.incidents.find(i => i.idempotencyKey === payload.idempotencyKey);
      if (dup) return { incidentId: dup.id, isProcessing: dup.isProcessing || false };
    }

    const id = `CIV-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();
    let photoUrls: string[] = [];
    if (payload.photoBlob) photoUrls = [URL.createObjectURL(payload.photoBlob)];

    const newInc: Incident = {
      id, title: payload.title, description: payload.description,
      category: payload.category, status: 'RECIBIDO',
      createdBy: payload.authorId, creatorDisplayName: payload.authorName,
      createdAt: now, updatedAt: now, areaId: payload.areaId,
      coordinates: payload.coordinates, photoKeys: [],
      photoUrls, confirmationCount: 0, commentCount: 0,
      idempotencyKey: payload.idempotencyKey, isProcessing: true,
      duplicateCandidates: []
    };

    // Duplicate detection
    newInc.duplicateCandidates = findDuplicateCandidates(
      { id, title: payload.title, description: payload.description, category: payload.category, createdAt: now, areaId: payload.areaId, coordinates: payload.coordinates },
      this.incidents
    );

    this.incidents.unshift(newInc);
    try {
      const myIds: string[] = JSON.parse(localStorage.getItem('civora_my_ids') || '[]');
      if (!myIds.includes(id)) myIds.push(id);
      localStorage.setItem('civora_my_ids', JSON.stringify(myIds));
    } catch {}
    this.save();

    // Simulate Step Functions completing
    setTimeout(() => {
      const t = this.incidents.find(i => i.id === id);
      if (t) { t.isProcessing = false; t.updatedAt = new Date().toISOString(); this.save(); }
    }, 2000);

    return { incidentId: id, isProcessing: true };
  }

  // ── Confirmaciones ─────────────────────────────────────────────────────────

  async confirmIncident(incidentId: string, userId: string): Promise<void> {
    const key = `${incidentId}#${userId}`;
    if (this.confirmations.has(key)) throw new Error('Ya apoyaste este reporte anteriormente.');
    const inc = this.incidents.find(i => i.id === incidentId);
    if (!inc) throw new Error('Incidente no encontrado.');
    inc.confirmationCount++;
    inc.updatedAt = new Date().toISOString();
    this.confirmations.add(key);
    this.save();
  }

  // ── Comentarios ────────────────────────────────────────────────────────────

  async addComment(incidentId: string, content: string, authorName: string, authorId: string | null, isAdmin = false): Promise<IncidentComment> {
    if (!content.trim()) throw new Error('El comentario no puede estar vacío.');
    if (content.length > 500) throw new Error('El comentario no puede superar 500 caracteres.');

    const comment: IncidentComment = {
      commentId: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      incidentId, authorName, authorId, isAdmin,
      content: content.trim(),
      createdAt: new Date().toISOString()
    };

    if (!this.comments[incidentId]) this.comments[incidentId] = [];
    this.comments[incidentId].push(comment);

    const inc = this.incidents.find(i => i.id === incidentId);
    if (inc) { inc.commentCount = this.comments[incidentId].length; inc.updatedAt = new Date().toISOString(); }

    this.save();
    return comment;
  }

  async getComments(incidentId: string): Promise<IncidentComment[]> {
    return this.comments[incidentId] || [];
  }

  // ── Gestión (Admin) ────────────────────────────────────────────────────────

  async updateStatus(incidentId: string, targetStatus: IncidentStatus, note?: string): Promise<void> {
    const inc = this.incidents.find(i => i.id === incidentId);
    if (!inc) throw new Error('Incidente no encontrado.');
    const v = validateStatusTransition(inc.status, targetStatus, note);
    if (!v.allowed) throw new Error(v.reason || 'Transición no válida.');
    inc.status = targetStatus;
    inc.updatedAt = new Date().toISOString();
    this.save();
  }

  async linkDuplicate(childId: string, parentId: string): Promise<void> {
    const child = this.incidents.find(i => i.id === childId);
    const parent = this.incidents.find(i => i.id === parentId);
    if (!child || !parent) throw new Error('Uno o ambos reportes no existen.');
    child.duplicateOf = parentId;
    child.updatedAt = new Date().toISOString();
    parent.confirmationCount += child.confirmationCount;
    parent.updatedAt = new Date().toISOString();
    this.save();
  }

  resetDemo() {
    localStorage.removeItem('civora_incidents');
    localStorage.removeItem('civora_comments');
    this.incidents = [...SYNTHETIC];
    this.comments = { ...SYNTHETIC_COMMENTS };
    this.save();
  }
}

export const api = new IncidentApiService();
