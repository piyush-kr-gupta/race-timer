import React, { useState } from 'react';
import { ImportValidationResult, ImportMode } from '../../types/race';
import { AlertTriangle, CheckCircle2, FileArchive, X } from 'lucide-react';

interface ImportPreviewModalProps {
  isOpen: boolean;
  result: ImportValidationResult;
  onConfirm: (mode: ImportMode) => void;
  onCancel: () => void;
}

export const ImportPreviewModal: React.FC<ImportPreviewModalProps> = ({
  isOpen,
  result,
  onConfirm,
  onCancel,
}) => {
  const [selectedMode, setSelectedMode] = useState<ImportMode>('merge');

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 id="import-preview-title" className="text-lg font-bold text-slate-100">
                Backup Data Preview
              </h3>
              <p className="text-xs text-slate-400">Validate contents before applying changes</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Result Box */}
        {result.isValid ? (
          <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-800/60 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Valid Backup Archive</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 pt-1">
              <div>
                <span className="text-slate-400">Race Templates:</span>{' '}
                <span className="font-bold text-slate-100">{result.templatesCount}</span>
              </div>
              <div>
                <span className="text-slate-400">Historical Runs:</span>{' '}
                <span className="font-bold text-slate-100">{result.runsCount}</span>
              </div>
            </div>
            {result.warnings.length > 0 && (
              <div className="pt-2 text-[11px] text-amber-400 border-t border-emerald-900/40">
                {result.warnings.map((w, idx) => (
                  <p key={idx}>⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/60 space-y-2">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Invalid File Format</span>
            </div>
            <div className="text-xs text-rose-300 space-y-1">
              {result.errors.map((e, idx) => (
                <p key={idx}>• {e}</p>
              ))}
            </div>
          </div>
        )}

        {/* Import Mode Selection */}
        {result.isValid && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Select Import Strategy
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedMode === 'merge'
                    ? 'bg-orange-500/15 border-orange-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <input
                    type="radio"
                    name="importMode"
                    value="merge"
                    checked={selectedMode === 'merge'}
                    onChange={() => setSelectedMode('merge')}
                    className="text-orange-500 focus:ring-orange-500"
                  />
                  <span>Merge (Recommended)</span>
                </div>
                <p className="text-[11px] text-slate-400 pl-5 leading-normal">
                  Keeps all existing races and adds new templates from backup without losing data.
                </p>
              </label>

              <label
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  selectedMode === 'replace'
                    ? 'bg-rose-500/15 border-rose-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs mb-1">
                  <input
                    type="radio"
                    name="importMode"
                    value="replace"
                    checked={selectedMode === 'replace'}
                    onChange={() => setSelectedMode('replace')}
                    className="text-rose-500 focus:ring-rose-500"
                  />
                  <span className="text-rose-400">Replace Everything</span>
                </div>
                <p className="text-[11px] text-slate-400 pl-5 leading-normal">
                  Wipes current local races and replaces completely with this backup archive.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer min-h-[44px]"
          >
            Cancel
          </button>
          {result.isValid && (
            <button
              type="button"
              onClick={() => onConfirm(selectedMode)}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition cursor-pointer shadow-md min-h-[44px] ${
                selectedMode === 'replace'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-orange-500 hover:bg-orange-600 text-white'
              }`}
            >
              {selectedMode === 'replace' ? 'Replace & Restore' : 'Merge & Restore'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
