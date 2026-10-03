import JSZip from 'jszip';
import { BackupExportData, RaceTemplate, RaceRun } from '../../types/race';
import { arrayToCsv } from './csvHelper';

/**
 * Initiates an immediate client-side download of a file without any external server.
 */
function downloadFile(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * Formats race templates into CSV rows preserving categories, tags, tasks, and settings.
 */
export function templatesToCsv(templates: RaceTemplate[]): string {
  const rows: string[][] = [
    [
      'Race ID',
      'Race Name',
      'Category',
      'Tags',
      'Description',
      'Total Tasks',
      'Total Duration (s)',
      'Created At',
      'Updated At',
      'Tasks JSON',
    ],
  ];

  for (const t of templates) {
    const totalSecs = t.tasks.reduce((sum, task) => sum + task.durationSeconds, 0);
    rows.push([
      t.id,
      t.name,
      t.category || '',
      (t.tags || []).join('; '),
      t.description || '',
      String(t.tasks.length),
      String(totalSecs),
      t.createdAt,
      t.updatedAt,
      JSON.stringify(t.tasks),
    ]);
  }

  return arrayToCsv(rows);
}

/**
 * Formats race runs into CSV rows preserving timings, tasks, and status.
 */
export function runsToCsv(runs: RaceRun[]): string {
  const rows: string[][] = [
    [
      'Run ID',
      'Template ID',
      'Template Name',
      'Category',
      'Status',
      'Started At',
      'Completed At',
      'Allocated Duration (s)',
      'Actual Duration (s)',
      'Overtime (s)',
      'Paused Duration (s)',
      'Tasks Completed',
      'Tasks Total',
      'Task Runs JSON',
      'Session Tasks JSON',
    ],
  ];

  for (const r of runs) {
    const completedTasks = r.taskRuns.filter((t) => t.status === 'completed' || t.status === 'expired').length;
    rows.push([
      r.id,
      r.templateId,
      r.templateSnapshot?.name || 'Unnamed Race',
      r.templateSnapshot?.category || '',
      r.status,
      r.startedAt,
      r.completedAt || '',
      String(r.totalAllocatedSeconds),
      String(r.totalActualSeconds),
      String(r.totalOvertimeSeconds),
      String(r.totalPausedSeconds),
      String(completedTasks),
      String(r.taskRuns.length),
      JSON.stringify(r.taskRuns),
      JSON.stringify(r.sessionTasks || []),
    ]);
  }

  return arrayToCsv(rows);
}

export class ExportService {
  /**
   * Bulk Export as JSON
   */
  exportJson(data: BackupExportData, filenamePrefix: string = 'race_timer_backup') {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}_${dateStr}.json`;
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, filename, 'application/json');
  }

  /**
   * Export Race Templates as CSV
   */
  exportTemplatesCsv(templates: RaceTemplate[], filenamePrefix: string = 'race_templates') {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}_${dateStr}.csv`;
    const csvContent = templatesToCsv(templates);
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Export Race History / Runs as CSV
   */
  exportRunsCsv(runs: RaceRun[], filenamePrefix: string = 'race_history') {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${filenamePrefix}_${dateStr}.csv`;
    const csvContent = runsToCsv(runs);
    downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Bulk Export as ZIP Archive containing JSON, CSVs, metadata, and instructions
   */
  async exportZip(data: BackupExportData, filenamePrefix: string = 'race_timer_full_backup') {
    const zip = new JSZip();
    const dateStr = new Date().toISOString().slice(0, 10);

    // 1. Complete JSON backup
    zip.file('backup.json', JSON.stringify(data, null, 2));

    // 2. CSV files
    zip.file('race_templates.csv', templatesToCsv(data.raceTemplates));
    zip.file('race_history.csv', runsToCsv(data.raceRuns));

    // 3. Metadata summary
    const metadata = {
      app: 'Race Timer PWA',
      version: data.appVersion || '1.0.0',
      schemaVersion: data.schemaVersion || 1,
      exportedAt: data.exportedAt,
      stats: {
        templatesCount: data.raceTemplates.length,
        runsCount: data.raceRuns.length,
      },
      note: 'All data is stored purely locally on your device. Keep this archive safe as a backup.',
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    // 4. Human-readable README
    const readme = `RACE TIMER - LOCAL BACKUP ARCHIVE
====================================
Export Date: ${data.exportedAt}
Templates: ${data.raceTemplates.length}
Historical Runs: ${data.raceRuns.length}

Contents:
- backup.json: Full structured dataset suitable for 1-click restore in Race Timer.
- race_templates.csv: Spreadsheet view of all races, categories, and tasks.
- race_history.csv: Spreadsheet log of completed runs, timings, and overtime.
- metadata.json: Archive metadata and schema version.

To restore this backup:
Open Race Timer -> Settings -> Data Management -> Bulk Import from ZIP / JSON.
`;
    zip.file('README.txt', readme);

    const blob = await zip.generateAsync({ type: 'blob' });
    const filename = `${filenamePrefix}_${dateStr}.zip`;
    downloadFile(blob, filename, 'application/zip');
  }
}

export const exportService = new ExportService();
