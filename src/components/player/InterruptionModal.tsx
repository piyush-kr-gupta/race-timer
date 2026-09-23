import React from 'react';
import { ActiveRunRuntimeState } from '../../types/race';
import { formatTime } from '../../utils/duration';
import { Play, RotateCcw, Trash2, AlertCircle } from 'lucide-react';

interface InterruptionModalProps {
  state: ActiveRunRuntimeState;
  onResume: (state: ActiveRunRuntimeState) => void;
  onRestart: (state: ActiveRunRuntimeState) => void;
  onDiscard: () => void;
}

export const InterruptionModal: React.FC<InterruptionModalProps> = ({
  state,
  onResume,
  onRestart,
  onDiscard,
}) => {
  const now = Date.now();
  const currentPaused = state.racePausedAt !== null ? now - state.racePausedAt : 0;
  const totalPaused = state.raceAccumulatedPausedMs + currentPaused;
  const elapsedSeconds = Math.max(0, Math.floor((now - state.raceStartedAt - totalPaused) / 1000));
  const currentTask = state.templateSnapshot.tasks[state.currentTaskIndex];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interruption-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 id="interruption-title" className="text-lg font-bold text-slate-100">
              Resume Active Race?
            </h3>
            <p className="text-xs text-slate-400">
              Your race was running when the app was closed.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Race:</span>
            <span className="font-semibold text-slate-200">{state.templateSnapshot.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Current Task:</span>
            <span className="font-medium text-orange-400">{currentTask?.name || 'Task'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Elapsed Time:</span>
            <span className="font-mono font-bold text-slate-100">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={() => onResume(state)}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition cursor-pointer min-h-[44px]"
          >
            <Play className="w-4 h-4 fill-white" />
            Resume Race
          </button>
          <button
            onClick={() => onRestart(state)}
            className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-4 h-4" />
            Restart
          </button>
          <button
            onClick={onDiscard}
            className="flex items-center justify-center gap-2 py-3 px-3 bg-slate-800/60 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 rounded-xl text-sm transition cursor-pointer min-h-[44px]"
            title="Discard Run"
          >
            <Trash2 className="w-4 h-4" />
            <span className="sm:hidden">Discard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
