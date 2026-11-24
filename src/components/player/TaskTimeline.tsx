import React from 'react';
import { TaskRun } from '../../types/race';
import { formatTime } from '../../utils/duration';
import { CheckCircle2, SkipForward, Circle, Trophy, Sparkles } from 'lucide-react';

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
          const isCompleted = run.status === 'completed' || run.status === 'expired';
          const isSkipped = run.status === 'skipped';
          const isPending = run.status === 'pending';
          const isBuffer = Boolean(run.isEarnedBuffer);

          const allocatedStr = formatTime(run.allocatedSeconds);
          const actualStr = isCurrent ? formatTime(currentTaskElapsed) : formatTime(run.actualSeconds);
          const timeDiff = run.actualSeconds - run.allocatedSeconds;

          return (
            <div
              key={run.taskId}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrent
                  ? isBuffer
                    ? 'bg-slate-900 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/50'
                    : 'bg-slate-900 border-orange-500/80 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500/50'
                  : isCompleted
                  ? 'bg-slate-900/50 border-slate-800 text-slate-300'
                  : isSkipped
                  ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                  : isBuffer && run.allocatedSeconds > 0
                  ? 'bg-slate-900/40 border-amber-500/30 text-amber-200/90'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400'
              }`}
            >
              {/* Left: Status Icon & Task Name */}
              <div className="flex items-start sm:items-center gap-3">
                <div className="mt-0.5 sm:mt-0">
                  {isCompleted && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                  {isCurrent && (
                    isBuffer ? (
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <Trophy className="w-5 h-5 text-amber-400 animate-bounce" />
                      </span>
                    ) : (
                      <span className="relative flex h-5 w-5 items-center justify-center">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-60"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
                      </span>
                    )
                  )}
                  {isSkipped && <SkipForward className="w-5 h-5 text-slate-500 shrink-0" />}
                  {isPending && (
                    isBuffer ? (
                      <Trophy className={`w-5 h-5 shrink-0 ${run.allocatedSeconds > 0 ? 'text-amber-400' : 'text-slate-600'}`} />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                    )
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-bold text-slate-500">#{idx + 1}</span>
                    <h4
                      className={`text-sm font-bold ${
                        isCurrent
                          ? isBuffer ? 'text-amber-400' : 'text-orange-400'
                          : isCompleted
                          ? 'text-slate-100'
                          : isBuffer && run.allocatedSeconds > 0
                          ? 'text-amber-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {run.taskSnapshot.name}
                    </h4>
                    {isBuffer && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Earned Buffer
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Current
                      </span>
                    )}
                  </div>

                  {run.taskSnapshot.notes && (
                    <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                      {isBuffer && isPending
                        ? run.allocatedSeconds > 0
                          ? `+${formatTime(run.allocatedSeconds)} earned so far from beating the clock!`
                          : '00:00 (Trailing pace — finish earlier tasks ahead to unlock)'
                        : isBuffer && isSkipped
                        ? 'Not unlocked — finished race trailing by pace'
                        : run.taskSnapshot.notes}
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

                {isSkipped && (
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block font-sans">
                      {isBuffer ? 'Buffer' : 'Skipped'}
                    </span>
                    <span className="text-slate-600 font-medium">
                      {isBuffer ? 'Not Unlocked' : '--'}
                    </span>
                  </div>
                )}

                {isPending && (
                  <div className="text-right">
                    <span className="text-slate-500 text-[11px] block font-sans">
                      {isBuffer ? 'Earned So Far' : 'Allocated'}
                    </span>
                    <span className={isBuffer && run.allocatedSeconds > 0 ? 'text-amber-300 font-bold' : 'text-slate-400'}>
                      {isBuffer
                        ? run.allocatedSeconds > 0
                          ? `+${formatTime(run.allocatedSeconds)}`
                          : '00:00'
                        : allocatedStr}
                    </span>
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
