import JSZip from 'jszip';
import {
  BackupExportData,
  ImportValidationResult,
  RaceTemplate,
  RaceRun,
  Task,
  ImportMode,
} from '../../types/race';
import { parseCsv } from './csvHelper';
import { storage } from '../storage/indexedDb';
import { DEFAULT_SETTINGS } from '../storage/seedData';

export class ImportService {
  /**
   * Validates a parsed JSON backup object
   */
  validateBackupData(data: unknown): ImportValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!data || typeof data !== 'object') {
      return {
        isValid: false,
        errors: ['Invalid backup file: file content is not an object.'],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    }

    const obj = data as Partial<BackupExportData>;

    if (obj.schemaVersion && typeof obj.schemaVersion !== 'number') {
      warnings.push('Unrecognized schema version. Proceeding with best-effort parsing.');
    }

    const validTemplates: RaceTemplate[] = [];
    if (Array.isArray(obj.raceTemplates)) {
      for (let i = 0; i < obj.raceTemplates.length; i++) {
        const item = obj.raceTemplates[i];
        if (item && typeof item === 'object' && item.name && typeof item.name === 'string') {
          const tasks: Task[] = Array.isArray(item.tasks)
            ? item.tasks
                .filter((t) => t && typeof t === 'object' && typeof t.name === 'string')
                .map((t, idx) => ({
                  id: t.id || `task-${Date.now()}-${idx}`,
                  name: String(t.name),
                  durationSeconds: Math.max(0, Number(t.durationSeconds) || 300),
                  notes: t.notes ? String(t.notes) : undefined,
                  order: typeof t.order === 'number' ? t.order : idx,
                  enabled: t.enabled !== false,
                  color: t.color ? String(t.color) : undefined,
                  icon: t.icon ? String(t.icon) : undefined,
                }))
            : [];

          validTemplates.push({
            id: item.id || `race-${Date.now()}-${i}`,
            name: String(item.name),
            description: item.description ? String(item.description) : '',
            category: item.category ? String(item.category) : 'General',
            tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
            tasks,
            createdAt: item.createdAt || new Date().toISOString(),
            updatedAt: item.updatedAt || new Date().toISOString(),
            isArchived: Boolean(item.isArchived),
            isSample: false, // Imported user templates are not sample
          });
        } else {
          warnings.push(`Skipped invalid template record at index ${i}.`);
        }
      }
    } else {
      warnings.push('No "raceTemplates" array found in backup.');
    }

    const validRuns: RaceRun[] = [];
    if (Array.isArray(obj.raceRuns)) {
      for (let i = 0; i < obj.raceRuns.length; i++) {
        const r = obj.raceRuns[i];
        if (r && typeof r === 'object' && r.templateId) {
          validRuns.push({
            id: r.id || `run-${Date.now()}-${i}`,
            templateId: String(r.templateId),
            templateSnapshot: r.templateSnapshot || {
              id: String(r.templateId),
              name: 'Imported Race',
              category: 'General',
              tags: [],
              tasks: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            startedAt: r.startedAt || new Date().toISOString(),
            completedAt: r.completedAt,
            status: r.status || 'completed',
            totalAllocatedSeconds: Math.max(0, Number(r.totalAllocatedSeconds) || 0),
            totalActualSeconds: Math.max(0, Number(r.totalActualSeconds) || 0),
            totalOvertimeSeconds: Math.max(0, Number(r.totalOvertimeSeconds) || 0),
            totalPausedSeconds: Math.max(0, Number(r.totalPausedSeconds) || 0),
            taskRuns: Array.isArray(r.taskRuns) ? r.taskRuns : [],
            sessionTasks: Array.isArray(r.sessionTasks) ? r.sessionTasks : undefined,
          });
        }
      }
    }

    const hasSettings = Boolean(obj.settings && typeof obj.settings === 'object');

    if (validTemplates.length === 0 && validRuns.length === 0) {
      errors.push('No valid race templates or runs found in backup file.');
    }

    const parsedData: BackupExportData = {
      schemaVersion: 1,
      exportedAt: obj.exportedAt || new Date().toISOString(),
      appVersion: obj.appVersion || '1.0.0',
      raceTemplates: validTemplates,
      raceRuns: validRuns,
      settings: hasSettings ? { ...DEFAULT_SETTINGS, ...obj.settings } : DEFAULT_SETTINGS,
    };

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      templatesCount: validTemplates.length,
      runsCount: validRuns.length,
      hasSettings,
      parsedData,
    };
  }

  /**
   * Reads and parses a JSON file from an HTML Input
   */
  async parseJsonFile(file: File): Promise<ImportValidationResult> {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      return this.validateBackupData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Invalid JSON file';
      return {
        isValid: false,
        errors: [`JSON parse error: ${msg}`],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    }
  }

  /**
   * Reads and parses a ZIP backup archive
   */
  async parseZipFile(file: File): Promise<ImportValidationResult> {
    try {
      const zip = await JSZip.loadAsync(file);

      // Look for backup.json in zip
      const jsonFile = zip.file('backup.json');
      if (jsonFile) {
        const text = await jsonFile.async('text');
        const json = JSON.parse(text);
        return this.validateBackupData(json);
      }

      // If backup.json is missing, try reading race_templates.csv from the zip
      const csvFile = zip.file('race_templates.csv');
      if (csvFile) {
        const csvText = await csvFile.async('text');
        return this.parseTemplatesCsv(csvText);
      }

      return {
        isValid: false,
        errors: ['ZIP archive does not contain "backup.json" or "race_templates.csv".'],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error reading ZIP archive';
      return {
        isValid: false,
        errors: [`ZIP extraction failed: ${msg}`],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    }
  }

  /**
   * Parses CSV string into Race Templates
   */
  parseTemplatesCsv(csvText: string): ImportValidationResult {
    const rows = parseCsv(csvText);
    if (rows.length < 2) {
      return {
        isValid: false,
        errors: ['CSV file is empty or missing headers.'],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase());
    const nameIdx = headers.findIndex((h) => h.includes('name'));
    const catIdx = headers.findIndex((h) => h.includes('category'));
    const descIdx = headers.findIndex((h) => h.includes('description'));
    const tasksIdx = headers.findIndex((h) => h.includes('tasks'));

    if (nameIdx === -1) {
      return {
        isValid: false,
        errors: ['CSV file must have a "Race Name" column.'],
        warnings: [],
        templatesCount: 0,
        runsCount: 0,
        hasSettings: false,
      };
    }

    const templates: RaceTemplate[] = [];
    const warnings: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const name = row[nameIdx]?.trim();
      if (!name) continue;

      let tasks: Task[] = [];
      if (tasksIdx !== -1 && row[tasksIdx]) {
        try {
          const parsedTasks = JSON.parse(row[tasksIdx]);
          if (Array.isArray(parsedTasks)) {
            tasks = parsedTasks;
          }
        } catch {
          warnings.push(`Row ${i} ("${name}"): tasks column could not be parsed as JSON.`);
        }
      }

      // If no tasks found from JSON, create a default 5m task
      if (tasks.length === 0) {
        tasks.push({
          id: `task-${Date.now()}-0`,
          name: 'Main Task',
          durationSeconds: 300,
          order: 0,
          enabled: true,
        });
      }

      templates.push({
        id: `race-${Date.now()}-${i}`,
        name,
        category: catIdx !== -1 && row[catIdx] ? row[catIdx].trim() : 'General',
        tags: [],
        description: descIdx !== -1 && row[descIdx] ? row[descIdx].trim() : '',
        tasks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isSample: false,
      });
    }

    const parsedData: BackupExportData = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      raceTemplates: templates,
      raceRuns: [],
      settings: DEFAULT_SETTINGS,
    };

    return {
      isValid: templates.length > 0,
      errors: templates.length === 0 ? ['No valid races found in CSV file.'] : [],
      warnings,
      templatesCount: templates.length,
      runsCount: 0,
      hasSettings: false,
      parsedData,
    };
  }

  /**
   * Applies the imported backup data with user's selected mode (merge or replace)
   */
  async executeImport(data: BackupExportData, mode: ImportMode): Promise<{
    templatesImported: number;
    runsImported: number;
  }> {
    return storage.importCompleteBackup(data, mode);
  }
}

export const importService = new ImportService();
