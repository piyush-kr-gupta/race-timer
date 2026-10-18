import React, { useState, useEffect } from 'react';
import { TimerTickData } from '../../services/timer/timerEngine';
import { RaceRun } from '../../types/race';
import { StickyTimerHeader } from './StickyTimerHeader';
import { TaskTimeline } from './TaskTimeline';
import { SessionTaskManager } from './SessionTaskManager';
import { ConfirmDialog } from '../common/ConfirmDialog';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { speech } from '../../services/timer/speechService';
import { BellRing, ArrowLeft, BookmarkCheck } from 'lucide-react';

interface RacePlayerProps {
  tickData: TimerTickData;
  run: RaceRun;
  onPlay: () => void;
  onPause: () => void;
  onComplete: () => void;
  onSkip: () => void;
  onRestartTask: () => void;
  onRestartRace: () => void;
  onFinishRace: () => void;
  onExitPlayer: () => void;
  onSaveAndResumeLater?: () => void;
  expiredAlert?: { taskIndex: number; taskName: string; nextTaskName?: string } | null;
  keyboardShortcutsEnabled?: boolean;
  onAddSessionTask?: (title: string) => void;
  onToggleSessionTask?: (taskId: string) => void;
  onDeleteSessionTask?: (taskId: string) => void;
  onUpdateSessionTask?: (taskId: string, title: string) => void;
  onClearCompletedSessionTasks?: () => void;
}

export const RacePlayer: React.FC<RacePlayerProps> = ({
  tickData,
  run,
  onPlay,
  onPause,
  onComplete,
  onSkip,
  onRestartTask,
  onRestartRace,
  onFinishRace,
  onExitPlayer,
  onSaveAndResumeLater,
  expiredAlert,
  keyboardShortcutsEnabled = true,
  onAddSessionTask,
  onToggleSessionTask,
  onDeleteSessionTask,
  onUpdateSessionTask,
  onClearCompletedSessionTasks,
}) => {
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: () => {},
  });

  // Cancel any ongoing speech when exiting player
  useEffect(() => {
    return () => {
      speech.cancel();
    };
  }, []);

  // Track Fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.warn('Fullscreen request failed:', e);
    }
  };

  const toggleFocusMode = () => {
    setIsFocusMode((prev) => !prev);
  };

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      onPlayPause: () => {
        if (tickData.timerState === 'RUNNING' || tickData.timerState === 'WARNING' || tickData.timerState === 'OVERTIME') {
          onPause();
        } else {
          onPlay();
        }
      },
      onComplete,
      onSkip,
      onRestart: onRestartTask,
      onToggleFocus: toggleFocusMode,
      onEscape: () => {
        if (isFocusMode) setIsFocusMode(false);
      },
    },
    keyboardShortcutsEnabled
  );

  const handlePromptRestartRace = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Restart Race?',
      message: 'This will reset all task timers and restart the race from the beginning. Current run progress will be reset.',
      action: () => onRestartRace(),
    });
  };

  const handlePromptFinishRace = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Finish Race Early?',
      message: 'Are you sure you want to end this race now? Your completed tasks and recorded timing statistics will be finalized and saved.',
      action: () => onFinishRace(),
    });
  };

  return (
    <div className={`min-h-screen pb-20 ${isFocusMode ? 'bg-black' : ''}`}>
      {/* Back to dashboard & Save button (hidden in focus mode) */}
      {!isFocusMode && (
        <div className="max-w-4xl mx-auto px-4 pt-3 pb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onExitPlayer}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition cursor-pointer py-1.5 px-2.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            {onSaveAndResumeLater && (
              <button
                onClick={onSaveAndResumeLater}
                className="flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 transition cursor-pointer py-1.5 px-3 rounded-lg shadow-sm"
                title="Save current progress and resume later"
              >
                <BookmarkCheck className="w-3.5 h-3.5" />
                <span>Save & Resume Later</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePromptRestartRace}
              className="text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-900 px-2 py-1 rounded-lg transition cursor-pointer"
            >
              Restart Race
            </button>
          </div>
        </div>
      )}

      {/* Task Expired Time's Up Banner */}
      {expiredAlert && (
        <div className="bg-rose-600 text-white font-bold text-center py-2.5 px-4 shadow-lg animate-bounce flex items-center justify-center gap-2 text-sm z-40 relative">
          <BellRing className="w-5 h-5 animate-spin" />
          <span>
            TIME'S UP! {expiredAlert.taskName} expired. Moving to {expiredAlert.nextTaskName || 'Finish'}!
          </span>
        </div>
      )}

      {/* Sticky Top Dominant Timer Header */}
      <StickyTimerHeader
        tickData={tickData}
        raceName={run.templateSnapshot.name}
        isFocusMode={isFocusMode}
        isFullscreen={isFullscreen}
        onToggleFocusMode={toggleFocusMode}
        onToggleFullscreen={toggleFullscreen}
        onPlay={onPlay}
        onPause={onPause}
        onComplete={onComplete}
        onSkip={onSkip}
        onRestartTask={onRestartTask}
        onFinishRace={handlePromptFinishRace}
        onSaveAndResumeLater={onSaveAndResumeLater}
      />

      {/* Session Task Manager to-do list (hidden in Focus mode) */}
      {!isFocusMode && onAddSessionTask && (
        <SessionTaskManager
          sessionTasks={run.sessionTasks}
          onAddTask={onAddSessionTask}
          onToggleTask={onToggleSessionTask || (() => {})}
          onDeleteTask={onDeleteSessionTask || (() => {})}
          onUpdateTask={onUpdateSessionTask || (() => {})}
          onClearCompleted={onClearCompletedSessionTasks || (() => {})}
        />
      )}

      {/* Timeline below sticky timer (hidden in Focus mode) */}
      {!isFocusMode && (
        <TaskTimeline
          taskRuns={run.taskRuns}
          currentIndex={tickData.currentTaskIndex}
          currentTaskElapsed={tickData.taskElapsedSeconds}
          currentTaskRemaining={tickData.taskRemainingSeconds}
          currentTaskOvertime={tickData.taskOvertimeSeconds}
        />
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
