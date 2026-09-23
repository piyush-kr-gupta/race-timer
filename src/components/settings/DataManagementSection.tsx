import React, { useRef, useState } from 'react';
import { AppSettings, ImportMode } from '../../types/race';
import { exportService } from '../../services/data/exportService';
import { importService } from '../../services/data/importService';
import { storage } from '../../services/storage/indexedDb';
import { ImportPreviewModal } from './ImportPreviewModal';
import { ConfirmDialog } from '../common/ConfirmDialog';
import {
  Download,
  Upload,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  ShieldCheck,
  Trash2,
  HardDrive,
} from 'lucide-react';

interface DataManagementSectionProps {
  settings: AppSettings;
  onRefreshData: () => void;
  onShowToast: (msg: string, undo?: () => void) => void;
}

export const DataManagementSection: React.FC<DataManagementSectionProps> = ({
  settings,
  onRefreshData,
  onShowToast,
}) => {
  const [previewData, setPreviewData] = useState<any>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const zipFileInputRef = useRef<HTMLInputElement>(null);

  // Export handlers
  const handleExportZip = async () => {
    try {
      setIsExporting(true);
      const backup = await storage.exportCompleteBackup();
      await exportService.exportZip(backup);
      onShowToast('Complete backup ZIP downloaded.');
      onRefreshData();
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportJson = async () => {
    try {
      const backup = await storage.exportCompleteBackup();
      exportService.exportJson(backup);
      onShowToast('Structured JSON backup downloaded.');
      onRefreshData();
    } catch (e: any) {
      alert(`Export failed: ${e.message}`);
    }
  };

  const handleExportTemplatesCsv = async () => {
    try {
      const templates = await storage.getAllTemplates();
      exportService.exportTemplatesCsv(templates);
      onShowToast('Race templates CSV downloaded.');
    } catch (e: any) {
      alert(`CSV Export failed: ${e.message}`);
    }
  };

  const handleExportRunsCsv = async () => {
    try {
      const runs = await storage.getAllRuns();
      exportService.exportRunsCsv(runs);
      onShowToast('Race history CSV downloaded.');
    } catch (e: any) {
      alert(`CSV Export failed: ${e.message}`);
    }
  };

  // Import file triggers
  const handleJsonSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importService.parseJsonFile(file);
    setPreviewData(result);
    e.target.value = '';
  };

  const handleCsvSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const result = importService.parseTemplatesCsv(text);
    setPreviewData(result);
    e.target.value = '';
  };

  const handleZipSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importService.parseZipFile(file);
    setPreviewData(result);
    e.target.value = '';
  };

  // Execute import
  const handleConfirmImport = async (mode: ImportMode) => {
    if (!previewData?.parsedData) return;
    try {
      const { templatesImported, runsImported } = await importService.executeImport(
        previewData.parsedData,
        mode
      );
      setPreviewData(null);
      onRefreshData();
      onShowToast(
        `Imported successfully: ${templatesImported} races, ${runsImported} historical runs.`
      );
    } catch (e: any) {
      alert(`Import failed: ${e.message}`);
    }
  };

  const handleClearAll = async () => {
    await storage.clearAllData();
    onRefreshData();
    onShowToast('All local data cleared.');
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Hidden file inputs */}
      <input
        ref={jsonFileInputRef}
        type="file"
        accept=".json"
        onChange={handleJsonSelected}
        className="hidden"
      />
      <input
        ref={csvFileInputRef}
        type="file"
        accept=".csv"
        onChange={handleCsvSelected}
        className="hidden"
      />
      <input
        ref={zipFileInputRef}
        type="file"
        accept=".zip"
        onChange={handleZipSelected}
        className="hidden"
      />

      {/* Header & Local Privacy Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-orange-400" />
            <span>Local Data Management & Portability</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            All data is stored purely on this device. No remote servers or tracking.
          </p>
        </div>

        <div className="text-right sm:text-right shrink-0">
          <span className="text-[11px] text-slate-400 block font-medium">Last Backup</span>
          <span className="text-xs font-mono font-bold text-orange-400">
            {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-800/40 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-xs text-cyan-200/90 leading-relaxed">
          Your races, task sequences, notes, and run history are saved safely in your browser’s IndexedDB. Export a ZIP or JSON backup regularly to migrate devices or protect your progress.
        </p>
      </div>

      {/* BULK EXPORT ACTIONS */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Download className="w-4 h-4 text-orange-400" />
          <span>Export & Backup</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* ZIP Bulk Export */}
          <button
            onClick={handleExportZip}
            disabled={isExporting}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left group"
          >
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 mb-2 group-hover:scale-105 transition">
              <FileArchive className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-100">Bulk Export as ZIP</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Complete archive with JSON, CSVs & metadata
            </span>
          </button>

          {/* JSON Bulk Export */}
          <button
            onClick={handleExportJson}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left group"
          >
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 mb-2 group-hover:scale-105 transition">
              <FileCode className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-100">Bulk Export as JSON</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Structured JSON for complete 1-click restore
            </span>
          </button>

          {/* Templates CSV Export */}
          <button
            onClick={handleExportTemplatesCsv}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left group"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mb-2 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-100">Export Races as CSV</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Spreadsheet view of race templates
            </span>
          </button>

          {/* Runs CSV Export */}
          <button
            onClick={handleExportRunsCsv}
            className="flex flex-col items-start p-4 rounded-2xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left group"
          >
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 mb-2 group-hover:scale-105 transition">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-100">Export History as CSV</span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              Log of completed runs and times
            </span>
          </button>
        </div>
      </div>

      {/* BULK IMPORT ACTIONS */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Upload className="w-4 h-4 text-cyan-400" />
          <span>Import & Restore</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* ZIP Import */}
          <button
            onClick={() => zipFileInputRef.current?.click()}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400">
              <FileArchive className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 block">Import from ZIP</span>
              <span className="text-[11px] text-slate-400">Restores full archive</span>
            </div>
          </button>

          {/* JSON Import */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <FileCode className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 block">Import from JSON</span>
              <span className="text-[11px] text-slate-400">Validates & previews before save</span>
            </div>
          </button>

          {/* CSV Import */}
          <button
            onClick={() => csvFileInputRef.current?.click()}
            className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/60 transition cursor-pointer text-left"
          >
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-100 block">Import from CSV</span>
              <span className="text-[11px] text-slate-400">Loads spreadsheet races</span>
            </div>
          </button>
        </div>
      </div>

      {/* DANGER ZONE: CLEAR ALL DATA */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider">
            Danger Zone
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Erase all templates, runs, and local preferences from this browser.
          </p>
        </div>

        <button
          onClick={() => setConfirmClearAll(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 border border-rose-900/60 rounded-xl text-xs font-semibold transition cursor-pointer min-h-[40px]"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear All Data</span>
        </button>
      </div>

      {/* Import Preview Modal */}
      {previewData && (
        <ImportPreviewModal
          isOpen={Boolean(previewData)}
          result={previewData}
          onConfirm={handleConfirmImport}
          onCancel={() => setPreviewData(null)}
        />
      )}

      {/* Clear All Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmClearAll}
        title="Clear All Local Application Data?"
        message="This will completely erase all your custom race templates, task lists, and historical run records from this browser. This action cannot be undone unless you have a backup."
        isDestructive
        confirmText="Erase All Data"
        onConfirm={handleClearAll}
        onCancel={() => setConfirmClearAll(false)}
      />
    </div>
  );
};
