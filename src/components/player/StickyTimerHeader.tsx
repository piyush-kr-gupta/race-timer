import React from 'react';
import { TimerTickData } from '../../services/timer/timerEngine';
import { formatTime } from '../../utils/duration';
import {
  Play,
  Pause,
  CheckCircle2,
  SkipForward,
  RotateCcw,
  Maximize2,
  Minimize2,
  Eye,
  AlertTriangle,
  Flag,
  BookmarkCheck,
} from 'lucide-react';
import { ProgressBar } from '../common/ProgressBar';

interface StickyTimerHeaderProps {
  tickData: TimerTickData;
  raceName: string;
  isFocusMode: boolean;
  isFullscreen: boolean;
  onToggleFocusMode: () => void;
  onToggleFullscreen: () => void;
  onPlay: () => void;
  onPause: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onRestartTask: () => void;
  onFinishRace: () => void;
  onSaveAndResumeLater?: () => void;
}

export const StickyTimerHeader: React.FC<StickyTimerHeaderProps> = ({
  tickData,
  raceName,
  isFocusMode,
  isFullscreen,
  onToggleFocusMode,
  onToggleFullscreen,
  onPlay,
  onPause,
  onComplete,
  onSkip,
  onRestartTask,
  onFinishRace,
  onSaveAndResumeLater,
}) => {
  const isRunning = tickData.timerState === 'RUNNING' || tickData.timerState === 'WARNING' || tickData.timerState === 'OVERTIME';
  const isPaused = tickData.timerState === 'PAUSED';
  const isOvertime = tickData.isOvertime;
  const isWarning = tickData.isWarning;
  const isCountdownWarning = tickData.isCountdownWarning;

  const currentTask = tickData.currentTaskRun?.taskSnapshot;

  // Format task timer
  const taskTimerString = isOvertime
    ? formatTime(tickData.taskOvertimeSeconds, { showSign: true })
    : formatTime(tickData.taskRemainingSeconds);

  // Format overall race timer
  const raceTimerString = tickData.raceOvertimeSeconds > 0
    ? `+${formatTime(tickData.raceOvertimeSeconds)} race overtime`
    : `${formatTime(tickData.raceRemainingSeconds)} race remaining`;

  return (
    <div className={`sticky top-0 z-30 w-full bg-slate-950/95 backdrop-blur-md border-b shadow-2xl transition-all ${
      isCountdownWarning ? 'border-amber-500/60 shadow-[0_4px_25px_rgba(251,191,36,0.12)]' : 'border-slate-800'
    }`}>
      <div className="max-w-4xl mx-auto px-4 py-4 sm:py-5 flex flex-col items-center text-center">
        {/* Top auxiliary line: Race Name, Task Index & Action Toggles */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-slate-300 truncate">{raceName}</span>
            <span>•</span>
            <span className="text-orange-400 font-medium">
              Task {tickData.currentTaskIndex + 1} of {tickData.totalTaskCount}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onToggleFocusMode}
              className={`p-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1 text-[11px] ${
                isFocusMode
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                  : 'text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-900'
              }`}
              title="Toggle Focus Mode (F)"
              aria-label="Toggle focus mode"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </button>

            <button
              onClick={onToggleFullscreen}
              className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition cursor-pointer text-[11px] hidden sm:flex items-center gap-1"
              title="Toggle Fullscreen"
              aria-label="Toggle fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Current Task Name */}
        <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight mb-1 flex items-center gap-2">
          {currentTask?.name || 'Task'}
          {isOvertime && (
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-rose-600/30 text-rose-400 border border-rose-500/40 tracking-wider animate-pulse">
              Overtime
            </span>
          )}
          {isCountdownWarning && !isOvertime && (
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/25 text-amber-300 border border-amber-500/60 tracking-wider flex items-center gap-1.5 shadow-sm shadow-amber-500/20 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
              Final {tickData.taskRemainingSeconds}s
            </span>
          )}
          {isWarning && !isCountdownWarning && !isOvertime && (
            <span className="text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-400 border border-amber-500/40 tracking-wider">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              Ending Soon
            </span>
          )}
        </h2>

        {/* DOMINANT CURRENT TIMER (Large Typography, Readable from a distance) */}
        <div className="my-1 sm:my-2 relative flex flex-col items-center">
          <div
            className={`font-mono font-black tabular-nums tracking-tighter leading-none select-none transition-all ${
              isOvertime
                ? 'text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                : isCountdownWarning
                ? 'text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.6)] animate-pulse'
                : isWarning
                ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                : isPaused
                ? 'text-slate-400 opacity-60'
                : 'text-slate-100 drop-shadow-[0_0_25px_rgba(249,115,22,0.2)]'
            } ${isFocusMode ? 'text-7xl sm:text-9xl my-4' : 'text-6xl sm:text-8xl'}`}
          >
            {taskTimerString}
          </div>

          {/* Prominent Paused Badge when paused */}
          {isPaused && (
            <div className="mt-1 flex items-center gap-2 px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold tracking-wide">
              <span>⏸ PAUSED</span>
              {tickData.totalPausedSeconds > 0 && (
                <span className="text-slate-400 font-normal">
                  ({formatTime(tickData.totalPausedSeconds)} paused)
                </span>
              )}
            </div>
          )}
        </div>

        {/* Secondary Overall Race Timer & Estimated Finish */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-400 mb-4 font-medium">
          <span className="tabular-nums font-semibold text-slate-300">
            {raceTimerString}
          </span>
          <span>•</span>
          <span>{tickData.raceProgressPercent}% total race completed</span>
          {tickData.estimatedFinishTime && (
            <>
              <span>•</span>
              <span className="text-cyan-400">
                Finish ~{tickData.estimatedFinishTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          )}
        </div>

        {/* Dual Progress Bars: Task & Overall */}
        <div className="w-full space-y-1.5 max-w-lg mb-4">
          <ProgressBar
            progressPercent={tickData.taskProgressPercent}
            color={isOvertime ? 'rose' : (isWarning || isCountdownWarning) ? 'amber' : 'orange'}
            size="md"
            isOvertime={isOvertime}
            label="Task Time Budget"
            sublabel={`${formatTime(tickData.taskElapsedSeconds)} / ${formatTime(tickData.taskAllocatedSeconds)}`}
          />
          <ProgressBar
            progressPercent={tickData.raceProgressPercent}
            color="cyan"
            size="sm"
            label="Overall Race Progress"
            sublabel={`${formatTime(tickData.raceElapsedSeconds)} / ${formatTime(tickData.raceAllocatedSeconds)}`}
          />
        </div>

        {/* TIMER CONTROLS BAR */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 w-full">
          {/* Play / Pause Primary Button */}
          {isRunning ? (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-2xl shadow-lg shadow-amber-500/20 transition cursor-pointer text-sm min-h-[48px]"
              aria-label="Pause timer"
            >
              <Pause className="w-5 h-5 fill-slate-950" />
              <span>PAUSE</span>
            </button>
          ) : (
            <button
              onClick={onPlay}
              className="flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/25 transition cursor-pointer text-sm min-h-[48px]"
              aria-label="Start or resume timer"
            >
              <Play className="w-5 h-5 fill-white" />
              <span>{tickData.timerState === 'IDLE' ? 'START RACE' : 'RESUME'}</span>
            </button>
          )}

          {/* Complete Task Button */}
          <button
            onClick={onComplete}
            disabled={tickData.timerState === 'IDLE'}
            className="flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:pointer-events-none text-white font-bold rounded-2xl shadow-md transition cursor-pointer text-sm min-h-[48px]"
            title="Complete current task and advance (Enter)"
            aria-label="Complete task"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>COMPLETE</span>
          </button>

          {/* Skip Task Button */}
          <button
            onClick={onSkip}
            disabled={tickData.timerState === 'IDLE'}
            className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white rounded-2xl transition cursor-pointer text-xs font-semibold min-h-[48px]"
            title="Skip current task (S)"
            aria-label="Skip task"
          >
            <SkipForward className="w-4 h-4" />
            <span>SKIP</span>
          </button>

          {/* Restart Task Button */}
          <button
            onClick={onRestartTask}
            disabled={tickData.timerState === 'IDLE'}
            className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-300 hover:text-white rounded-2xl transition cursor-pointer text-xs font-semibold min-h-[48px]"
            title="Restart current task timer (R)"
            aria-label="Restart task"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden sm:inline">RESTART</span>
          </button>

          {/* Save & Resume Later Button */}
          {onSaveAndResumeLater && (
            <button
              onClick={onSaveAndResumeLater}
              disabled={tickData.timerState === 'IDLE'}
              className="flex items-center gap-1.5 px-4 py-3 bg-slate-900 border border-slate-700 hover:border-orange-500/50 hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none text-orange-400 hover:text-orange-300 rounded-2xl transition cursor-pointer text-xs font-semibold min-h-[48px]"
              title="Save current progress and resume later"
              aria-label="Save and resume later"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span className="hidden sm:inline">SAVE & RESUME LATER</span>
              <span className="sm:hidden">SAVE</span>
            </button>
          )}

          {/* Finish Race Button */}
          <button
            onClick={onFinishRace}
            disabled={tickData.timerState === 'IDLE'}
            className="flex items-center gap-1.5 px-4 py-3 bg-slate-900 border border-slate-700 hover:border-slate-600 disabled:opacity-40 disabled:pointer-events-none text-slate-400 hover:text-slate-200 rounded-2xl transition cursor-pointer text-xs font-semibold min-h-[48px]"
            title="Finish entire race early"
            aria-label="Finish race"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">FINISH</span>
          </button>
        </div>
      </div>
    </div>
  );
};
