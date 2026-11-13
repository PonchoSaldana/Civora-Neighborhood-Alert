import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { IncidentDraft } from '@shared/types.js';

interface CivoraDB extends DBSchema {
  drafts: {
    key: string;
    value: IncidentDraft;
    indexes: { 'by-status': string; 'by-created': number };
  };
}

const DB_NAME = 'civora_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<CivoraDB>> | null = null;

function getDb(): Promise<IDBPDatabase<CivoraDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CivoraDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('drafts', { keyPath: 'localId' });
        store.createIndex('by-status', 'syncStatus');
        store.createIndex('by-created', 'createdAt');
      }
    });
  }
  return dbPromise;
}

export const offlineDb = {
  async saveDraft(draft: IncidentDraft): Promise<void> {
    const db = await getDb();
    await db.put('drafts', draft);
  },

  async getDraft(localId: string): Promise<IncidentDraft | undefined> {
    const db = await getDb();
    return db.get('drafts', localId);
  },

  async getAllDrafts(): Promise<IncidentDraft[]> {
    const db = await getDb();
    return db.getAllFromIndex('drafts', 'by-created');
  },

  async getPendingSync(): Promise<IncidentDraft[]> {
    const db = await getDb();
    return db.getAllFromIndex('drafts', 'by-status', 'PENDING');
  },

  async deleteDraft(localId: string): Promise<void> {
    const db = await getDb();
    await db.delete('drafts', localId);
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.clear('drafts');
  }
};

