import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Space', desc: 'Play / Pause timer' },
    { key: 'Enter', desc: 'Complete current task and advance' },
    { key: 'S', desc: 'Skip current task' },
    { key: 'R', desc: 'Restart current task timer' },
    { key: 'F', desc: 'Toggle Distraction-free Focus Mode' },
    { key: 'Esc', desc: 'Exit Focus Mode / Close dialog' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5 text-slate-100 font-semibold">
            <Keyboard className="w-5 h-5 text-orange-400" />
            <h3 id="shortcuts-modal-title" className="text-lg">
              Keyboard Shortcuts
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2 py-2">
          {shortcuts.map((sc) => (
            <div key={sc.key} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-slate-800/50">
              <span className="text-sm text-slate-300">{sc.desc}</span>
              <kbd className="px-2.5 py-1 text-xs font-mono font-bold text-orange-400 bg-slate-800 border border-slate-700 rounded-md shadow-xs">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition cursor-pointer min-h-[44px]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
