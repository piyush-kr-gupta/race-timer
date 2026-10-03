import React, { useState } from 'react';
import { RaceRun, RaceTemplate } from '../../types/race';
import { formatTime } from '../../utils/duration';
import {
  History,
  Trash2,
  RotateCcw,
  CheckCircle2,
  Clock,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  CheckSquare,
} from 'lucide-react';
import { ConfirmDialog } from '../common/ConfirmDialog';

interface RaceHistoryViewProps {
  runs: RaceRun[];
  onSelectRun: (run: RaceRun) => void;
  onRunAgain: (template: RaceTemplate) => void;
  onDeleteRun: (id: string) => void;
  onClearAllRuns: () => void;
}

export const RaceHistoryView: React.FC<RaceHistoryViewProps> = ({
  runs,
  onSelectRun,
  onRunAgain,
  onDeleteRun,
  onClearAllRuns,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [deleteRunTarget, setDeleteRunTarget] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-100 flex items-center gap-2.5">
            <History className="w-6 h-6 text-orange-400" />
            <span>Race Execution History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical log of all timed race attempts and performance statistics.
          </p>
        </div>

        {runs.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-xl transition cursor-pointer min-h-[40px]"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* Runs List */}
      {runs.length > 0 ? (
        <div className="space-y-3">
          {runs.map((run) => {
            const timeDiff = run.totalActualSeconds - run.totalAllocatedSeconds;
            const isAhead = timeDiff <= 0;
            const completedCount = run.taskRuns.filter((t) => t.status === 'completed').length;

            return (
              <div
                key={run.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-md hover:shadow-lg"
              >
                {/* Left Info */}
                <div
                  onClick={() => onSelectRun(run)}
                  className="flex-1 cursor-pointer min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {run.templateSnapshot?.category || 'General'}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(run.startedAt).toLocaleDateString()} at{' '}
                      {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-100 hover:text-orange-400 transition truncate">
                    {run.templateSnapshot?.name || 'Unnamed Race'}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-400 font-medium">
                    <span className="flex items-center gap-1 text-slate-200">
                      <Clock className="w-3.5 h-3.5 text-orange-400" />
                      {formatTime(run.totalActualSeconds)} actual
                    </span>
                    <span>•</span>
                    <span>{formatTime(run.totalAllocatedSeconds)} allocated</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      {completedCount} / {run.taskRuns.length} tasks
                    </span>
                    {run.sessionTasks && run.sessionTasks.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-300">
                          <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />
                          {run.sessionTasks.filter((t) => t.completed).length}/{run.sessionTasks.length} checklist
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Variance & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
                  <div className="text-right">
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-1 ${
                        isAhead ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isAhead ? (
                        <>
                          <TrendingDown className="w-3.5 h-3.5" />
                          -{formatTime(Math.abs(timeDiff))}
                        </>
                      ) : (
                        <>
                          <TrendingUp className="w-3.5 h-3.5" />
                          +{formatTime(timeDiff)}
                        </>
                      )}
                    </span>
                    <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                      {isAhead ? 'Ahead of Clock' : 'Overtime'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onRunAgain(run.templateSnapshot)}
                      className="p-2 text-slate-400 hover:text-orange-400 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Run again"
                      aria-label="Run again"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => onSelectRun(run)}
                      className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="View full results"
                      aria-label="View results"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() =>
                        setDeleteRunTarget({
                          id: run.id,
                          name: run.templateSnapshot?.name || 'Race',
                        })
                      }
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Delete record"
                      aria-label="Delete run"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No race runs yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Start a race from the dashboard or Quick Start. Once completed, your detailed timing history will appear here.
          </p>
        </div>
      )}

      {/* Confirm Clear All */}
      <ConfirmDialog
        isOpen={confirmClear}
        title="Clear All Race History?"
        message="This will permanently delete all recorded run records and statistics. Your race templates will not be affected."
        isDestructive
        confirmText="Clear All"
        onConfirm={() => {
          onClearAllRuns();
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />

      {/* Confirm Delete Single */}
      <ConfirmDialog
        isOpen={Boolean(deleteRunTarget)}
        title="Delete Run Record?"
        message={`Are you sure you want to delete this historical record for "${deleteRunTarget?.name}"?`}
        isDestructive
        confirmText="Delete"
        onConfirm={() => {
          if (deleteRunTarget) {
            onDeleteRun(deleteRunTarget.id);
            setDeleteRunTarget(null);
          }
        }}
        onCancel={() => setDeleteRunTarget(null)}
      />
    </div>
  );
};
