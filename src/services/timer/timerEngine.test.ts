import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from './timerEngine';
import { audio } from './audioService';
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
    expect(run.taskRuns.length).toBe(3);

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

  it('auto-advances when task expires with autoAdvance enabled', () => {
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
    expect(run.taskRuns[0].status).toBe('expired');
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

    // Race finishes: net variance = +20 (Task 1) - 30 (Task 2) + 35 (Task 3) = +25s
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    expect(engine.getTickData().paceDeltaSeconds).toBe(25);
  });
});
