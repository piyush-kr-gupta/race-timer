import { describe, it, expect } from 'vitest';
import {
  calculateDaysPassed,
  addDaysToDateKey,
  getDateKeyRange,
  calculateStreaks,
  calculateRaceHabits,
  calculateDailyActivities,
  calculateHabitSummary,
} from './habitAnalytics';
import { RaceTemplate, RaceRun } from '../types/race';

describe('habitAnalytics', () => {
  describe('calculateDaysPassed', () => {
    it('returns 1 when start date equals end date (Day 1)', () => {
      expect(calculateDaysPassed('2026-10-23', '2026-10-23')).toBe(1);
    });

    it('returns correct days passed for multiple calendar days', () => {
      expect(calculateDaysPassed('2026-10-22', '2026-10-23')).toBe(2);
      expect(calculateDaysPassed('2026-10-01', '2026-10-23')).toBe(23);
      expect(calculateDaysPassed('2026-09-01', '2026-10-23')).toBe(53);
    });

    it('safely guards against future start dates by returning 1', () => {
      expect(calculateDaysPassed('2026-10-25', '2026-10-23')).toBe(1);
    });

    it('handles empty string gracefully', () => {
      expect(calculateDaysPassed('', '2026-10-23')).toBe(1);
    });
  });

  describe('addDaysToDateKey & getDateKeyRange', () => {
    it('adds and subtracts days correctly', () => {
      expect(addDaysToDateKey('2026-10-23', 1)).toBe('2026-10-24');
      expect(addDaysToDateKey('2026-10-23', -1)).toBe('2026-10-22');
      expect(addDaysToDateKey('2026-10-01', -1)).toBe('2026-09-30');
    });

    it('generates an inclusive range of date keys', () => {
      const range = getDateKeyRange('2026-10-20', '2026-10-23');
      expect(range).toEqual(['2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23']);
    });
  });

  describe('calculateStreaks', () => {
    const today = '2026-10-23';

    it('returns 0 for empty completion set', () => {
      const { currentStreak, bestStreak, isPendingToday } = calculateStreaks(
        new Set<string>(),
        '2026-10-01',
        today
      );
      expect(currentStreak).toBe(0);
      expect(bestStreak).toBe(0);
      expect(isPendingToday).toBe(false);
    });

    it('calculates active streak when completed today', () => {
      // Completed Oct 21, 22, 23 (3 days)
      const dates = new Set(['2026-10-21', '2026-10-22', '2026-10-23']);
      const { currentStreak, bestStreak, isPendingToday } = calculateStreaks(dates, '2026-10-01', today);
      expect(currentStreak).toBe(3);
      expect(bestStreak).toBe(3);
      expect(isPendingToday).toBe(false);
    });

    it('preserves streak when completed yesterday but pending today', () => {
      // Completed Oct 20, 21, 22 (pending today Oct 23)
      const dates = new Set(['2026-10-20', '2026-10-21', '2026-10-22']);
      const { currentStreak, bestStreak, isPendingToday } = calculateStreaks(dates, '2026-10-01', today);
      expect(currentStreak).toBe(3);
      expect(bestStreak).toBe(3);
      expect(isPendingToday).toBe(true);
    });

    it('resets streak to 0 if missed yesterday and today', () => {
      // Completed Oct 19, 20 (missed Oct 21, 22, 23)
      const dates = new Set(['2026-10-19', '2026-10-20']);
      const { currentStreak, bestStreak, isPendingToday } = calculateStreaks(dates, '2026-10-01', today);
      expect(currentStreak).toBe(0);
      expect(bestStreak).toBe(2);
      expect(isPendingToday).toBe(false);
    });

    it('maintains highest all-time best streak', () => {
      // Ran 5 days in early October, then 2 days recently
      const dates = new Set([
        '2026-10-02',
        '2026-10-03',
        '2026-10-04',
        '2026-10-05',
        '2026-10-06',
        '2026-10-22',
        '2026-10-23',
      ]);
      const { currentStreak, bestStreak } = calculateStreaks(dates, '2026-10-01', today);
      expect(currentStreak).toBe(2);
      expect(bestStreak).toBe(5);
    });
  });

  describe('calculateRaceHabits', () => {
    const mockTemplate: RaceTemplate = {
      id: 'race-1',
      name: 'Morning Workout',
      category: 'Fitness',
      tags: ['Health'],
      createdAt: '2026-10-01T00:00:00.000Z',
      updatedAt: '2026-10-01T00:00:00.000Z',
      tasks: [
        { id: 't1', name: 'Stretch', durationSeconds: 300, order: 0, enabled: true },
        { id: 't2', name: 'HIIT', durationSeconds: 600, order: 1, enabled: true },
      ],
    };

    const mockRuns: RaceRun[] = [
      {
        id: 'run-1',
        templateId: 'race-1',
        templateSnapshot: mockTemplate,
        startedAt: '2026-10-21T08:00:00.000Z',
        completedAt: '2026-10-21T08:15:00.000Z',
        status: 'completed',
        totalAllocatedSeconds: 900,
        totalActualSeconds: 900,
        totalOvertimeSeconds: 0,
        totalPausedSeconds: 0,
        taskRuns: [],
      },
      {
        id: 'run-2',
        templateId: 'race-1',
        templateSnapshot: mockTemplate,
        startedAt: '2026-10-22T08:00:00.000Z',
        completedAt: '2026-10-22T08:15:00.000Z',
        status: 'completed',
        totalAllocatedSeconds: 900,
        totalActualSeconds: 900,
        totalOvertimeSeconds: 0,
        totalPausedSeconds: 0,
        taskRuns: [],
      },
    ];

    it('computes accurate done/daysPassed ratio and streaks', () => {
      const today = '2026-10-23';
      const startDate = '2026-10-20'; // 4 days passed: Oct 20, 21, 22, 23

      const metrics = calculateRaceHabits([mockTemplate], mockRuns, startDate, today);
      expect(metrics).toHaveLength(1);

      const m = metrics[0];
      expect(m.templateId).toBe('race-1');
      expect(m.name).toBe('Morning Workout');
      expect(m.daysPassed).toBe(4);
      expect(m.doneDaysCount).toBe(2); // Oct 21 and 22
      expect(m.completionRate).toBe(50); // 2/4 = 50%
      expect(m.currentStreak).toBe(2); // Pending today, completed Oct 21 & 22
      expect(m.isDoneToday).toBe(false);
      expect(m.recent7Days).toHaveLength(7);
    });

    it('counts manualDoneDate as completed day', () => {
      const templateWithManualDone: RaceTemplate = {
        ...mockTemplate,
        manualDoneDate: '2026-10-23',
      };

      const metrics = calculateRaceHabits([templateWithManualDone], mockRuns, '2026-10-20', '2026-10-23');
      const m = metrics[0];
      expect(m.doneDaysCount).toBe(3); // Oct 21, 22, 23
      expect(m.isDoneToday).toBe(true);
      expect(m.currentStreak).toBe(3);
    });
  });

  describe('calculateDailyActivities & calculateHabitSummary', () => {
    it('aggregates daily activities and computes summary KPIs correctly', () => {
      const template: RaceTemplate = {
        id: 'race-1',
        name: 'Coding Practice',
        category: 'Interview',
        tags: [],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        tasks: [{ id: 't1', name: 'Algo', durationSeconds: 1800, order: 0, enabled: true }],
      };

      const runs: RaceRun[] = [
        {
          id: 'r1',
          templateId: 'race-1',
          templateSnapshot: template,
          startedAt: '2026-10-22T10:00:00.000Z',
          completedAt: '2026-10-22T10:30:00.000Z',
          status: 'completed',
          totalAllocatedSeconds: 1800,
          totalActualSeconds: 1800,
          totalOvertimeSeconds: 0,
          totalPausedSeconds: 0,
          taskRuns: [],
        },
      ];

      const daily = calculateDailyActivities([template], runs, '2026-10-20', '2026-10-23');
      expect(daily).toHaveLength(4);
      const day22 = daily.find((d) => d.dateKey === '2026-10-22');
      expect(day22?.completedRacesCount).toBe(1);
      expect(day22?.totalSeconds).toBe(1800);

      const metrics = calculateRaceHabits([template], runs, '2026-10-20', '2026-10-23');
      const summary = calculateHabitSummary(metrics);

      expect(summary.totalRaces).toBe(1);
      expect(summary.activeRaces).toBe(1);
      expect(summary.totalFocusSeconds).toBe(1800);
      expect(summary.totalRunsCompleted).toBe(1);
    });
  });
});
