import { RaceTemplate, RaceRun } from '../types/race';

/**
 * Returns a local calendar date string key in 'YYYY-MM-DD' format.
 */
export function getLocalDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether two dates fall on the exact same local calendar day.
 */
export function isSameLocalDay(d1: Date, d2: Date): boolean {
  return getLocalDateKey(d1) === getLocalDateKey(d2);
}

/**
 * Checks whether a specific race run was completed on today's local date.
 */
export function isRunCompletedToday(
  run: RaceRun,
  todayKey: string = getLocalDateKey()
): boolean {
  if (run.status !== 'completed') return false;
  const timestamp = run.completedAt || run.startedAt;
  if (!timestamp) return false;
  return getLocalDateKey(new Date(timestamp)) === todayKey;
}

/**
 * Determines whether a race template is considered "Done for Today".
 *
 * Rules:
 * 1. Archived templates are not "Done for Today" (they belong to "Archived").
 * 2. If explicitly marked as active today (manualActiveDate === todayKey), returns false.
 * 3. If explicitly marked as done today (manualDoneDate === todayKey), returns true.
 * 4. Otherwise, returns true if there is at least one completed run for this template on today's local date.
 *
 * When the next calendar day arrives (todayKey changes), all checks against todayKey
 * automatically evaluate to false unless new runs are completed on that new day,
 * naturally moving races back to "Active".
 */
export function isTemplateDoneToday(
  template: RaceTemplate,
  runs: RaceRun[],
  todayKey: string = getLocalDateKey()
): boolean {
  if (template.isArchived) return false;
  if (template.manualActiveDate === todayKey) return false;
  if (template.manualDoneDate === todayKey) return true;

  return runs.some((run) => {
    if (run.templateId !== template.id || run.status !== 'completed') return false;
    const runTimestamp = run.completedAt || run.startedAt;
    if (!runTimestamp) return false;
    return getLocalDateKey(new Date(runTimestamp)) === todayKey;
  });
}

/**
 * Checks whether a given date/time is at or past a cutoff time string in 'HH:MM' (24-hour) format.
 * Defaults to '21:00' (9:00 PM).
 */
export function isPastCutoffTime(cutoffTimeStr: string = '21:00', date: Date = new Date()): boolean {
  if (!cutoffTimeStr) return false;
  const parts = cutoffTimeStr.split(':');
  const cutoffHour = parseInt(parts[0], 10);
  const cutoffMinute = parseInt(parts[1] || '0', 10);

  if (isNaN(cutoffHour)) return false;

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const cutoffMinutes = cutoffHour * 60 + (isNaN(cutoffMinute) ? 0 : cutoffMinute);

  return currentMinutes >= cutoffMinutes;
}

/**
 * Formats a 24-hour 'HH:MM' time string into friendly 12-hour format, e.g. '21:00' -> '9:00 PM'.
 */
export function formatCutoffTimeDisplay(cutoffTimeStr: string = '21:00'): string {
  if (!cutoffTimeStr) return '9:00 PM';
  const parts = cutoffTimeStr.split(':');
  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1] || '0', 10);
  if (isNaN(hour)) return '9:00 PM';

  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute.toString().padStart(2, '0');
  return `${displayHour}:${displayMinute} ${ampm}`;
}
