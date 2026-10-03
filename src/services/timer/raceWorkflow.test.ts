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

  it('saves in-progress race state, allows starting and completing another race, then resumes first race from saved point', () => {
    const raceATemplate: RaceTemplate = {
      id: 'race-a',
      name: 'Main Long Race',
      category: 'Work',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 'a1', name: 'Task A1', durationSeconds: 60, order: 0, enabled: true },
        { id: 'a2', name: 'Task A2', durationSeconds: 120, order: 1, enabled: true },
        { id: 'a3', name: 'Task A3', durationSeconds: 180, order: 2, enabled: true },
      ],
    };

    const raceBTemplate: RaceTemplate = {
      id: 'race-b',
      name: 'Quick Interlude Race',
      category: 'Quick',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 'b1', name: 'Task B1', durationSeconds: 30, order: 0, enabled: true },
      ],
    };

    // 1. Start Race A
    engine.initializeRun(raceATemplate);
    engine.start();

    // Work on Task A1 for 50s and complete it
    vi.advanceTimersByTime(50000);
    engine.completeTask();

    // Run Task A2 for 40 seconds (80 seconds remaining out of 120s)
    vi.advanceTimersByTime(40000);
    expect(engine.getTickData().taskElapsedSeconds).toBe(40);
    expect(engine.getTickData().taskRemainingSeconds).toBe(80);

    // 2. User pauses & saves progress of Race A to resume later
    const savedRaceA = engine.pauseAndGetState();
    expect(savedRaceA).not.toBeNull();
    expect(savedRaceA!.currentTaskIndex).toBe(1);
    expect(savedRaceA!.taskRuns[0].status).toBe('completed');
    expect(savedRaceA!.taskRuns[0].actualSeconds).toBe(50);
    expect(savedRaceA!.timerState).toBe('PAUSED');
    expect(savedRaceA!.isExplicitlySaved).toBe(true);

    // 3. Start Race B, complete it, and finish
    engine.initializeRun(raceBTemplate);
    engine.start();
    vi.advanceTimersByTime(25000);
    engine.completeTask();
    engine.finishRace();
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    const runB = engine.getCurrentRun()!;
    expect(runB.status).toBe('completed');
    expect(runB.totalActualSeconds).toBe(25);

    // 4. Time passes while Race A is paused and saved (e.g. 15 minutes)
    vi.advanceTimersByTime(900000);

    // 5. Resume Race A from saved state
    engine.recover(savedRaceA!);
    const resumedData = engine.getTickData();
    expect(resumedData.timerState).toBe('PAUSED');
    expect(resumedData.currentTaskIndex).toBe(1);
    expect(resumedData.taskElapsedSeconds).toBe(40);
    expect(resumedData.taskRemainingSeconds).toBe(80);
    expect(resumedData.raceElapsedSeconds).toBe(90); // 50s from task 1 + 40s from task 2

    // 6. Resume running Race A
    engine.start();
    expect(engine.getTickData().timerState).toBe('RUNNING');

    // Run 70s on Task A2 (40s + 70s = 110s)
    vi.advanceTimersByTime(70000);
    expect(engine.getTickData().taskElapsedSeconds).toBe(110);
    engine.completeTask();

    // Complete Task A3 after 100s
    vi.advanceTimersByTime(100000);
    expect(engine.getTickData().taskElapsedSeconds).toBe(100);
    engine.completeTask();
    engine.finishRace();

    // 7. Verify Race A finished with 100% accurate time bookkeeping
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    const finalRunA = engine.getCurrentRun()!;
    expect(finalRunA.status).toBe('completed');
    expect(finalRunA.taskRuns[0].actualSeconds).toBe(50);
    expect(finalRunA.taskRuns[1].actualSeconds).toBe(110);
    expect(finalRunA.taskRuns[2].actualSeconds).toBe(100);
    expect(finalRunA.totalActualSeconds).toBe(260);
  });

  it('ensures completed race cannot be saved as active runtime state and triggers completion callback', () => {
    const testTemplate: RaceTemplate = {
      id: 'race-complete-cleanup',
      name: 'Single Task Race',
      category: 'Test',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 'task-1', name: 'Task 1', durationSeconds: 60, order: 0, enabled: true },
      ],
    };

    let completedRunResult: any = null;
    engine.setRaceCompletedCallback((run) => {
      completedRunResult = run;
    });

    engine.initializeRun(testTemplate);
    engine.start();

    // Advance 30s and complete the single task
    vi.advanceTimersByTime(30000);
    engine.completeTask();

    // When the last task completes, advanceToNextTask triggers finishRace()
    expect(engine.getTickData().timerState).toBe('RACE_COMPLETED');
    expect(completedRunResult).not.toBeNull();
    expect(completedRunResult.status).toBe('completed');

    // Engine must return null for runtime state once completed
    expect(engine.getCurrentRuntimeState()).toBeNull();
    expect(engine.pauseAndGetState()).toBeNull();
  });

  it('maintains independent Task Manager checklists when switching between races (e.g. Workout vs Cooking)', () => {
    const workoutTemplate: RaceTemplate = {
      id: 'race-workout',
      name: 'Workout Session',
      category: 'Fitness',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 'w1', name: 'Warm-up', durationSeconds: 300, order: 0, enabled: true },
        { id: 'w2', name: 'Main Sets', durationSeconds: 900, order: 1, enabled: true },
      ],
    };

    const cookingTemplate: RaceTemplate = {
      id: 'race-cooking',
      name: 'Cooking Session',
      category: 'Kitchen',
      tags: [],
      createdAt: '2026-09-24T00:00:00.000Z',
      updatedAt: '2026-09-24T00:00:00.000Z',
      tasks: [
        { id: 'c1', name: 'Prep', durationSeconds: 600, order: 0, enabled: true },
        { id: 'c2', name: 'Simmer', durationSeconds: 1200, order: 1, enabled: true },
      ],
    };

    // 1. Start Workout race and add checklist tasks
    engine.initializeRun(workoutTemplate);
    engine.start();

    const pushups = engine.addSessionTask('20 Push-ups');
    const squats = engine.addSessionTask('10 Squats');
    const plank = engine.addSessionTask('30-second plank');

    // Complete push-ups
    engine.toggleSessionTask(pushups!.id);

    // Save Workout session state and pause
    const savedWorkoutState = engine.pauseAndGetState();
    expect(savedWorkoutState).not.toBeNull();
    expect(savedWorkoutState?.sessionTasks?.length).toBe(3);
    expect(savedWorkoutState?.sessionTasks?.find((t) => t.id === pushups!.id)?.completed).toBe(true);
    expect(savedWorkoutState?.sessionTasks?.find((t) => t.id === squats!.id)?.completed).toBe(false);

    // 2. Switch to Cooking race: verify it starts with an empty task list
    engine.clearCurrentRun();
    engine.initializeRun(cookingTemplate);
    engine.start();

    expect(engine.getCurrentRun()?.sessionTasks).toEqual([]);

    // Add Cooking checklist tasks
    const chopOnions = engine.addSessionTask('Chop onions');
    const boilWater = engine.addSessionTask('Boil water');
    expect(boilWater?.completed).toBe(false);
    engine.toggleSessionTask(chopOnions!.id);

    expect(engine.getCurrentRun()?.sessionTasks?.length).toBe(2);

    // Complete cooking race
    engine.completeTask(); // Prep done
    engine.completeTask(); // Simmer done -> finishes race

    const finishedCookingRun = engine.getCurrentRun()!;
    expect(finishedCookingRun.status).toBe('completed');
    expect(finishedCookingRun.sessionTasks?.length).toBe(2);
    expect(finishedCookingRun.sessionTasks?.[0].title).toBe('Chop onions');
    expect(finishedCookingRun.sessionTasks?.[0].completed).toBe(true);

    // 3. Switch back and resume Workout race
    engine.clearCurrentRun();
    engine.recover(savedWorkoutState!);

    const resumedWorkoutRun = engine.getCurrentRun()!;
    expect(resumedWorkoutRun.templateSnapshot.name).toBe('Workout Session');
    expect(resumedWorkoutRun.sessionTasks?.length).toBe(3);

    // Verify Workout tasks and states were preserved intact
    const resumedPushups = resumedWorkoutRun.sessionTasks?.find((t) => t.id === pushups!.id);
    const resumedSquats = resumedWorkoutRun.sessionTasks?.find((t) => t.id === squats!.id);
    const resumedPlank = resumedWorkoutRun.sessionTasks?.find((t) => t.id === plank!.id);

    expect(resumedPushups?.completed).toBe(true);
    expect(resumedSquats?.completed).toBe(false);
    expect(resumedPlank?.completed).toBe(false);

    // Complete the squats in the resumed workout
    engine.toggleSessionTask(squats!.id);
    expect(engine.getCurrentRun()?.sessionTasks?.find((t) => t.id === squats!.id)?.completed).toBe(true);

    // Finish Workout race and verify sessionTasks are preserved in the final run
    engine.finishRace();
    const finalWorkoutRun = engine.getCurrentRun()!;
    expect(finalWorkoutRun.status).toBe('completed');
    expect(finalWorkoutRun.sessionTasks?.length).toBe(3);
    expect(finalWorkoutRun.sessionTasks?.filter((t) => t.completed).length).toBe(2);
  });
});
