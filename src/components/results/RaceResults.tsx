import React from 'react';
import { RaceRun, RaceTemplate } from '../../types/race';
import { formatTime, formatDurationHuman } from '../../utils/duration';
import {
  Trophy,
  RotateCcw,
  Home,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  PauseCircle,
  CheckCircle2,
  AlertCircle,
  SkipForward,
  Edit,
  CheckSquare,
  Circle,
} from 'lucide-react';

interface RaceResultsProps {
  run: RaceRun;
  onRunAgain: (template: RaceTemplate) => void;
  onEditRace: (template: RaceTemplate) => void;
  onBackHome: () => void;
}

export const RaceResults: React.FC<RaceResultsProps> = ({
  run,
  onRunAgain,
  onEditRace,
  onBackHome,
}) => {
  const completedTasks = run.taskRuns.filter((t) => t.status === 'completed');
  const skippedTasks = run.taskRuns.filter((t) => t.status === 'skipped');
  const expiredTasks = run.taskRuns.filter((t) => t.status === 'expired');

  const totalTimeDiff = run.totalActualSeconds - run.totalAllocatedSeconds;
  const isAheadOfTime = totalTimeDiff <= 0;

  // Average time
  const avgTaskSeconds =
    completedTasks.length > 0
      ? Math.round(completedTasks.reduce((s, t) => s + t.actualSeconds, 0) / completedTasks.length)
      : 0;

  // Fastest & slowest tasks
  let fastestTask = completedTasks[0];
  let slowestTask = completedTasks[0];

  for (const t of completedTasks) {
    if (t.actualSeconds < fastestTask.actualSeconds) fastestTask = t;
    if (t.actualSeconds > slowestTask.actualSeconds) slowestTask = t;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 pb-24">
      {/* Victory Header Card */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 text-white">
          <Trophy className="w-8 h-8" />
        </div>

        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-orange-400">
            Race Finished
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 mt-1">
            {run.templateSnapshot.name}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Finished on {new Date(run.completedAt || run.startedAt).toLocaleString()}
          </p>
        </div>

        {/* Primary Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Allocated Time</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-100">
              {formatTime(run.totalAllocatedSeconds)}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Actual Time</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-orange-400">
              {formatTime(run.totalActualSeconds)}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Time Variance</span>
            <span
              className={`font-mono text-xl sm:text-2xl font-black flex items-center justify-center gap-1 ${
                isAheadOfTime ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isAheadOfTime ? (
                <>
                  <TrendingDown className="w-5 h-5" />
                  -{formatTime(Math.abs(totalTimeDiff))}
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  +{formatTime(totalTimeDiff)}
                </>
              )}
            </span>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Tasks Completed</span>
            <span className="font-mono text-xl sm:text-2xl font-black text-slate-100">
              {completedTasks.length} / {run.taskRuns.length}
            </span>
            {(skippedTasks.length > 0 || expiredTasks.length > 0) && (
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {skippedTasks.length > 0 && `${skippedTasks.length} skipped `}
                {expiredTasks.length > 0 && `${expiredTasks.length} expired`}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          <button
            onClick={() => onRunAgain(run.templateSnapshot)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition cursor-pointer text-sm min-h-[48px]"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Run Again</span>
          </button>
          <button
            onClick={() => onEditRace(run.templateSnapshot)}
            className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-2xl transition cursor-pointer text-sm min-h-[48px]"
          >
            <Edit className="w-4 h-4" />
            <span>Edit Template</span>
          </button>
          <button
            onClick={onBackHome}
            className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold rounded-2xl transition cursor-pointer text-sm min-h-[48px]"
          >
            <Home className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      {/* Secondary Performance Analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Fastest Task</span>
            <span className="font-semibold text-sm text-slate-100 line-clamp-1">
              {fastestTask?.taskSnapshot.name || 'None'}
            </span>
            <span className="text-xs font-mono text-cyan-400">
              {fastestTask ? formatDurationHuman(fastestTask.actualSeconds) : '--'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Slowest Task</span>
            <span className="font-semibold text-sm text-slate-100 line-clamp-1">
              {slowestTask?.taskSnapshot.name || 'None'}
            </span>
            <span className="text-xs font-mono text-amber-400">
              {slowestTask ? formatDurationHuman(slowestTask.actualSeconds) : '--'}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-3.5">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase font-semibold block">Total Pause Time</span>
            <span className="font-mono text-base font-bold text-slate-100">
              {formatDurationHuman(run.totalPausedSeconds)}
            </span>
            <span className="text-xs text-slate-400 block">
              Avg task: {formatDurationHuman(avgTaskSeconds)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Per-Task Performance Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
          Task Timing Breakdown
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-slate-300">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-3 px-3">#</th>
                <th className="py-3 px-3">Task Name</th>
                <th className="py-3 px-3">Allocated</th>
                <th className="py-3 px-3">Actual</th>
                <th className="py-3 px-3">Difference</th>
                <th className="py-3 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
              {run.taskRuns.map((tr, index) => {
                const diff = tr.actualSeconds - tr.allocatedSeconds;
                const isOver = diff > 0;
                const isSaved = diff < 0;

                return (
                  <tr key={tr.taskId} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 text-slate-500 font-bold">{index + 1}</td>
                    <td className="py-3 px-3 font-sans font-semibold text-slate-100 max-w-[200px] truncate">
                      {tr.taskSnapshot.name}
                    </td>
                    <td className="py-3 px-3 text-slate-400">{formatTime(tr.allocatedSeconds)}</td>
                    <td className="py-3 px-3 text-slate-200 font-bold">{formatTime(tr.actualSeconds)}</td>
                    <td className="py-3 px-3">
                      {tr.status === 'completed' ? (
                        isSaved ? (
                          <span className="text-emerald-400 font-bold">-{formatTime(Math.abs(diff))} saved</span>
                        ) : isOver ? (
                          <span className="text-rose-400 font-bold">+{formatTime(diff)} overtime</span>
                        ) : (
                          <span className="text-slate-400">exact</span>
                        )
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-sans">
                      {tr.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Completed
                        </span>
                      )}
                      {tr.status === 'expired' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800 px-2 py-0.5 rounded-full">
                          <AlertCircle className="w-3 h-3" /> Expired
                        </span>
                      )}
                      {tr.status === 'skipped' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                          <SkipForward className="w-3 h-3" /> Skipped
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Task Manager Checklist (if tasks were logged during this session) */}
      {run.sessionTasks && run.sessionTasks.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                  Task Manager Checklist
                </h3>
                <p className="text-xs text-slate-400">
                  {run.sessionTasks.filter((t) => t.completed).length} of {run.sessionTasks.length} tasks completed during this session
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
              {Math.round(
                (run.sessionTasks.filter((t) => t.completed).length / run.sessionTasks.length) * 100
              )}
              % completed
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 rounded-xl bg-slate-950/50 border border-slate-800/80 overflow-hidden">
            {run.sessionTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3 gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {task.completed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-slate-500 flex-shrink-0" />
                  )}
                  <span
                    className={`text-sm ${
                      task.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-200 font-medium'
                    } truncate`}
                  >
                    {task.title}
                  </span>
                </div>
                {task.completed && task.completedAt && (
                  <span className="text-[11px] text-slate-500 font-mono flex-shrink-0">
                    Completed at{' '}
                    {new Date(task.completedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
