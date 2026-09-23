import React from 'react';
import { TaskRun } from '../../types/race';
import { formatTime } from '../../utils/duration';
import { CheckCircle2, SkipForward, AlertCircle, Circle } from 'lucide-react';

interface TaskTimelineProps {
  taskRuns: TaskRun[];
  currentIndex: number;
  currentTaskElapsed: number;
  currentTaskRemaining: number;
  currentTaskOvertime: number;
}

export const TaskTimeline: React.FC<TaskTimelineProps> = ({
  taskRuns,
  currentIndex,
  currentTaskElapsed,
  currentTaskRemaining,
  currentTaskOvertime,
}) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        Race Sequence Timeline
      </h3>

      <div className="space-y-2.5">
        {taskRuns.map((run, idx) => {
          const isCurrent = idx === currentIndex;
          const isCompleted = run.status === 'completed';
          const isSkipped = run.status === 'skipped';
          const isExpired = run.status === 'expired';
          const isPending = run.status === 'pending';

          const allocatedStr = formatTime(run.allocatedSeconds);
          const actualStr = isCurrent ? formatTime(currentTaskElapsed) : formatTime(run.actualSeconds);
          const timeDiff = run.actualSeconds - run.allocatedSeconds;

          return (
            <div
              key={run.taskId}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrent
                  ? 'bg-slate-900 border-orange-500/80 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : isCompleted
                  ? 'bg-slate-900/50 border-slate-800 text-slate-300'
                  : isSkipped
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : isExpired
                  ? 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Left: Status Icon & Task Name */}
              <div className="flex items-start sm:items-center gap-3">
                <div className="mt-0.5 sm:mt-0">
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isCurrent && (
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                    </span>
                  )}
                  {isSkipped && <SkipForward className="w-5 h-5 text-slate-500 shrink-0" />}
                  {isExpired && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
                  {isPending && <Circle className="w-5 h-5 text-slate-600 shrink-0" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                    <h4
                      className={`text-sm font-bold ${
                        isCurrent ? 'text-orange-400' : isCompleted ? 'text-slate-100' : 'text-slate-300'
                      }`}
                    >
                      {run.taskSnapshot.name}
                    </h4>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Current
                      </span>
                    )}
                  </div>

                  {run.taskSnapshot.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {run.taskSnapshot.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Allocated vs Actual & Remaining Details */}
              <div className="flex items-center gap-4 text-xs font-mono tabular-nums pl-8 sm:pl-0">
                {isCurrent && (
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block font-sans">Remaining / Allocated</span>
                    <span className="font-bold text-slate-100">
                      {currentTaskOvertime > 0
                        ? `+${formatTime(currentTaskOvertime)} overtime`
                        : `${formatTime(currentTaskRemaining)} left`}{' '}
                      <span className="text-slate-500">({allocatedStr})</span>
                    </span>
                  </div>
                )}

                {isCompleted && (
                  <div className="text-right">
                    <span className="text-slate-400 text-[11px] block font-sans">
                      {timeDiff > 0 ? (
                        <span className="text-rose-400">+{formatTime(timeDiff)} overtime</span>
                      ) : timeDiff < 0 ? (
                        <span className="text-emerald-400">-{formatTime(Math.abs(timeDiff))} saved</span>
                      ) : (
                        'on time'
                      )}
                    </span>
                    <span className="font-semibold text-slate-200">
                      {actualStr} <span className="text-slate-500 font-normal">/ {allocatedStr}</span>
                    </span>
                  </div>
                )}

                {isExpired && (
                  <div className="text-right">
                    <span className="text-rose-400 text-[11px] block font-sans">Time Expired</span>
                    <span className="text-slate-400 font-medium">{allocatedStr}</span>
                  </div>
                )}

                {isSkipped && (
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block font-sans">Skipped</span>
                    <span className="text-slate-600 font-medium">--</span>
                  </div>
                )}

                {isPending && (
                  <div className="text-right text-slate-500">
                    <span className="text-[11px] block font-sans">Allocated</span>
                    <span>{allocatedStr}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
