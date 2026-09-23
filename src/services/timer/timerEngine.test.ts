import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from './timerEngine';
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
    engine = new TimerEngine(DEFAULT_SETTINGS);
  });

  afterEach(() => {
    engine.destroy();
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
});
