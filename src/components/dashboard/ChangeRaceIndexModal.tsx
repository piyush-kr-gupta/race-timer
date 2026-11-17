import React, { useState, useEffect } from 'react';
import { RaceTemplate } from '../../types/race';
import { ArrowUpDown, Hash, X, Check, ArrowUp, ArrowDown } from 'lucide-react';

interface ChangeRaceIndexModalProps {
  isOpen: boolean;
  template: RaceTemplate | null;
  totalTemplates: number;
  onClose: () => void;
  onSaveIndex: (templateId: string, new1BasedIndex: number) => void;
}

export const ChangeRaceIndexModal: React.FC<ChangeRaceIndexModalProps> = ({
  isOpen,
  template,
  totalTemplates,
  onClose,
  onSaveIndex,
}) => {
  const currentIndex = template && typeof template.order === 'number' ? template.order + 1 : 1;
  const [targetIndex, setTargetIndex] = useState<number>(currentIndex);

  useEffect(() => {
    if (template && typeof template.order === 'number') {
      setTargetIndex(template.order + 1);
    }
  }, [template]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !template) return null;

  const maxIndex = Math.max(1, totalTemplates);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    const clamped = Math.max(1, Math.min(maxIndex, targetIndex));
    onSaveIndex(template.id, clamped);
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      setTargetIndex(val);
    } else if (e.target.value === '') {
      setTargetIndex(1);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-index-title"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl">
              <ArrowUpDown className="w-5 h-5" />
            </div>
            <div>
              <h3 id="change-index-title" className="text-base font-bold text-slate-100">
                Change Race Index
              </h3>
              <p className="text-xs text-slate-400">Reorder position in master sequence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Race Info */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Selected Race
            </span>
            <h4 className="text-sm font-bold text-slate-100 truncate mt-0.5">{template.name}</h4>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Current
            </span>
            <div className="text-xs font-mono font-bold text-orange-400 mt-0.5">
              #{currentIndex} of {maxIndex}
            </div>
          </div>
        </div>

        {/* Index Stepper & Shortcuts */}
        <form onSubmit={handleApply} className="space-y-4">
          <div>
            <label
              htmlFor="target-index-input"
              className="block text-xs font-semibold text-slate-300 mb-2"
            >
              Set New Index Position (1 to {maxIndex})
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTargetIndex((prev) => Math.max(1, prev - 1))}
                disabled={targetIndex <= 1}
                className="w-12 h-11 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 font-bold rounded-xl transition flex items-center justify-center cursor-pointer text-base"
                title="Decrease position"
                aria-label="Decrease position"
              >
                -
              </button>
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-orange-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="target-index-input"
                  type="number"
                  min={1}
                  max={maxIndex}
                  value={targetIndex}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-center text-base font-mono font-bold text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[44px]"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => setTargetIndex((prev) => Math.min(maxIndex, prev + 1))}
                disabled={targetIndex >= maxIndex}
                className="w-12 h-11 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-slate-200 font-bold rounded-xl transition flex items-center justify-center cursor-pointer text-base"
                title="Increase position"
                aria-label="Increase position"
              >
                +
              </button>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setTargetIndex(1)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowUp className="w-3 h-3 text-orange-400" />
              <span>Top (#1)</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetIndex((prev) => Math.max(1, prev - 1))}
              disabled={targetIndex <= 1}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Up (-1)</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetIndex((prev) => Math.min(maxIndex, prev + 1))}
              disabled={targetIndex >= maxIndex}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 disabled:opacity-30 disabled:pointer-events-none rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>Down (+1)</span>
            </button>
            <button
              type="button"
              onClick={() => setTargetIndex(maxIndex)}
              className="px-2.5 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center justify-center gap-1"
            >
              <ArrowDown className="w-3 h-3 text-orange-400" />
              <span>Bottom (#{maxIndex})</span>
            </button>
          </div>

          {/* Explanatory preview text */}
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/60 text-xs text-slate-400">
            {targetIndex === currentIndex ? (
              <span>Position remains at <strong>#{currentIndex}</strong>.</span>
            ) : targetIndex < currentIndex ? (
              <span>
                Will move up from <strong>#{currentIndex}</strong> to <strong>#{targetIndex}</strong>. Races from #{targetIndex} to #{currentIndex - 1} will shift down.
              </span>
            ) : (
              <span>
                Will move down from <strong>#{currentIndex}</strong> to <strong>#{targetIndex}</strong>. Races from #{currentIndex + 1} to #{targetIndex} will shift up.
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[40px]"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>Save Index</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
