import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerEngine } from './timerEngine';
import { DEFAULT_SETTINGS, SEED_TEMPLATES } from '../storage/seedData';
import { RaceTemplate } from '../../types/race';

describe('Race Workflow and Snapshot Integrity', () => {
  let engine: TimerEngine;

  beforeEach(() => {
    vi.useFakeTimers();
    engine = new TimerEngine(DEFAULT_SETTINGS);
  });

  afterEach(() => {
    engine.destroy();
    vi.useRealTimers();
  });

  it('preserves template snapshot in run when template is modified afterward', () => {
    const originalTemplate: RaceTemplate = JSON.parse(JSON.stringify(SEED_TEMPLATES[0]));
    const run = engine.initializeRun(originalTemplate);

    expect(run.templateSnapshot.name).toBe(originalTemplate.name);

    // Modify the original template
    originalTemplate.name = 'Renamed Template After Run Started';
    originalTemplate.tasks[0].durationSeconds = 99999;

    // Run snapshot must remain completely unaffected
    expect(run.templateSnapshot.name).toBe('Google L5 Coding & Algorithms Practice');
    expect(run.templateSnapshot.tasks[0].durationSeconds).toBe(300);
  });

  it('accurately tracks full race progression across multiple tasks and calculates time variances', () => {
    const testTemplate: RaceTemplate = {
      id: 'race-multi-test',
      name: 'Sprint Race',
      category: 'Speed',
      tags: ['Test'],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 't1', name: 'Task 1', durationSeconds: 60, order: 0, enabled: true },
        { id: 't2', name: 'Task 2', durationSeconds: 120, order: 1, enabled: true },
      ],
    };

    engine.initializeRun(testTemplate);
    engine.start();

    // Work on Task 1 for 45s (saving 15s)
    vi.advanceTimersByTime(45000);
    engine.completeTask();

    let run = engine.getCurrentRun()!;
    expect(run.taskRuns[0].status).toBe('completed');
    expect(run.taskRuns[0].actualSeconds).toBe(45);
    expect(run.taskRuns[0].overtimeSeconds).toBe(0);

    // Work on Task 2 for 130s (10s overtime)
    vi.advanceTimersByTime(130000);
    engine.completeTask();

    run = engine.getCurrentRun()!;
    expect(run.taskRuns[1].status).toBe('completed');
    expect(run.taskRuns[1].actualSeconds).toBe(130);
    expect(run.taskRuns[1].overtimeSeconds).toBe(10);

    // Race should now be completed
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    expect(run.status).toBe('completed');
    expect(run.totalActualSeconds).toBe(175); // 45s + 130s
    expect(run.totalAllocatedSeconds).toBe(180); // 60s + 120s
  });

  it('handles pause intervals during race accurately without corrupting task or race totals', () => {
    const testTemplate: RaceTemplate = {
      id: 'race-pause-test',
      name: 'Pause Race',
      category: 'Test',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [{ id: 't1', name: 'Task 1', durationSeconds: 100, order: 0, enabled: true }],
    };

    engine.initializeRun(testTemplate);
    engine.start();

    vi.advanceTimersByTime(10000); // 10s running
    engine.pause();
    vi.advanceTimersByTime(25000); // 25s paused
    engine.start(); // resume
    vi.advanceTimersByTime(15000); // 15s running

    const data = engine.getTickData();
    expect(data.taskElapsedSeconds).toBe(25); // 10 + 15
    expect(data.raceElapsedSeconds).toBe(25);
    expect(data.totalPausedSeconds).toBe(25);

    engine.finishRace();
    const run = engine.getCurrentRun()!;
    expect(run.totalActualSeconds).toBe(25);
    expect(run.totalPausedSeconds).toBe(25);
  });
});
