import { describe, it, expect } from 'vitest';
import { importService } from './importService';
import { templatesToCsv, runsToCsv } from './exportService';
import { SEED_TEMPLATES, SEED_RUNS } from '../storage/seedData';
import { BackupExportData } from '../../types/race';

describe('Import and Export Services', () => {
  it('validates a valid backup payload correctly', () => {
    const validPayload: BackupExportData = {
      schemaVersion: 1,
      exportedAt: '2026-09-24T00:00:00.000Z',
      appVersion: '1.0.0',
      raceTemplates: SEED_TEMPLATES,
      raceRuns: SEED_RUNS,
      settings: {} as any,
    };

    const result = importService.validateBackupData(validPayload);
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
    expect(result.templatesCount).toBe(SEED_TEMPLATES.length);
    expect(result.runsCount).toBe(SEED_RUNS.length);
  });

  it('safely handles malformed backup payloads without crashing', () => {
    const corruptedPayload = {
      raceTemplates: [
        null,
        { invalid: true },
        { id: 'ok-1', name: 'Valid Race', tasks: [{ name: 'Task', durationSeconds: 60 }] },
      ],
      raceRuns: 'not an array',
    };

    const result = importService.validateBackupData(corruptedPayload);
    expect(result.isValid).toBe(true);
    expect(result.templatesCount).toBe(1); // Safely extracted the valid one
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('rejects empty or non-object payloads', () => {
    expect(importService.validateBackupData(null).isValid).toBe(false);
    expect(importService.validateBackupData('string').isValid).toBe(false);
    expect(importService.validateBackupData({}).isValid).toBe(false);
  });

  it('exports templates to CSV and round-trips via parseTemplatesCsv', () => {
    const csv = templatesToCsv(SEED_TEMPLATES);
    expect(csv).toContain('Google L5');
    expect(csv).toContain('Race ID,Race Name');

    const parsed = importService.parseTemplatesCsv(csv);
    expect(parsed.isValid).toBe(true);
    expect(parsed.templatesCount).toBe(SEED_TEMPLATES.length);
    expect(parsed.parsedData?.raceTemplates[0].name).toBe(SEED_TEMPLATES[0].name);
  });

  it('exports runs to CSV properly', () => {
    const csv = runsToCsv(SEED_RUNS);
    expect(csv).toContain('run-seed-sample-1');
    expect(csv).toContain('Google L5');
  });
});
