import { RaceTemplate, RaceRun, RaceHabitMetric, DailyHabitActivity, HabitTrackerSummary } from '../types/race';
import { getLocalDateKey } from './dateUtils';

/**
 * Parses a 'YYYY-MM-DD' calendar date string safely into a local Date object at 00:00:00.
 */
export function parseLocalDateKey(dateKey: string): Date {
  const [yearStr, monthStr, dayStr] = dateKey.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Adds or subtracts calendar days from a 'YYYY-MM-DD' key, returning a new 'YYYY-MM-DD' key.
 */
export function addDaysToDateKey(dateKey: string, deltaDays: number): string {
  const date = parseLocalDateKey(dateKey);
  date.setDate(date.getDate() + deltaDays);
  return getLocalDateKey(date);
}

/**
 * Calculates the inclusive calendar days that have passed from startDateStr to endDateStr.
 * Guarantees a minimum of 1 day even if the start date is today or set in the future.
 *
 * Example:
 * If start is '2026-10-23' and today is '2026-10-23' -> 1 day.
 * If start is '2026-10-22' and today is '2026-10-23' -> 2 days.
 */
export function calculateDaysPassed(
  startDateStr: string,
  endDateStr: string = getLocalDateKey()
): number {
  if (!startDateStr) return 1;
  const start = parseLocalDateKey(startDateStr);
  const end = parseLocalDateKey(endDateStr);

  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 1;
  return diffDays + 1;
}

/**
 * Generates an array of all date keys between start and end (inclusive).
 */
export function getDateKeyRange(startDateStr: string, endDateStr: string = getLocalDateKey()): string[] {
  const result: string[] = [];
  if (!startDateStr) return [endDateStr];

  let current = startDateStr;
  const days = calculateDaysPassed(startDateStr, endDateStr);

  for (let i = 0; i < days; i++) {
    result.push(current);
    current = addDaysToDateKey(current, 1);
  }
  return result;
}

/**
 * Calculates the current active streak and all-time best streak in days for a set of completed date keys.
 *
 * Streak rules:
 * - If completed today: current streak = 1 + consecutive previous days.
 * - If not yet completed today, but was completed yesterday: streak is preserved (pending today's completion).
 * - If missed yesterday and not completed today: current streak = 0.
 * - Best streak is the maximum unbroken sequence of consecutive calendar days.
 */
export function calculateStreaks(
  completedDates: Set<string>,
  startDateStr: string,
  todayKey: string = getLocalDateKey()
): { currentStreak: number; bestStreak: number; isPendingToday: boolean } {
  if (completedDates.size === 0) {
    return { currentStreak: 0, bestStreak: 0, isPendingToday: false };
  }

  const yesterdayKey = addDaysToDateKey(todayKey, -1);
  const doneToday = completedDates.has(todayKey);
  const doneYesterday = completedDates.has(yesterdayKey);

  let currentStreak = 0;
  let isPendingToday = false;

  if (doneToday) {
    currentStreak = 1;
    let prev = yesterdayKey;
    while (completedDates.has(prev) && (!startDateStr || prev >= startDateStr)) {
      currentStreak++;
      prev = addDaysToDateKey(prev, -1);
    }
  } else if (doneYesterday) {
    // Streak is preserved pending today's run
    isPendingToday = true;
    currentStreak = 1;
    let prev = addDaysToDateKey(yesterdayKey, -1);
    while (completedDates.has(prev) && (!startDateStr || prev >= startDateStr)) {
      currentStreak++;
      prev = addDaysToDateKey(prev, -1);
    }
  } else {
    currentStreak = 0;
  }

  // Calculate best streak across all completed dates
  const sortedDates = Array.from(completedDates).sort();
  let bestStreak = 0;
  let currentRunStreak = 0;
  let previousDateKey: string | null = null;

  for (const dateKey of sortedDates) {
    if (startDateStr && dateKey < startDateStr) continue;

    if (!previousDateKey) {
      currentRunStreak = 1;
    } else {
      const expectedNext = addDaysToDateKey(previousDateKey, 1);
      if (dateKey === expectedNext) {
        currentRunStreak++;
      } else if (dateKey === previousDateKey) {
        // Same day completion, streak continues without incrementing
      } else {
        currentRunStreak = 1;
      }
    }

    if (currentRunStreak > bestStreak) {
      bestStreak = currentRunStreak;
    }
    previousDateKey = dateKey;
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak), isPendingToday };
}

/**
 * Calculates habit consistency metrics for all race templates.
 */
export function calculateRaceHabits(
  templates: RaceTemplate[],
  runs: RaceRun[],
  startDateStr: string,
  todayKey: string = getLocalDateKey()
): RaceHabitMetric[] {
  const daysPassed = calculateDaysPassed(startDateStr, todayKey);

  return templates.map((template) => {
    // 1. Gather all dates this race was completed
    const completedDates = new Set<string>();
    let totalActualSeconds = 0;
    let totalRunsCount = 0;

    // From completed historical runs
    for (const run of runs) {
      if (run.templateId === template.id && run.status === 'completed') {
        const timestamp = run.completedAt || run.startedAt;
        if (timestamp) {
          const runDateKey = getLocalDateKey(new Date(timestamp));
          if (!startDateStr || (runDateKey >= startDateStr && runDateKey <= todayKey)) {
            completedDates.add(runDateKey);
            totalActualSeconds += run.totalActualSeconds || 0;
            totalRunsCount++;
          }
        }
      }
    }

    // From direct manualDoneDate toggle on the template
    if (template.manualDoneDate) {
      if (!startDateStr || (template.manualDoneDate >= startDateStr && template.manualDoneDate <= todayKey)) {
        completedDates.add(template.manualDoneDate);
      }
    }

    const doneDaysCount = completedDates.size;
    const completionRate = Math.min(100, Math.round((doneDaysCount / daysPassed) * 100));

    // Calculate streaks
    const { currentStreak, bestStreak } = calculateStreaks(completedDates, startDateStr, todayKey);

    // Is it done today?
    const isDoneToday = completedDates.has(todayKey);

    // Generate recent 7 days sparkline
    const recent7Days: { dateKey: string; completed: boolean }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dKey = addDaysToDateKey(todayKey, -i);
      recent7Days.push({
        dateKey: dKey,
        completed: completedDates.has(dKey),
      });
    }

    // Determine latest completed date
    const sortedCompleted = Array.from(completedDates).sort();
    const lastCompletedDate = sortedCompleted.length > 0 ? sortedCompleted[sortedCompleted.length - 1] : undefined;

    // Total allocated duration for the race
    const totalAllocatedSeconds = template.tasks
      .filter((t) => t.enabled)
      .reduce((sum, t) => sum + t.durationSeconds, 0);

    return {
      templateId: template.id,
      name: template.name,
      category: template.category || 'General',
      tags: template.tags || [],
      taskCount: template.tasks.filter((t) => t.enabled).length || template.tasks.length,
      totalAllocatedSeconds,
      doneDaysCount,
      daysPassed,
      completionRate,
      totalRunsCount,
      totalActualSeconds,
      currentStreak,
      bestStreak,
      isDoneToday,
      recent7Days,
      lastCompletedDate,
      isArchived: Boolean(template.isArchived),
    };
  });
}

/**
 * Aggregates daily activity (completed races, total runs, total duration) for graphs and heatmaps.
 */
export function calculateDailyActivities(
  templates: RaceTemplate[],
  runs: RaceRun[],
  startDateStr: string,
  endDateStr: string = getLocalDateKey()
): DailyHabitActivity[] {
  const dateKeys = getDateKeyRange(startDateStr, endDateStr);
  const activityMap = new Map<string, { completedRaces: Set<string>; runsCount: number; seconds: number }>();

  // Initialize all days in range
  for (const dKey of dateKeys) {
    activityMap.set(dKey, {
      completedRaces: new Set<string>(),
      runsCount: 0,
      seconds: 0,
    });
  }

  // Populate from runs
  for (const run of runs) {
    if (run.status === 'completed') {
      const timestamp = run.completedAt || run.startedAt;
      if (timestamp) {
        const dKey = getLocalDateKey(new Date(timestamp));
        const entry = activityMap.get(dKey);
        if (entry) {
          const raceName = run.templateSnapshot?.name || 'Race';
          entry.completedRaces.add(raceName);
          entry.runsCount++;
          entry.seconds += run.totalActualSeconds || 0;
        }
      }
    }
  }

  // Populate from templates marked manualDoneDate
  for (const t of templates) {
    if (t.manualDoneDate) {
      const entry = activityMap.get(t.manualDoneDate);
      if (entry) {
        entry.completedRaces.add(t.name);
      }
    }
  }

  return dateKeys.map((dateKey) => {
    const entry = activityMap.get(dateKey) || {
      completedRaces: new Set<string>(),
      runsCount: 0,
      seconds: 0,
    };

    return {
      dateKey,
      completedRacesCount: entry.completedRaces.size,
      totalRunsCount: entry.runsCount,
      totalSeconds: entry.seconds,
      raceNames: Array.from(entry.completedRaces),
    };
  });
}

/**
 * Calculates high-level summary KPIs for the habit tracker dashboard.
 */
export function calculateHabitSummary(
  metrics: RaceHabitMetric[]
): HabitTrackerSummary {
  const activeMetrics = metrics.filter((m) => !m.isArchived);

  const totalRaces = metrics.length;
  const activeRaces = activeMetrics.length;

  const totalConsistency = activeMetrics.reduce((sum, m) => sum + m.completionRate, 0);
  const overallConsistencyRate = activeRaces > 0 ? Math.round(totalConsistency / activeRaces) : 0;

  const maxCurrentStreak = activeMetrics.reduce((max, m) => Math.max(max, m.currentStreak), 0);
  const bestHistoricalStreak = activeMetrics.reduce((max, m) => Math.max(max, m.bestStreak), 0);
  const totalRunsCompleted = activeMetrics.reduce((sum, m) => sum + m.totalRunsCount, 0);
  const totalFocusSeconds = activeMetrics.reduce((sum, m) => sum + m.totalActualSeconds, 0);
  const racesDoneTodayCount = activeMetrics.filter((m) => m.isDoneToday).length;

  return {
    totalRaces,
    activeRaces,
    overallConsistencyRate,
    maxCurrentStreak,
    bestHistoricalStreak,
    totalRunsCompleted,
    totalFocusSeconds,
    racesDoneTodayCount,
  };
}
