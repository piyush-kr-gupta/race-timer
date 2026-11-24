import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from './timerEngine';
import { audio } from './audioService';
import { speech } from './speechService';
import { DEFAULT_SETTINGS } from '../storage/seedData';
import { RaceTemplate } from '../../types/race';

const mockTemplate: RaceTemplate = {
  id: 'test-race-1',
  name: 'Test Race',
  category: 'Testing',
  tags: ['Test'],
  createdAt: '2026-09-24T00:00:00.000Z',
  updatedAt: '2026-09-24T00:00:00.000Z',
  tasks: [
    {
      id: 'task-1',
      name: 'First Task',
      durationSeconds: 10,
      order: 0,
      enabled: true,
    },
    {
      id: 'task-2',
      name: 'Second Task',
      durationSeconds: 20,
      order: 1,
      enabled: true,
    },
    {
      id: 'task-3',
      name: 'Third Task',
      durationSeconds: 30,
      order: 2,
      enabled: true,
    },
  ],
};

describe('TimerEngine', () => {
  let engine: TimerEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    engine = new TimerEngine(DEFAULT_SETTINGS);
  });

  afterEach(() => {
    engine.destroy();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('initializes a run correctly', () => {
    const run = engine.initializeRun(mockTemplate);
    expect(run.status).toBe('running');
    expect(run.totalAllocatedSeconds).toBe(60);
    expect(run.taskRuns.length).toBe(4); // 3 regular tasks + 1 Earned Buffer task
    expect(run.taskRuns[3].isEarnedBuffer).toBe(true);
    expect(run.taskRuns[3].taskSnapshot.name).toBe('Earned Buffer');

    const data = engine.getTickData();
    expect(data.timerState).toBe('IDLE');
    expect(data.currentTaskIndex).toBe(0);
    expect(data.taskAllocatedSeconds).toBe(10);
    expect(data.taskRemainingSeconds).toBe(10);
    expect(data.raceRemainingSeconds).toBe(60);
  });

  it('starts and calculates elapsed time based on timestamps', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    expect(engine.getTickData().timerState).toBe('RUNNING');

    // Advance by 3 seconds
    vi.advanceTimersByTime(3000);

    const data = engine.getTickData();
    expect(data.taskElapsedSeconds).toBe(3);
    expect(data.taskRemainingSeconds).toBe(7);
    expect(data.raceElapsedSeconds).toBe(3);
    expect(data.raceRemainingSeconds).toBe(57);
  });

  it('pauses and resumes without losing or drifting time', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    // Run for 4 seconds
    vi.advanceTimersByTime(4000);
    expect(engine.getTickData().taskElapsedSeconds).toBe(4);

    // Pause for 5 seconds
    engine.pause();
    expect(engine.getTickData().timerState).toBe('PAUSED');
    vi.advanceTimersByTime(5000);

    // Time should remain paused at 4s elapsed
    expect(engine.getTickData().taskElapsedSeconds).toBe(4);
    expect(engine.getTickData().totalPausedSeconds).toBe(5);

    // Resume and run for 2 more seconds
    engine.start();
    expect(engine.getTickData().timerState).toBe('RUNNING');
    vi.advanceTimersByTime(2000);

    const data = engine.getTickData();
    expect(data.taskElapsedSeconds).toBe(6);
    expect(data.taskRemainingSeconds).toBe(4);
    expect(data.totalPausedSeconds).toBe(5);
  });

  it('completes current task and advances to next task', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    vi.advanceTimersByTime(4000);
    engine.completeTask();

    const data = engine.getTickData();
    expect(data.currentTaskIndex).toBe(1);
    expect(data.taskAllocatedSeconds).toBe(20);
    expect(data.taskElapsedSeconds).toBe(0);
    expect(data.taskRemainingSeconds).toBe(20);

    const run = engine.getCurrentRun()!;
    expect(run.taskRuns[0].status).toBe('completed');
    expect(run.taskRuns[0].actualSeconds).toBe(4);
    expect(run.taskRuns[0].overtimeSeconds).toBe(0);
  });

  it('skips current task and advances', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    vi.advanceTimersByTime(2000);
    engine.skipTask();

    const run = engine.getCurrentRun()!;
    expect(run.taskRuns[0].status).toBe('skipped');
    expect(engine.getTickData().currentTaskIndex).toBe(1);
  });

  it('restarts current task correctly', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    vi.advanceTimersByTime(5000);
    expect(engine.getTickData().taskElapsedSeconds).toBe(5);

    engine.restartTask();
    expect(engine.getTickData().taskElapsedSeconds).toBe(0);
    expect(engine.getTickData().taskRemainingSeconds).toBe(10);
  });

  it('supports overtime mode when autoAdvance is disabled', () => {
    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      autoAdvance: false,
      allowOvertime: true,
    });

    engine.initializeRun(mockTemplate);
    engine.start();

    // Advance 12 seconds (task allocated is 10s)
    vi.advanceTimersByTime(12000);

    const data = engine.getTickData();
    expect(data.taskElapsedSeconds).toBe(12);
    expect(data.taskRemainingSeconds).toBe(0);
    expect(data.taskOvertimeSeconds).toBe(2);
    expect(data.isOvertime).toBe(true);

    // Complete in overtime
    engine.completeTask();
    const run = engine.getCurrentRun()!;
    expect(run.taskRuns[0].status).toBe('completed');
    expect(run.taskRuns[0].actualSeconds).toBe(12);
    expect(run.taskRuns[0].overtimeSeconds).toBe(2);
  });

  it('auto-advances and marks task as completed when duration elapses with autoAdvance enabled', () => {
    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      autoAdvance: true,
    });

    engine.initializeRun(mockTemplate);
    engine.start();

    // Advance past first task (10 seconds)
    vi.advanceTimersByTime(10500);

    const data = engine.getTickData();
    // Should have advanced to task 1
    expect(data.currentTaskIndex).toBe(1);
    const run = engine.getCurrentRun()!;
    expect(run.taskRuns[0].status).toBe('completed');
    expect(run.taskRuns[0].actualSeconds).toBe(10);
    expect(run.taskRuns[0].events.some((e) => e.type === 'complete')).toBe(true);
  });

  it('finishes race upon completing the last task', () => {
    engine.initializeRun(mockTemplate);
    engine.start();

    // Complete task 1
    engine.completeTask();
    // Complete task 2
    engine.completeTask();
    // Complete task 3
    engine.completeTask();
    // Complete Earned Buffer
    engine.completeTask();

    const data = engine.getTickData();
    expect(data.timerState).toBe('RACE_COMPLETED');
    const run = engine.getCurrentRun()!;
    expect(run.status).toBe('completed');
    expect(run.completedAt).toBeDefined();
  });

  it('handles edge case: 1-second task', () => {
    const singleSecondTemplate: RaceTemplate = {
      ...mockTemplate,
      tasks: [{ id: 't1', name: 'Quick', durationSeconds: 1, order: 0, enabled: true }],
    };

    engine.initializeRun(singleSecondTemplate);
    engine.start();

    vi.advanceTimersByTime(500);
    expect(engine.getTickData().taskRemainingSeconds).toBe(1);

    vi.advanceTimersByTime(600);
    expect(engine.getTickData().taskElapsedSeconds).toBe(1);
  });

  it('handles edge case: 0-second task', () => {
    const zeroSecondTemplate: RaceTemplate = {
      ...mockTemplate,
      tasks: [{ id: 't0', name: 'Zero', durationSeconds: 0, order: 0, enabled: true }],
    };

    engine.initializeRun(zeroSecondTemplate);
    engine.start();
    expect(engine.getTickData().taskAllocatedSeconds).toBe(0);
    expect(engine.getTickData().taskRemainingSeconds).toBe(0);
  });

  it('recovers accurately from persisted runtime state after interruption', () => {
    let persisted: any = null;
    engine.setPersistCallback((state) => {
      persisted = state;
    });

    engine.initializeRun(mockTemplate);
    engine.start();
    vi.advanceTimersByTime(5000);

    expect(persisted).not.toBeNull();

    // Simulate browser restart with a new engine instance
    const freshEngine = new TimerEngine(DEFAULT_SETTINGS);
    freshEngine.recover(persisted);

    const recoveredData = freshEngine.getTickData();
    expect(recoveredData.currentTaskIndex).toBe(0);
    expect(recoveredData.taskElapsedSeconds).toBe(5);
    expect(recoveredData.taskRemainingSeconds).toBe(5);
    freshEngine.destroy();
  });

  it('triggers gentle audio and visual countdown warnings every second from 10 seconds to 1 second', () => {
    const playCountdownSpy = vi.spyOn(audio, 'playCountdownWarning');

    // 10-second task
    const tenSecondTemplate: RaceTemplate = {
      ...mockTemplate,
      tasks: [{ id: 't10', name: 'TenSec', durationSeconds: 10, order: 0, enabled: true }],
    };

    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      countdownWarningThreshold: 10,
      autoAdvance: false,
      allowOvertime: true,
    });

    engine.initializeRun(tenSecondTemplate);
    engine.start();

    // At 0s elapsed, remaining is 10s
    expect(engine.getTickData().isCountdownWarning).toBe(true);
    expect(engine.getTickData().countdownSecondsRemaining).toBe(10);

    // Advance 10 seconds second by second
    for (let s = 1; s <= 9; s++) {
      vi.advanceTimersByTime(1000);
      const data = engine.getTickData();
      expect(data.isCountdownWarning).toBe(true);
      expect(data.countdownSecondsRemaining).toBe(10 - s);
    }

    // Advance to 10s (0s remaining, entering overtime)
    vi.advanceTimersByTime(1000);
    expect(engine.getTickData().isCountdownWarning).toBe(false);
    expect(engine.getTickData().taskRemainingSeconds).toBe(0);

    // Audio warning should have fired for each second from 10 down to 1
    expect(playCountdownSpy).toHaveBeenCalled();
    const calls = playCountdownSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain(10);
    expect(calls).toContain(5);
    expect(calls).toContain(1);
    expect(calls).not.toContain(0);
  });

  it('supports countdown warning every second from 15 seconds to 1 second when configured', () => {
    const playCountdownSpy = vi.spyOn(audio, 'playCountdownWarning');

    const fifteenSecondTemplate: RaceTemplate = {
      ...mockTemplate,
      tasks: [{ id: 't15', name: 'FifteenSec', durationSeconds: 15, order: 0, enabled: true }],
    };

    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      countdownWarningThreshold: 15,
      autoAdvance: false,
      allowOvertime: true,
    });

    engine.initializeRun(fifteenSecondTemplate);
    engine.start();

    expect(engine.getTickData().isCountdownWarning).toBe(true);
    expect(engine.getTickData().countdownSecondsRemaining).toBe(15);

    // Advance 5 seconds (to 10s remaining)
    vi.advanceTimersByTime(5000);
    expect(engine.getTickData().countdownSecondsRemaining).toBe(10);

    // Advance to 1s remaining
    vi.advanceTimersByTime(9000);
    expect(engine.getTickData().countdownSecondsRemaining).toBe(1);
    expect(engine.getTickData().isCountdownWarning).toBe(true);

    const calls = playCountdownSpy.mock.calls.map((c) => c[0]);
    expect(calls).toContain(15);
    expect(calls).toContain(10);
    expect(calls).toContain(1);
  });

  it('does not trigger countdown warning when countdownWarningThreshold is 0 (disabled)', () => {
    const playCountdownSpy = vi.spyOn(audio, 'playCountdownWarning');

    const tenSecondTemplate: RaceTemplate = {
      ...mockTemplate,
      tasks: [{ id: 't10', name: 'TenSec', durationSeconds: 10, order: 0, enabled: true }],
    };

    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      countdownWarningThreshold: 0,
      autoAdvance: false,
    });

    engine.initializeRun(tenSecondTemplate);
    engine.start();

    vi.advanceTimersByTime(5000);
    expect(engine.getTickData().isCountdownWarning).toBe(false);
    expect(playCountdownSpy).not.toHaveBeenCalled();
  });

  it('accurately tracks paceDeltaSeconds (leading by / trailing by) across task completions and overtime', () => {
    const paceTemplate: RaceTemplate = {
      id: 'pace-test',
      name: 'Pace Race',
      category: 'Testing',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 't1', name: 'Task 1', durationSeconds: 60, order: 0, enabled: true },
        { id: 't2', name: 'Task 2', durationSeconds: 60, order: 1, enabled: true },
        { id: 't3', name: 'Task 3', durationSeconds: 60, order: 2, enabled: true },
      ],
    };

    engine.updateSettings({
      ...DEFAULT_SETTINGS,
      autoAdvance: false,
      allowOvertime: true,
    });

    engine.initializeRun(paceTemplate);
    engine.start();

    // In Task 1 at 20s (budget 60s, overtime 0)
    vi.advanceTimersByTime(20000);
    expect(engine.getTickData().paceDeltaSeconds).toBe(0); // On pace

    // Complete Task 1 at 40s (saved 20s)
    vi.advanceTimersByTime(20000);
    engine.completeTask();

    // Now in Task 2: leading by 20 seconds!
    expect(engine.getTickData().currentTaskIndex).toBe(1);
    expect(engine.getTickData().paceDeltaSeconds).toBe(20);

    // Run Task 2 for 30 seconds (still within budget, overtime 0)
    vi.advanceTimersByTime(30000);
    expect(engine.getTickData().paceDeltaSeconds).toBe(20); // Still leading by 20s

    // Run Task 2 into overtime: 70 seconds total elapsed (10s overtime)
    vi.advanceTimersByTime(40000);
    expect(engine.getTickData().taskOvertimeSeconds).toBe(10);
    // Lead shrinks from 20s to 10s
    expect(engine.getTickData().paceDeltaSeconds).toBe(10);

    // Run Task 2 further: 90 seconds total elapsed (30s overtime)
    vi.advanceTimersByTime(20000);
    expect(engine.getTickData().taskOvertimeSeconds).toBe(30);
    // Now trailing by 10s (-10)
    expect(engine.getTickData().paceDeltaSeconds).toBe(-10);

    // Complete Task 2 with 30s overtime
    engine.completeTask();

    // Now in Task 3: trailing by 10s (-10)
    expect(engine.getTickData().currentTaskIndex).toBe(2);
    expect(engine.getTickData().paceDeltaSeconds).toBe(-10);

    // Complete Task 3 after 25s (saving 35s out of 60s)
    vi.advanceTimersByTime(25000);
    engine.completeTask();

    // Earned Buffer task is unlocked with 25s lead! Complete Earned Buffer
    engine.completeTask();

    // Race finishes: net variance = +20 (Task 1) - 30 (Task 2) + 35 (Task 3) = +25s
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    expect(engine.getTickData().paceDeltaSeconds).toBe(25);
  });

  describe('Session Task Manager (in-session to-do checklist)', () => {
    it('initializes a run with an empty sessionTasks array by default', () => {
      const run = engine.initializeRun(mockTemplate);
      expect(run.sessionTasks).toEqual([]);
    });

    it('adds, toggles, updates, and deletes session tasks', () => {
      engine.initializeRun(mockTemplate);

      // Add task
      const task1 = engine.addSessionTask('20 Push-ups');
      expect(task1).not.toBeNull();
      expect(task1?.title).toBe('20 Push-ups');
      expect(task1?.completed).toBe(false);
      expect(task1?.completedAt).toBeUndefined();

      const task2 = engine.addSessionTask('10 Squats');
      expect(task2?.title).toBe('10 Squats');

      let currentRun = engine.getCurrentRun();
      expect(currentRun?.sessionTasks?.length).toBe(2);

      // Toggle task 1 -> completed
      engine.toggleSessionTask(task1!.id);
      currentRun = engine.getCurrentRun();
      const updatedTask1 = currentRun?.sessionTasks?.find((t) => t.id === task1!.id);
      expect(updatedTask1?.completed).toBe(true);
      expect(updatedTask1?.completedAt).toBeDefined();

      // Toggle task 1 back -> uncompleted
      engine.toggleSessionTask(task1!.id);
      currentRun = engine.getCurrentRun();
      const uncompletedTask1 = currentRun?.sessionTasks?.find((t) => t.id === task1!.id);
      expect(uncompletedTask1?.completed).toBe(false);
      expect(uncompletedTask1?.completedAt).toBeUndefined();

      // Update task 2 title
      engine.updateSessionTask(task2!.id, '15 Squats');
      currentRun = engine.getCurrentRun();
      const updatedTask2 = currentRun?.sessionTasks?.find((t) => t.id === task2!.id);
      expect(updatedTask2?.title).toBe('15 Squats');

      // Delete task 1
      engine.deleteSessionTask(task1!.id);
      currentRun = engine.getCurrentRun();
      expect(currentRun?.sessionTasks?.length).toBe(1);
      expect(currentRun?.sessionTasks?.[0].id).toBe(task2!.id);
    });

    it('clears completed session tasks', () => {
      engine.initializeRun(mockTemplate);

      const t1 = engine.addSessionTask('Task 1');
      const t2 = engine.addSessionTask('Task 2');
      const t3 = engine.addSessionTask('Task 3');

      engine.toggleSessionTask(t1!.id);
      engine.toggleSessionTask(t3!.id);

      engine.clearCompletedSessionTasks();

      const currentRun = engine.getCurrentRun();
      expect(currentRun?.sessionTasks?.length).toBe(1);
      expect(currentRun?.sessionTasks?.[0].id).toBe(t2!.id);
    });

    it('persists and recovers session tasks across interruptions / state recovery', () => {
      engine.initializeRun(mockTemplate);
      const t1 = engine.addSessionTask('30-second plank');
      engine.toggleSessionTask(t1!.id);

      const runtimeState = engine.getCurrentRuntimeState();
      expect(runtimeState).not.toBeNull();
      expect(runtimeState?.sessionTasks).toBeDefined();
      expect(runtimeState?.sessionTasks?.length).toBe(1);
      expect(runtimeState?.sessionTasks?.[0].title).toBe('30-second plank');
      expect(runtimeState?.sessionTasks?.[0].completed).toBe(true);

      // Create a fresh engine and recover state
      const freshEngine = new TimerEngine(DEFAULT_SETTINGS);
      freshEngine.recover(runtimeState!);

      const recoveredRun = freshEngine.getCurrentRun();
      expect(recoveredRun?.sessionTasks?.length).toBe(1);
      expect(recoveredRun?.sessionTasks?.[0].title).toBe('30-second plank');
      expect(recoveredRun?.sessionTasks?.[0].completed).toBe(true);
      freshEngine.destroy();
    });
  });

  describe('Text-to-Speech Task Name Announcement', () => {
    it('spells out / announces the task name (not race name) when a race starts', () => {
      const speakSpy = vi.spyOn(speech, 'speak').mockReturnValue(true);

      engine.initializeRun(mockTemplate);
      engine.start();

      expect(speakSpy).toHaveBeenCalledTimes(1);
      expect(speakSpy).toHaveBeenCalledWith('First Task');
      expect(speakSpy).not.toHaveBeenCalledWith(mockTemplate.name);
    });

    it('announces the next task name when advancing to next task', () => {
      const speakSpy = vi.spyOn(speech, 'speak').mockReturnValue(true);

      engine.initializeRun(mockTemplate);
      engine.start();
      speakSpy.mockClear();

      engine.completeTask(); // advances to task 2

      expect(speakSpy).toHaveBeenCalledTimes(1);
      expect(speakSpy).toHaveBeenCalledWith('Second Task');
      expect(speakSpy).not.toHaveBeenCalledWith(mockTemplate.name);
    });

    it('announces the task name when restartTask is called', () => {
      const speakSpy = vi.spyOn(speech, 'speak').mockReturnValue(true);

      engine.initializeRun(mockTemplate);
      engine.start();
      speakSpy.mockClear();

      engine.restartTask();

      expect(speakSpy).toHaveBeenCalledTimes(1);
      expect(speakSpy).toHaveBeenCalledWith('First Task');
    });

    it('does not speak when ttsTaskNameEnabled is false in settings', () => {
      const speakSpy = vi.spyOn(speech, 'speak').mockReturnValue(true);

      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        ttsTaskNameEnabled: false,
      });

      engine.initializeRun(mockTemplate);
      engine.start();

      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('does not speak when soundEnabled is false in settings', () => {
      const speakSpy = vi.spyOn(speech, 'speak').mockReturnValue(true);

      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        soundEnabled: false,
      });

      engine.initializeRun(mockTemplate);
      engine.start();

      expect(speakSpy).not.toHaveBeenCalled();
    });

    it('cancels speech on pause and finish', () => {
      const cancelSpy = vi.spyOn(speech, 'cancel');

      engine.initializeRun(mockTemplate);
      engine.start();
      engine.pause();

      expect(cancelSpy).toHaveBeenCalled();

      cancelSpy.mockClear();
      engine.finishRace();
      expect(cancelSpy).toHaveBeenCalled();
    });
  });

  describe('Earned Buffer Task', () => {
    it('accumulates leading and trailing time and unlocks buffer task with exact lead duration', () => {
      // User's exact scenario:
      // 4 tasks of 5 min (300s) each
      // Task 1: 3m (180s) -> +120s lead
      // Task 2: 6m (360s) -> 60s delay -> net +60s
      // Task 3: 4m 30s (270s) -> +30s lead -> net +90s
      // Task 4: 3m 30s (210s) -> +90s lead -> net +180s (3m 00s)
      const fourTaskTemplate: RaceTemplate = {
        ...mockTemplate,
        tasks: [
          { id: 't1', name: 'Task 1', durationSeconds: 300, order: 0, enabled: true },
          { id: 't2', name: 'Task 2', durationSeconds: 300, order: 1, enabled: true },
          { id: 't3', name: 'Task 3', durationSeconds: 300, order: 2, enabled: true },
          { id: 't4', name: 'Task 4', durationSeconds: 300, order: 3, enabled: true },
        ],
      };

      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        allowOvertime: true,
        autoAdvance: false,
      });

      engine.initializeRun(fourTaskTemplate);
      engine.start();

      // Task 1: 180s (3 min)
      vi.advanceTimersByTime(180 * 1000);
      engine.completeTask();

      // Task 2: 360s (6 min)
      vi.advanceTimersByTime(360 * 1000);
      engine.completeTask();

      // Task 3: 270s (4.5 min)
      vi.advanceTimersByTime(270 * 1000);
      engine.completeTask();

      // Task 4: 210s (3.5 min)
      vi.advanceTimersByTime(210 * 1000);
      engine.completeTask();

      // Earned Buffer should now be ACTIVE with exactly 180s (3 min)
      const run = engine.getCurrentRun()!;
      expect(run.taskRuns.length).toBe(5);
      const bufferTaskRun = run.taskRuns[4];
      expect(bufferTaskRun.isEarnedBuffer).toBe(true);
      expect(bufferTaskRun.status).toBe('active');
      expect(bufferTaskRun.allocatedSeconds).toBe(180);
      expect(bufferTaskRun.taskSnapshot.durationSeconds).toBe(180);
      expect(run.totalAllocatedSeconds).toBe(1200); // Planned template duration (4 * 300s), NOT inflated!

      let tick = engine.getTickData();
      expect(tick.timerState).toBe('RUNNING');
      expect(tick.taskAllocatedSeconds).toBe(180);
      expect(tick.taskRemainingSeconds).toBe(180);
      expect(tick.currentTaskIndex).toBe(4);
      expect(tick.paceDeltaSeconds).toBe(180); // Leading by 3 minutes at buffer start
      expect(tick.raceRemainingSeconds).toBe(180); // In sync with buffer duration

      // Advance 60s into the buffer: lead should decrement in real time
      vi.advanceTimersByTime(60 * 1000);
      tick = engine.getTickData();
      expect(tick.taskElapsedSeconds).toBe(60);
      expect(tick.taskRemainingSeconds).toBe(120);
      expect(tick.paceDeltaSeconds).toBe(120); // 180s - 60s = 120s (+02:00 lead)
      expect(tick.raceRemainingSeconds).toBe(120);

      // Advance another 120s (total 180s in buffer): buffer time fully consumed
      vi.advanceTimersByTime(120 * 1000);
      tick = engine.getTickData();
      expect(tick.taskElapsedSeconds).toBe(180);
      expect(tick.taskRemainingSeconds).toBe(0);
      expect(tick.paceDeltaSeconds).toBe(0); // Exactly on pace (180s - 180s = 0)
      expect(tick.raceRemainingSeconds).toBe(0);

      // Completing the Earned Buffer finishes the race
      engine.completeTask();
      expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
      expect(engine.getTickData().paceDeltaSeconds).toBe(0);
      expect(run.status).toBe('completed');
      expect(run.totalAllocatedSeconds).toBe(1200);
      expect(run.totalActualSeconds).toBe(1200); // 1020s on tasks + 180s buffer
      expect(run.totalOvertimeSeconds).toBe(0);
    });

    it('tracks negative pace variance and overtime when exceeding Earned Buffer duration', () => {
      const template: RaceTemplate = {
        ...mockTemplate,
        tasks: [
          { id: 't1', name: 'Task 1', durationSeconds: 60, order: 0, enabled: true },
        ],
      };

      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        allowOvertime: true,
        autoAdvance: false,
      });

      engine.initializeRun(template);
      engine.start();

      // Finish task 1 in 30s (+30s lead)
      vi.advanceTimersByTime(30 * 1000);
      engine.completeTask();

      // Earned Buffer unlocks with 30s
      let tick = engine.getTickData();
      expect(tick.currentTaskIndex).toBe(1);
      expect(tick.taskAllocatedSeconds).toBe(30);
      expect(tick.paceDeltaSeconds).toBe(30);

      // Run 50s total in buffer (30s allocated + 20s overtime)
      vi.advanceTimersByTime(50 * 1000);
      tick = engine.getTickData();
      expect(tick.taskOvertimeSeconds).toBe(20);
      expect(tick.paceDeltaSeconds).toBe(-20); // Trailing by 20s (30s - 50s = -20)
      expect(tick.raceOvertimeSeconds).toBe(20);

      // Finish race
      engine.completeTask();
      const run = engine.getCurrentRun()!;
      expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
      expect(engine.getTickData().paceDeltaSeconds).toBe(-20);
      expect(run.totalAllocatedSeconds).toBe(60); // 1 * 60s
      expect(run.totalActualSeconds).toBe(80); // 30s task + 50s buffer
      expect(run.totalOvertimeSeconds).toBe(20);
    });

    it('auto-disables buffer task without engaging if overall pace is trailing', () => {
      // 2 tasks of 60s each
      // Task 1: 90s (30s overtime)
      // Task 2: 60s (exact)
      // Net lead: -30s (trailing)
      const trailingTemplate: RaceTemplate = {
        ...mockTemplate,
        tasks: [
          { id: 't1', name: 'Task 1', durationSeconds: 60, order: 0, enabled: true },
          { id: 't2', name: 'Task 2', durationSeconds: 60, order: 1, enabled: true },
        ],
      };

      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        allowOvertime: true,
        autoAdvance: false,
      });

      engine.initializeRun(trailingTemplate);
      engine.start();

      vi.advanceTimersByTime(90 * 1000);
      engine.completeTask();

      vi.advanceTimersByTime(60 * 1000);
      engine.completeTask();

      // Buffer task should be skipped, 0 duration, and race completed immediately
      const run = engine.getCurrentRun()!;
      const bufferTask = run.taskRuns[2];
      expect(bufferTask.isEarnedBuffer).toBe(true);
      expect(bufferTask.status).toBe('skipped');
      expect(bufferTask.allocatedSeconds).toBe(0);
      expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
      expect(run.status).toBe('completed');
    });

    it('excludes skipped tasks from the accumulated lead time calculation', () => {
      const templateWithSkip: RaceTemplate = {
        ...mockTemplate,
        tasks: [
          { id: 't1', name: 'Skipped Task', durationSeconds: 300, order: 0, enabled: true },
          { id: 't2', name: 'Completed Task', durationSeconds: 300, order: 1, enabled: true },
        ],
      };

      engine.initializeRun(templateWithSkip);
      engine.start();

      // Skip task 1 (should NOT contribute 300s to buffer)
      engine.skipTask();

      // Task 2: complete after 200s (saving 100s)
      vi.advanceTimersByTime(200 * 1000);
      engine.completeTask();

      // Buffer task should have exactly 100s, not 400s
      const run = engine.getCurrentRun()!;
      const bufferTask = run.taskRuns[2];
      expect(bufferTask.isEarnedBuffer).toBe(true);
      expect(bufferTask.status).toBe('active');
      expect(bufferTask.allocatedSeconds).toBe(100);
    });

    it('does not append Earned Buffer task when earnedBufferEnabled is false in settings', () => {
      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        earnedBufferEnabled: false,
      });

      const run = engine.initializeRun(mockTemplate);
      expect(run.taskRuns.length).toBe(3);
      expect(run.taskRuns.some((t) => t.isEarnedBuffer)).toBe(false);

      engine.start();
      engine.completeTask();
      engine.completeTask();
      engine.completeTask();

      expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    });

    it('uses custom buffer task name configured in settings', () => {
      engine.updateSettings({
        ...DEFAULT_SETTINGS,
        earnedBufferEnabled: true,
        earnedBufferName: 'Victory Lap',
      });

      const run = engine.initializeRun(mockTemplate);
      const bufferTask = run.taskRuns[3];
      expect(bufferTask.isEarnedBuffer).toBe(true);
      expect(bufferTask.taskSnapshot.name).toBe('Victory Lap');
    });
  });
});
