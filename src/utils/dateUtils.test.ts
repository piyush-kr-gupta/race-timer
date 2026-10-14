import { describe, it, expect } from 'vitest';
import {
  getLocalDateKey,
  isSameLocalDay,
  isRunCompletedToday,
  isTemplateDoneToday,
  isPastCutoffTime,
  formatCutoffTimeDisplay,
} from './dateUtils';
import { RaceTemplate, RaceRun } from '../types/race';

describe('dateUtils', () => {
  const dummyTemplate: RaceTemplate = {
    id: 'race-1',
    name: 'Morning Workout',
    category: 'Fitness',
    tags: [],
    tasks: [],
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    isArchived: false,
  };

  const createDummyRun = (overrides?: Partial<RaceRun>): RaceRun => ({
    id: 'run-1',
    templateId: 'race-1',
    templateSnapshot: dummyTemplate,
    startedAt: '2026-10-12T08:00:00.000Z',
    completedAt: '2026-10-12T08:45:00.000Z',
    status: 'completed',
    totalAllocatedSeconds: 2700,
    totalActualSeconds: 2700,
    totalOvertimeSeconds: 0,
    totalPausedSeconds: 0,
    taskRuns: [],
    ...overrides,
  });

  describe('getLocalDateKey', () => {
    it('formats dates as YYYY-MM-DD in local time', () => {
      const d = new Date(2026, 9, 12, 14, 30); // month is 0-indexed: 9 = October
      expect(getLocalDateKey(d)).toBe('2026-10-12');
    });

    it('pads single-digit months and days with zeroes', () => {
      const d = new Date(2026, 0, 5); // Jan 5
      expect(getLocalDateKey(d)).toBe('2026-01-05');
    });
  });

  describe('isSameLocalDay', () => {
    it('returns true for same day different times', () => {
      const d1 = new Date(2026, 9, 12, 8, 0);
      const d2 = new Date(2026, 9, 12, 23, 59);
      expect(isSameLocalDay(d1, d2)).toBe(true);
    });

    it('returns false for different days', () => {
      const d1 = new Date(2026, 9, 12, 23, 59);
      const d2 = new Date(2026, 9, 13, 0, 1);
      expect(isSameLocalDay(d1, d2)).toBe(false);
    });
  });

  describe('isRunCompletedToday', () => {
    it('returns true when run completed today', () => {
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
        status: 'completed',
      });
      expect(isRunCompletedToday(run, '2026-10-12')).toBe(true);
    });

    it('returns false when run completed on a different day', () => {
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 11, 10, 0).toISOString(),
        status: 'completed',
      });
      expect(isRunCompletedToday(run, '2026-10-12')).toBe(false);
    });

    it('returns false when run is not completed (e.g. running or abandoned)', () => {
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
        status: 'abandoned',
      });
      expect(isRunCompletedToday(run, '2026-10-12')).toBe(false);
    });
  });

  describe('isTemplateDoneToday', () => {
    it('returns false if race is archived even if completed today', () => {
      const archivedTemplate: RaceTemplate = { ...dummyTemplate, isArchived: true };
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
      });
      expect(isTemplateDoneToday(archivedTemplate, [run], '2026-10-12')).toBe(false);
    });

    it('returns true if template has completed run today', () => {
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
      });
      expect(isTemplateDoneToday(dummyTemplate, [run], '2026-10-12')).toBe(true);
    });

    it('returns false if completed run was yesterday', () => {
      const yesterdayRun = createDummyRun({
        completedAt: new Date(2026, 9, 11, 20, 0).toISOString(),
      });
      expect(isTemplateDoneToday(dummyTemplate, [yesterdayRun], '2026-10-12')).toBe(false);
    });

    it('transitions to false when next day arrives', () => {
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
      });
      // On Oct 12: Done for today
      expect(isTemplateDoneToday(dummyTemplate, [run], '2026-10-12')).toBe(true);
      // On Oct 13: Automatically Active again!
      expect(isTemplateDoneToday(dummyTemplate, [run], '2026-10-13')).toBe(false);
    });

    it('respects manualDoneDate override', () => {
      const manualDoneTemplate: RaceTemplate = {
        ...dummyTemplate,
        manualDoneDate: '2026-10-12',
      };
      // No runs, but manualDoneDate is set for today
      expect(isTemplateDoneToday(manualDoneTemplate, [], '2026-10-12')).toBe(true);
      // Next day arrives: manualDoneDate expires automatically!
      expect(isTemplateDoneToday(manualDoneTemplate, [], '2026-10-13')).toBe(false);
    });

    it('respects manualActiveDate override even if run exists today', () => {
      const manualActiveTemplate: RaceTemplate = {
        ...dummyTemplate,
        manualActiveDate: '2026-10-12',
      };
      const run = createDummyRun({
        completedAt: new Date(2026, 9, 12, 10, 0).toISOString(),
      });
      // User moved it back to Active today
      expect(isTemplateDoneToday(manualActiveTemplate, [run], '2026-10-12')).toBe(false);
    });
  });

  describe('isPastCutoffTime', () => {
    it('returns true when current time is at or past cutoff time', () => {
      // 9:00 PM (21:00) exactly
      const atNine = new Date(2026, 9, 14, 21, 0);
      expect(isPastCutoffTime('21:00', atNine)).toBe(true);

      // 9:15 PM (21:15)
      const afterNine = new Date(2026, 9, 14, 21, 15);
      expect(isPastCutoffTime('21:00', afterNine)).toBe(true);

      // 11:45 PM (23:45)
      const lateNight = new Date(2026, 9, 14, 23, 45);
      expect(isPastCutoffTime('21:00', lateNight)).toBe(true);
    });

    it('returns false when current time is before cutoff time', () => {
      // 8:59 PM (20:59)
      const beforeNine = new Date(2026, 9, 14, 20, 59);
      expect(isPastCutoffTime('21:00', beforeNine)).toBe(false);

      // Morning 10:30 AM
      const morning = new Date(2026, 9, 14, 10, 30);
      expect(isPastCutoffTime('21:00', morning)).toBe(false);
    });

    it('handles custom cutoff times accurately', () => {
      const tenThirty = new Date(2026, 9, 14, 22, 30);
      expect(isPastCutoffTime('22:00', tenThirty)).toBe(true);
      expect(isPastCutoffTime('22:45', tenThirty)).toBe(false);
    });
  });

  describe('formatCutoffTimeDisplay', () => {
    it('formats 24h string into 12h AM/PM display string', () => {
      expect(formatCutoffTimeDisplay('21:00')).toBe('9:00 PM');
      expect(formatCutoffTimeDisplay('21:30')).toBe('9:30 PM');
      expect(formatCutoffTimeDisplay('09:00')).toBe('9:00 AM');
      expect(formatCutoffTimeDisplay('12:00')).toBe('12:00 PM');
      expect(formatCutoffTimeDisplay('00:00')).toBe('12:00 AM');
    });
  });
});
