import {
  RaceTemplate,
  RaceRun,
  TaskRun,
  TimerState,
  AppSettings,
  ActiveRunRuntimeState,
} from '../../types/race';
import { audio } from './audioService';
import { wakeLock } from './wakeLock';
import { notifications } from './notificationService';

export interface TimerTickData {
  timerState: TimerState;
  currentTaskIndex: number;
  currentTaskRun: TaskRun | null;
  // Current Task timing (seconds)
  taskAllocatedSeconds: number;
  taskElapsedSeconds: number;
  taskRemainingSeconds: number;
  taskOvertimeSeconds: number;
  taskProgressPercent: number; // 0 to 100
  // Overall Race timing (seconds)
  raceAllocatedSeconds: number;
  raceElapsedSeconds: number;
  raceRemainingSeconds: number;
  raceOvertimeSeconds: number;
  raceProgressPercent: number; // 0 to 100
  // Overall task count
  completedTaskCount: number;
  totalTaskCount: number;
  // Pause tracking
  totalPausedSeconds: number;
  pausedAt: number | null;
  estimatedFinishTime: Date | null;
  isOvertime: boolean;
  isWarning: boolean;
  isCountdownWarning: boolean;
  countdownSecondsRemaining: number;
}

export type TimerListener = (data: TimerTickData) => void;
export type StateChangeListener = (newState: TimerState, oldState: TimerState) => void;
export type TaskExpiredListener = (taskIndex: number, taskName: string, nextTaskName?: string) => void;

export class TimerEngine {
  private template: RaceTemplate | null = null;
  private run: RaceRun | null = null;
  private settings: AppSettings;

  private currentTaskIndex: number = 0;
  private timerState: TimerState = 'IDLE';

  // Task timestamps (epoch ms)
  private taskStartedAt: number = 0;
  private taskPausedAt: number | null = null;
  private taskAccumulatedPausedMs: number = 0;

  // Race timestamps (epoch ms)
  private raceStartedAt: number = 0;
  private racePausedAt: number | null = null;
  private raceAccumulatedPausedMs: number = 0;

  private lastTickTimestamp: number = 0;
  private warnedThresholdsForCurrentTask: Set<number> = new Set();
  private lastCountdownSecondWarned: number | null = null;

  private intervalId: number | null = null;
  private listeners: Set<TimerListener> = new Set();
  private stateListeners: Set<StateChangeListener> = new Set();
  private taskExpiredListeners: Set<TaskExpiredListener> = new Set();
  private persistCallback?: (state: ActiveRunRuntimeState) => void;
  private raceCompletedCallback?: (run: RaceRun) => void;

  constructor(settings: AppSettings) {
    this.settings = settings;
  }

  updateSettings(settings: AppSettings) {
    this.settings = settings;
    audio.setEnabled(settings.soundEnabled);
    audio.setVolume(settings.soundVolume);
  }

  setPersistCallback(cb: (state: ActiveRunRuntimeState) => void) {
    this.persistCallback = cb;
  }

  setRaceCompletedCallback(cb: (run: RaceRun) => void) {
    this.raceCompletedCallback = cb;
  }

  subscribe(listener: TimerListener): () => void {
    this.listeners.add(listener);
    // Send immediate tick
    listener(this.getTickData());
    return () => this.listeners.delete(listener);
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  onTaskExpired(listener: TaskExpiredListener): () => void {
    this.taskExpiredListeners.add(listener);
    return () => this.taskExpiredListeners.delete(listener);
  }

  private setState(nextState: TimerState) {
    if (this.timerState === nextState) return;
    const old = this.timerState;
    this.timerState = nextState;
    for (const l of this.stateListeners) {
      l(nextState, old);
    }
  }

  // ===================== INITIALIZATION =====================

  initializeRun(template: RaceTemplate, existingRun?: RaceRun): RaceRun {
    this.template = JSON.parse(JSON.stringify(template));
    const enabledTasks = template.tasks.filter((t) => t.enabled);
    const totalAllocated = enabledTasks.reduce((sum, t) => sum + t.durationSeconds, 0);

    const nowIso = new Date().toISOString();
    const run: RaceRun = existingRun || {
      id: `run-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      templateId: template.id,
      templateSnapshot: JSON.parse(JSON.stringify(template)),
      startedAt: nowIso,
      status: 'running',
      totalAllocatedSeconds: totalAllocated,
      totalActualSeconds: 0,
      totalOvertimeSeconds: 0,
      totalPausedSeconds: 0,
      taskRuns: template.tasks.map((task) => ({
        taskId: task.id,
        taskSnapshot: { ...task },
        allocatedSeconds: task.durationSeconds,
        actualSeconds: 0,
        overtimeSeconds: 0,
        status: task.enabled ? 'pending' : 'skipped',
        events: [],
      })),
    };

    this.run = run;
    this.currentTaskIndex = this.findNextEnabledTaskIndex(-1);
    this.timerState = 'IDLE';

    this.taskStartedAt = 0;
    this.taskPausedAt = null;
    this.taskAccumulatedPausedMs = 0;

    this.raceStartedAt = 0;
    this.racePausedAt = null;
    this.raceAccumulatedPausedMs = 0;
    this.warnedThresholdsForCurrentTask.clear();
    this.lastCountdownSecondWarned = null;

    return run;
  }

  // ===================== CORE CONTROLS =====================

  start() {
    if (!this.run || !this.template) return;
    if (this.timerState === 'RUNNING') return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    if (this.timerState === 'IDLE') {
      this.raceStartedAt = now;
      this.racePausedAt = null;
      this.raceAccumulatedPausedMs = 0;

      this.taskStartedAt = now;
      this.taskPausedAt = null;
      this.taskAccumulatedPausedMs = 0;

      const currentRun = this.run.taskRuns[this.currentTaskIndex];
      if (currentRun) {
        currentRun.status = 'active';
        currentRun.startedAt = nowIso;
        currentRun.events.push({ type: 'start', timestamp: nowIso });
      }

      this.setState('RUNNING');
    } else if (this.timerState === 'PAUSED') {
      // Resume from paused
      if (this.taskPausedAt !== null) {
        this.taskAccumulatedPausedMs += now - this.taskPausedAt;
        this.taskPausedAt = null;
      }
      if (this.racePausedAt !== null) {
        this.raceAccumulatedPausedMs += now - this.racePausedAt;
        this.racePausedAt = null;
      }

      const currentRun = this.run.taskRuns[this.currentTaskIndex];
      if (currentRun) {
        currentRun.events.push({ type: 'resume', timestamp: nowIso });
      }

      this.setState('RUNNING');
    }

    if (this.settings.wakeLockEnabled) {
      wakeLock.acquire();
    }

    this.startTicker();
    this.notify();
    this.persistState();
  }

  pause() {
    if (this.timerState !== 'RUNNING' && this.timerState !== 'WARNING' && this.timerState !== 'OVERTIME') {
      return;
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    this.taskPausedAt = now;
    this.racePausedAt = now;
    this.setState('PAUSED');

    const currentRun = this.run?.taskRuns[this.currentTaskIndex];
    if (currentRun) {
      currentRun.events.push({ type: 'pause', timestamp: nowIso });
    }

    wakeLock.release();
    this.stopTicker();
    this.notify();
    this.persistState();
  }

  completeTask() {
    if (!this.run || this.currentTaskIndex < 0) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const currentRun = this.run.taskRuns[this.currentTaskIndex];

    if (currentRun) {
      const taskElapsed = this.calculateTaskElapsedSeconds(now);
      const allocated = currentRun.allocatedSeconds;
      const overtime = Math.max(0, taskElapsed - allocated);

      currentRun.actualSeconds = taskElapsed;
      currentRun.overtimeSeconds = overtime;
      currentRun.completedAt = nowIso;
      currentRun.status = 'completed';
      currentRun.events.push({ type: 'complete', timestamp: nowIso });
    }

    if (this.settings.completionSoundEnabled) {
      audio.playTaskComplete();
    }

    this.advanceToNextTask();
  }

  skipTask() {
    if (!this.run || this.currentTaskIndex < 0) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const currentRun = this.run.taskRuns[this.currentTaskIndex];

    if (currentRun) {
      const taskElapsed = this.calculateTaskElapsedSeconds(now);
      currentRun.actualSeconds = taskElapsed;
      currentRun.completedAt = nowIso;
      currentRun.status = 'skipped';
      currentRun.events.push({ type: 'skip', timestamp: nowIso });
    }

    this.advanceToNextTask();
  }

  restartTask() {
    if (!this.run || this.currentTaskIndex < 0) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const currentRun = this.run.taskRuns[this.currentTaskIndex];

    if (currentRun) {
      currentRun.actualSeconds = 0;
      currentRun.overtimeSeconds = 0;
      currentRun.status = 'active';
      currentRun.events.push({ type: 'start', timestamp: nowIso });
    }

    this.taskStartedAt = now;
    this.taskPausedAt = this.timerState === 'PAUSED' ? now : null;
    this.taskAccumulatedPausedMs = 0;
    this.warnedThresholdsForCurrentTask.clear();
    this.lastCountdownSecondWarned = null;

    if (this.timerState !== 'PAUSED') {
      this.setState('RUNNING');
    }

    this.notify();
    this.persistState();
  }

  restartRace() {
    if (!this.template) return;
    this.stopTicker();
    wakeLock.release();
    this.initializeRun(this.template);
    this.start();
  }

  finishRace() {
    if (!this.run) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    // Finalize any currently running task
    const currentRun = this.run.taskRuns[this.currentTaskIndex];
    if (currentRun && currentRun.status === 'active') {
      const taskElapsed = this.calculateTaskElapsedSeconds(now);
      currentRun.actualSeconds = taskElapsed;
      currentRun.overtimeSeconds = Math.max(0, taskElapsed - currentRun.allocatedSeconds);
      currentRun.completedAt = nowIso;
      currentRun.status = 'completed';
    }

    const totalActual = this.calculateRaceElapsedSeconds(now);
    const totalAllocated = this.run.totalAllocatedSeconds;
    const totalOvertime = Math.max(0, totalActual - totalAllocated);
    const totalPaused = Math.floor(this.raceAccumulatedPausedMs / 1000);

    this.run.status = 'completed';
    this.run.completedAt = nowIso;
    this.run.totalActualSeconds = totalActual;
    this.run.totalOvertimeSeconds = totalOvertime;
    this.run.totalPausedSeconds = totalPaused;

    this.setState('RACE_COMPLETED');
    this.stopTicker();
    wakeLock.release();

    if (this.settings.completionSoundEnabled) {
      audio.playRaceComplete();
    }

    this.notify();
    if (this.raceCompletedCallback) {
      this.raceCompletedCallback(this.run);
    }
  }

  // ===================== TASK ADVANCEMENT =====================

  private advanceToNextTask() {
    if (!this.run) return;

    const nextIndex = this.findNextEnabledTaskIndex(this.currentTaskIndex);

    if (nextIndex === -1) {
      // No more tasks! Race is complete
      this.finishRace();
      return;
    }

    this.currentTaskIndex = nextIndex;
    this.warnedThresholdsForCurrentTask.clear();
    this.lastCountdownSecondWarned = null;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const nextRun = this.run.taskRuns[nextIndex];

    this.taskStartedAt = now;
    this.taskPausedAt = null;
    this.taskAccumulatedPausedMs = 0;

    if (nextRun) {
      nextRun.status = 'active';
      nextRun.startedAt = nowIso;
      nextRun.events.push({ type: 'start', timestamp: nowIso });
    }

    if (this.settings.autoStartNext || this.timerState === 'RUNNING') {
      this.setState('RUNNING');
    } else {
      this.pause();
    }

    this.notify();
    this.persistState();
  }

  private findNextEnabledTaskIndex(fromIndex: number): number {
    if (!this.run) return -1;
    for (let i = fromIndex + 1; i < this.run.taskRuns.length; i++) {
      if (this.run.taskRuns[i].taskSnapshot.enabled) {
        return i;
      }
    }
    return -1;
  }

  // ===================== TICKER & CALCULATIONS =====================

  private startTicker() {
    this.stopTicker();
    this.lastTickTimestamp = Date.now();
    const freq = Math.max(100, this.settings.timerUpdateFrequencyMs || 200);

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, freq);
  }

  private stopTicker() {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private tick() {
    if (!this.run || this.timerState === 'PAUSED' || this.timerState === 'RACE_COMPLETED') {
      return;
    }

    const now = Date.now();
    this.lastTickTimestamp = now;

    const currentRun = this.run.taskRuns[this.currentTaskIndex];
    if (!currentRun) return;

    const taskElapsed = this.calculateTaskElapsedSeconds(now);
    const allocated = currentRun.allocatedSeconds;
    const remaining = allocated - taskElapsed;

    // Warning check
    if (remaining > 0) {
      for (const threshold of this.settings.warningThresholds) {
        if (remaining <= threshold && !this.warnedThresholdsForCurrentTask.has(threshold)) {
          this.warnedThresholdsForCurrentTask.add(threshold);
          if (this.settings.warningSoundEnabled) {
            audio.playWarningAlert();
          }
          if (this.settings.browserNotificationsEnabled) {
            notifications.notify(`Task Warning: ${threshold}s remaining`, {
              body: `${currentRun.taskSnapshot.name} has ${threshold} seconds left.`,
            });
          }
          this.setState('WARNING');
        }
      }

      // Final countdown warning: every second from 10s (or 15s) down to 1s
      const countdownThreshold = this.settings.countdownWarningThreshold ?? 10;
      if (countdownThreshold > 0 && remaining <= countdownThreshold) {
        if (this.lastCountdownSecondWarned !== remaining) {
          this.lastCountdownSecondWarned = remaining;
          if (this.settings.warningSoundEnabled) {
            audio.playCountdownWarning(remaining);
          }
          this.setState('WARNING');
        }
      }
    }

    // Task expiration check
    if (remaining <= 0) {
      if (this.settings.allowOvertime && !this.settings.autoAdvance) {
        // Stay in current task, enter overtime mode
        if (this.timerState !== 'OVERTIME') {
          this.setState('OVERTIME');
          audio.playOvertimePing();
        }
      } else if (this.settings.autoAdvance) {
        // Auto-advance
        const nextIndex = this.findNextEnabledTaskIndex(this.currentTaskIndex);
        const nextTaskName = nextIndex >= 0 ? this.run.taskRuns[nextIndex]?.taskSnapshot.name : undefined;

        for (const l of this.taskExpiredListeners) {
          l(this.currentTaskIndex, currentRun.taskSnapshot.name, nextTaskName);
        }

        if (this.settings.browserNotificationsEnabled) {
          notifications.notify("TIME'S UP!", {
            body: `${currentRun.taskSnapshot.name} expired. Moving to ${nextTaskName || 'finish'}.`,
          });
        }

        // Mark current as expired and advance
        currentRun.status = 'expired';
        currentRun.actualSeconds = taskElapsed;
        currentRun.overtimeSeconds = 0;
        currentRun.completedAt = new Date(now).toISOString();
        currentRun.events.push({ type: 'expire', timestamp: currentRun.completedAt });

        this.advanceToNextTask();
        return;
      }
    }

    this.notify();
    // Lightweight persist every 2 seconds or on significant events
    if (Math.floor(taskElapsed) % 2 === 0) {
      this.persistState();
    }
  }

  // ===================== PURE TIMESTAMP CALCULATIONS =====================

  calculateTaskElapsedSeconds(now: number = Date.now()): number {
    if (this.taskStartedAt === 0) return 0;
    const currentPaused = this.taskPausedAt !== null ? now - this.taskPausedAt : 0;
    const totalPausedMs = this.taskAccumulatedPausedMs + currentPaused;
    const rawElapsedMs = Math.max(0, now - this.taskStartedAt - totalPausedMs);
    return Math.floor(rawElapsedMs / 1000);
  }

  calculateRaceElapsedSeconds(now: number = Date.now()): number {
    if (this.raceStartedAt === 0) return 0;
    const currentPaused = this.racePausedAt !== null ? now - this.racePausedAt : 0;
    const totalPausedMs = this.raceAccumulatedPausedMs + currentPaused;
    const rawElapsedMs = Math.max(0, now - this.raceStartedAt - totalPausedMs);
    return Math.floor(rawElapsedMs / 1000);
  }

  getTickData(): TimerTickData {
    const now = Date.now();
    const currentRun = this.run?.taskRuns[this.currentTaskIndex] || null;

    const taskAllocated = currentRun ? currentRun.allocatedSeconds : 0;
    const taskElapsed = this.calculateTaskElapsedSeconds(now);
    const taskRemaining = Math.max(0, taskAllocated - taskElapsed);
    const taskOvertime = Math.max(0, taskElapsed - taskAllocated);
    const taskProgressPercent =
      taskAllocated > 0 ? Math.min(100, Math.round((taskElapsed / taskAllocated) * 100)) : 0;

    const raceAllocated = this.run ? this.run.totalAllocatedSeconds : 0;
    const raceElapsed = this.calculateRaceElapsedSeconds(now);
    const raceRemaining = Math.max(0, raceAllocated - raceElapsed);
    const raceOvertime = Math.max(0, raceElapsed - raceAllocated);
    const raceProgressPercent =
      raceAllocated > 0 ? Math.min(100, Math.round((raceElapsed / raceAllocated) * 100)) : 0;

    const completedCount =
      this.run?.taskRuns.filter((t) => t.status === 'completed' || t.status === 'expired').length || 0;
    const totalCount = this.run?.taskRuns.filter((t) => t.taskSnapshot.enabled).length || 0;

    const totalPaused = Math.floor(
      (this.raceAccumulatedPausedMs + (this.racePausedAt ? now - this.racePausedAt : 0)) / 1000
    );

    let estimatedFinish: Date | null = null;
    if (this.timerState === 'RUNNING' && raceRemaining > 0) {
      estimatedFinish = new Date(now + raceRemaining * 1000);
    }

    const countdownThreshold = this.settings.countdownWarningThreshold ?? 10;
    const isCountdownWarning =
      countdownThreshold > 0 &&
      taskRemaining > 0 &&
      taskRemaining <= countdownThreshold &&
      this.timerState !== 'PAUSED';

    return {
      timerState: this.timerState,
      currentTaskIndex: this.currentTaskIndex,
      currentTaskRun: currentRun,
      taskAllocatedSeconds: taskAllocated,
      taskElapsedSeconds: taskElapsed,
      taskRemainingSeconds: taskRemaining,
      taskOvertimeSeconds: taskOvertime,
      taskProgressPercent,
      raceAllocatedSeconds: raceAllocated,
      raceElapsedSeconds: raceElapsed,
      raceRemainingSeconds: raceRemaining,
      raceOvertimeSeconds: raceOvertime,
      raceProgressPercent,
      completedTaskCount: completedCount,
      totalTaskCount: totalCount,
      totalPausedSeconds: totalPaused,
      pausedAt: this.racePausedAt,
      estimatedFinishTime: estimatedFinish,
      isOvertime: taskOvertime > 0,
      isWarning: this.timerState === 'WARNING' || isCountdownWarning,
      isCountdownWarning,
      countdownSecondsRemaining: isCountdownWarning ? taskRemaining : 0,
    };
  }

  private notify() {
    const data = this.getTickData();
    for (const l of this.listeners) {
      l(data);
    }
  }

  // ===================== PERSISTENCE & RECOVERY =====================

  private persistState() {
    if (!this.run || !this.template || !this.persistCallback) return;
    if (this.timerState === 'RACE_COMPLETED' || this.timerState === 'RACE_CANCELLED') return;

    const state: ActiveRunRuntimeState = {
      runId: this.run.id,
      templateId: this.template.id,
      currentTaskIndex: this.currentTaskIndex,
      timerState: this.timerState,
      taskStartedAt: this.taskStartedAt,
      taskPausedAt: this.taskPausedAt,
      taskAccumulatedPausedMs: this.taskAccumulatedPausedMs,
      raceStartedAt: this.raceStartedAt,
      racePausedAt: this.racePausedAt,
      raceAccumulatedPausedMs: this.raceAccumulatedPausedMs,
      lastTickTimestamp: Date.now(),
      taskRuns: this.run.taskRuns,
      templateSnapshot: this.template,
    };

    this.persistCallback(state);
  }

  recover(saved: ActiveRunRuntimeState) {
    this.template = saved.templateSnapshot;
    this.currentTaskIndex = saved.currentTaskIndex;
    this.taskStartedAt = saved.taskStartedAt;
    this.taskPausedAt = saved.taskPausedAt;
    this.taskAccumulatedPausedMs = saved.taskAccumulatedPausedMs;
    this.raceStartedAt = saved.raceStartedAt;
    this.racePausedAt = saved.racePausedAt;
    this.raceAccumulatedPausedMs = saved.raceAccumulatedPausedMs;
    this.timerState = saved.timerState;
    this.lastCountdownSecondWarned = null;

    const totalAllocated = saved.taskRuns
      .filter((t) => t.taskSnapshot.enabled)
      .reduce((s, t) => s + t.allocatedSeconds, 0);

    this.run = {
      id: saved.runId,
      templateId: saved.templateId,
      templateSnapshot: saved.templateSnapshot,
      startedAt: new Date(saved.raceStartedAt).toISOString(),
      status: saved.timerState === 'PAUSED' ? 'paused' : 'running',
      totalAllocatedSeconds: totalAllocated,
      totalActualSeconds: this.calculateRaceElapsedSeconds(),
      totalOvertimeSeconds: 0,
      totalPausedSeconds: Math.floor(saved.raceAccumulatedPausedMs / 1000),
      taskRuns: saved.taskRuns,
    };

    if (saved.timerState === 'RUNNING' || saved.timerState === 'WARNING' || saved.timerState === 'OVERTIME') {
      this.startTicker();
    }

    this.notify();
  }

  getCurrentRun(): RaceRun | null {
    return this.run;
  }

  getCurrentRuntimeState(): ActiveRunRuntimeState | null {
    if (!this.run || !this.template) return null;
    if (this.timerState === 'RACE_COMPLETED' || this.timerState === 'RACE_CANCELLED') return null;

    const enabledTasks = this.run.taskRuns.filter((t) => t.taskSnapshot.enabled);
    if (enabledTasks.length > 0 && enabledTasks.every((t) => t.status === 'completed' || t.status === 'expired' || t.status === 'skipped')) {
      return null;
    }

    return {
      runId: this.run.id,
      templateId: this.template.id,
      currentTaskIndex: this.currentTaskIndex,
      timerState: this.timerState,
      taskStartedAt: this.taskStartedAt,
      taskPausedAt: this.taskPausedAt,
      taskAccumulatedPausedMs: this.taskAccumulatedPausedMs,
      raceStartedAt: this.raceStartedAt,
      racePausedAt: this.racePausedAt,
      raceAccumulatedPausedMs: this.raceAccumulatedPausedMs,
      lastTickTimestamp: Date.now(),
      taskRuns: this.run.taskRuns,
      templateSnapshot: this.template,
    };
  }

  pauseAndGetState(): ActiveRunRuntimeState | null {
    if (this.timerState === 'RACE_COMPLETED' || this.timerState === 'RACE_CANCELLED') {
      return null;
    }
    if (this.timerState === 'RUNNING' || this.timerState === 'WARNING' || this.timerState === 'OVERTIME') {
      this.pause();
    }
    const state = this.getCurrentRuntimeState();
    if (state) {
      state.savedAt = new Date().toISOString();
      state.isExplicitlySaved = true;
    }
    return state;
  }

  clearCurrentRun(): void {
    this.stopTicker();
    wakeLock.release();
    this.run = null;
    this.template = null;
    this.timerState = 'IDLE';
    this.currentTaskIndex = 0;
    this.taskStartedAt = 0;
    this.taskPausedAt = null;
    this.taskAccumulatedPausedMs = 0;
    this.raceStartedAt = 0;
    this.racePausedAt = null;
    this.raceAccumulatedPausedMs = 0;
    this.lastCountdownSecondWarned = null;
    this.notify();
  }

  getLastTickTimestamp(): number {
    return this.lastTickTimestamp;
  }

  destroy() {
    this.stopTicker();
    wakeLock.release();
    this.listeners.clear();
    this.stateListeners.clear();
    this.taskExpiredListeners.clear();
  }
}
