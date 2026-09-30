import {
  RaceTemplate,
  RaceRun,
  AppSettings,
  ActiveRunRuntimeState,
  BackupExportData,
  ImportMode,
} from '../../types/race';
import { SEED_TEMPLATES, SEED_RUNS, DEFAULT_SETTINGS } from './seedData';

const DB_NAME = 'RaceTimerDB';
const DB_VERSION = 1;

const STORES = {
  TEMPLATES: 'raceTemplates',
  RUNS: 'raceRuns',
  SETTINGS: 'appSettings',
  ACTIVE_STATE: 'activeRuntimeState',
} as const;

export class StorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not supported in this environment.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORES.TEMPLATES)) {
          const templateStore = db.createObjectStore(STORES.TEMPLATES, { keyPath: 'id' });
          templateStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          templateStore.createIndex('category', 'category', { unique: false });
          templateStore.createIndex('isArchived', 'isArchived', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.RUNS)) {
          const runStore = db.createObjectStore(STORES.RUNS, { keyPath: 'id' });
          runStore.createIndex('templateId', 'templateId', { unique: false });
          runStore.createIndex('startedAt', 'startedAt', { unique: false });
          runStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORES.ACTIVE_STATE)) {
          db.createObjectStore(STORES.ACTIVE_STATE, { keyPath: 'id' });
        }
      };

      request.onsuccess = async (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        try {
          await this.initSeedDataIfEmpty(db);
        } catch (e) {
          console.error('Failed to initialize seed data:', e);
        }
        resolve(db);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  private async initSeedDataIfEmpty(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TEMPLATES, STORES.SETTINGS, STORES.RUNS], 'readwrite');
      const templateStore = tx.objectStore(STORES.TEMPLATES);
      const settingsStore = tx.objectStore(STORES.SETTINGS);
      const runStore = tx.objectStore(STORES.RUNS);

      const countRequest = templateStore.count();
      countRequest.onsuccess = () => {
        if (countRequest.result === 0) {
          for (const template of SEED_TEMPLATES) {
            templateStore.put(template);
          }
          for (const run of SEED_RUNS) {
            runStore.put(run);
          }
        }
      };

      const settingsRequest = settingsStore.get('current');
      settingsRequest.onsuccess = () => {
        if (!settingsRequest.result) {
          settingsStore.put({ id: 'current', ...DEFAULT_SETTINGS });
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ===================== TEMPLATES =====================

  async getAllTemplates(): Promise<RaceTemplate[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TEMPLATES, 'readonly');
      const store = tx.objectStore(STORES.TEMPLATES);
      const request = store.getAll();
      request.onsuccess = () => {
        const templates = (request.result as RaceTemplate[]) || [];
        // Sort most recently updated first
        templates.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        resolve(templates);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getTemplateById(id: string): Promise<RaceTemplate | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TEMPLATES, 'readonly');
      const store = tx.objectStore(STORES.TEMPLATES);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTemplate(template: RaceTemplate): Promise<RaceTemplate> {
    const db = await this.getDB();
    const updated: RaceTemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORES.TEMPLATES);
      const request = store.put(updated);
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTemplate(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.TEMPLATES, 'readwrite');
      const store = tx.objectStore(STORES.TEMPLATES);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async duplicateTemplate(id: string): Promise<RaceTemplate> {
    const original = await this.getTemplateById(id);
    if (!original) throw new Error(`Race template with id "${id}" not found.`);

    const now = new Date().toISOString();
    const duplicate: RaceTemplate = {
      ...original,
      id: `race-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
      isSample: false,
      tasks: original.tasks.map((t, index) => ({
        ...t,
        id: `task-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
      })),
    };

    await this.saveTemplate(duplicate);
    return duplicate;
  }

  // ===================== RUNS / HISTORY =====================

  async getAllRuns(): Promise<RaceRun[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readonly');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.getAll();
      request.onsuccess = () => {
        const runs = (request.result as RaceRun[]) || [];
        // Sort descending by startedAt
        runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        resolve(runs);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getRunsByTemplate(templateId: string): Promise<RaceRun[]> {
    const all = await this.getAllRuns();
    return all.filter((r) => r.templateId === templateId);
  }

  async getRunById(id: string): Promise<RaceRun | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readonly');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveRun(run: RaceRun): Promise<RaceRun> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readwrite');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.put(run);
      request.onsuccess = () => resolve(run);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteRun(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readwrite');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllRuns(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.RUNS, 'readwrite');
      const store = tx.objectStore(STORES.RUNS);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===================== SETTINGS =====================

  async getSettings(): Promise<AppSettings> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get('current');
      request.onsuccess = () => {
        if (request.result) {
          const { id: _, ...settings } = request.result;
          resolve({ ...DEFAULT_SETTINGS, ...settings });
        } else {
          resolve(DEFAULT_SETTINGS);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const db = await this.getDB();
    const current = await this.getSettings();
    const updated: AppSettings = { ...current, ...settings };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.SETTINGS, 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.put({ id: 'current', ...updated });
      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  // ===================== ACTIVE RUNTIME STATE =====================

  async getAllActiveRuntimeStates(): Promise<ActiveRunRuntimeState[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ACTIVE_STATE, 'readonly');
      const store = tx.objectStore(STORES.ACTIVE_STATE);
      const request = store.getAll();
      request.onsuccess = () => {
        const items = (request.result as any[]) || [];
        const states: ActiveRunRuntimeState[] = items.map((item) => {
          const { id: _, ...state } = item;
          if (!state.runId && item.id) {
            state.runId = item.id;
          }
          return state as ActiveRunRuntimeState;
        });

        // Filter valid states
        const validStates = states.filter((s) => s && s.runId && s.templateSnapshot);

        // Sort descending by savedAt or lastTickTimestamp
        validStates.sort((a, b) => {
          const timeA = a.savedAt ? new Date(a.savedAt).getTime() : a.lastTickTimestamp || 0;
          const timeB = b.savedAt ? new Date(b.savedAt).getTime() : b.lastTickTimestamp || 0;
          return timeB - timeA;
        });

        resolve(validStates);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getActiveRuntimeState(runId?: string): Promise<ActiveRunRuntimeState | null> {
    const all = await this.getAllActiveRuntimeStates();
    if (!all.length) return null;
    if (runId) {
      return all.find((s) => s.runId === runId) || null;
    }
    return all[0] || null;
  }

  async getActiveStateByTemplateId(templateId: string): Promise<ActiveRunRuntimeState | null> {
    const all = await this.getAllActiveRuntimeStates();
    return all.find((s) => s.templateId === templateId) || null;
  }

  async saveActiveRuntimeState(state: ActiveRunRuntimeState): Promise<void> {
    const db = await this.getDB();
    const key = state.runId || 'active';
    const record = {
      id: key,
      ...state,
      savedAt: state.savedAt || new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ACTIVE_STATE, 'readwrite');
      const store = tx.objectStore(STORES.ACTIVE_STATE);
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteActiveRuntimeState(runId: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ACTIVE_STATE, 'readwrite');
      const store = tx.objectStore(STORES.ACTIVE_STATE);
      store.delete(runId);
      // Clean up legacy fallback key if matching
      store.delete('active');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearActiveRuntimeState(runId?: string): Promise<void> {
    if (runId) {
      return this.deleteActiveRuntimeState(runId);
    }
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORES.ACTIVE_STATE, 'readwrite');
      const store = tx.objectStore(STORES.ACTIVE_STATE);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ===================== SEED DATA RESET =====================

  async resetSeedData(): Promise<{ added: number; updated: number }> {
    const db = await this.getDB();
    const existing = await this.getAllTemplates();
    const existingMap = new Map(existing.map((t) => [t.id, t]));

    let added = 0;
    let updated = 0;

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TEMPLATES, STORES.RUNS], 'readwrite');
      const templateStore = tx.objectStore(STORES.TEMPLATES);
      const runStore = tx.objectStore(STORES.RUNS);

      for (const seed of SEED_TEMPLATES) {
        if (existingMap.has(seed.id)) {
          templateStore.put(seed);
          updated++;
        } else {
          templateStore.put(seed);
          added++;
        }
      }

      for (const run of SEED_RUNS) {
        runStore.put(run);
      }

      tx.oncomplete = () => resolve({ added, updated });
      tx.onerror = () => reject(tx.error);
    });
  }

  // ===================== IMPORT / EXPORT / BACKUP =====================

  async exportCompleteBackup(): Promise<BackupExportData> {
    const [templates, runs, settings, activeStates] = await Promise.all([
      this.getAllTemplates(),
      this.getAllRuns(),
      this.getSettings(),
      this.getAllActiveRuntimeStates(),
    ]);

    const backup: BackupExportData = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      raceTemplates: templates,
      raceRuns: runs,
      settings,
      activeStates,
    };

    // Update lastBackupAt timestamp in settings
    await this.saveSettings({ lastBackupAt: backup.exportedAt });

    return backup;
  }

  async importCompleteBackup(data: BackupExportData, mode: ImportMode = 'merge'): Promise<{
    templatesImported: number;
    runsImported: number;
  }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TEMPLATES, STORES.RUNS, STORES.SETTINGS, STORES.ACTIVE_STATE], 'readwrite');
      const templateStore = tx.objectStore(STORES.TEMPLATES);
      const runStore = tx.objectStore(STORES.RUNS);
      const settingsStore = tx.objectStore(STORES.SETTINGS);
      const activeStore = tx.objectStore(STORES.ACTIVE_STATE);

      if (mode === 'replace') {
        templateStore.clear();
        runStore.clear();
        activeStore.clear();
      }

      let templatesImported = 0;
      let runsImported = 0;

      if (Array.isArray(data.raceTemplates)) {
        for (const t of data.raceTemplates) {
          if (t && t.id && t.name) {
            templateStore.put(t);
            templatesImported++;
          }
        }
      }

      if (Array.isArray(data.raceRuns)) {
        for (const r of data.raceRuns) {
          if (r && r.id && r.templateId) {
            runStore.put(r);
            runsImported++;
          }
        }
      }

      if (Array.isArray(data.activeStates)) {
        for (const a of data.activeStates) {
          if (a && a.runId) {
            activeStore.put({ id: a.runId, ...a });
          }
        }
      }

      if (data.settings) {
        settingsStore.put({ id: 'current', ...DEFAULT_SETTINGS, ...data.settings });
      }

      tx.oncomplete = () => resolve({ templatesImported, runsImported });
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.TEMPLATES, STORES.RUNS, STORES.SETTINGS, STORES.ACTIVE_STATE], 'readwrite');
      tx.objectStore(STORES.TEMPLATES).clear();
      tx.objectStore(STORES.RUNS).clear();
      tx.objectStore(STORES.SETTINGS).clear();
      tx.objectStore(STORES.ACTIVE_STATE).clear();

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const storage = new StorageService();
