/**
 * Duration parsing and formatting utilities for Race Timer.
 * Normalizes all durations to integer seconds.
 */

/**
 * Parses user input string into integer seconds.
 * Supports:
 * - "5" -> 300 (minutes by default for human task planning)
 * - "5m", "5min", "5mins" -> 300
 * - "5:00", "05:00" -> 300
 * - "1h", "1hr" -> 3600
 * - "1:30:00" -> 5400
 * - "90s", "90sec" -> 90
 * - "90" -> 5400 (or if > 180, treated as seconds, e.g. 300 -> 300)
 * - "1h 30m", "1h30m", "1.5h" -> 5400
 * - "45s" -> 45
 * - "0:45" -> 45
 */
export function parseDurationToSeconds(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') {
    if (isNaN(input) || input < 0) return 0;
    return Math.floor(input);
  }

  const raw = input.trim().toLowerCase();
  if (!raw) return 0;

  // Colon notation (e.g. "05:00", "1:30:00", "0:45")
  if (raw.includes(':')) {
    const parts = raw.split(':').map(p => Number(p.trim()));
    if (parts.some(p => isNaN(p) || p < 0)) return 0;
    
    if (parts.length === 2) {
      // mm:ss
      const [minutes, seconds] = parts;
      return Math.floor(minutes * 60 + seconds);
    } else if (parts.length === 3) {
      // hh:mm:ss
      const [hours, minutes, seconds] = parts;
      return Math.floor(hours * 3600 + minutes * 60 + seconds);
    }
    return 0;
  }

  // Combined format like "1h 30m" or "1h30m" or "2m 15s"
  const hasHours = /[0-9.]+\s*h(?:our|ours|r|rs)?/.test(raw);
  const hasMinutes = /[0-9.]+\s*m(?:in|ins|inute|inutes)?/.test(raw);
  const hasSeconds = /[0-9.]+\s*s(?:ec|ecs|econd|econds)?/.test(raw);

  if (hasHours || hasMinutes || hasSeconds) {
    let totalSeconds = 0;
    
    const hourMatch = raw.match(/([0-9.]+)\s*h(?:our|ours|r|rs)?/);
    if (hourMatch) {
      totalSeconds += parseFloat(hourMatch[1]) * 3600;
    }

    const minMatch = raw.match(/([0-9.]+)\s*m(?:in|ins|inute|inutes)?/);
    if (minMatch) {
      totalSeconds += parseFloat(minMatch[1]) * 60;
    }

    const secMatch = raw.match(/([0-9.]+)\s*s(?:ec|ecs|econd|econds)?/);
    if (secMatch) {
      totalSeconds += parseFloat(secMatch[1]);
    }

    return Math.max(0, Math.floor(totalSeconds));
  }

  // Decimal hours e.g. "1.5" or pure number
  const num = parseFloat(raw);
  if (isNaN(num) || num < 0) return 0;

  // If fractional e.g. 1.5 -> assume hours if fractional? Let's check: 0.5 -> 30 min (1800s)
  if (raw.includes('.')) {
    return Math.floor(num * 60); // e.g. 2.5 -> 2.5 min = 150s
  }

  // Pure integer without unit:
  // Numbers <= 180 are treated as minutes (standard for race / task sequence planning e.g. 5 -> 5m, 25 -> 25m, 90 -> 90m)
  // Numbers > 180 are assumed to be raw seconds (e.g. 300 -> 300s = 5m)
  if (num <= 180) {
    return Math.floor(num * 60);
  }
  return Math.floor(num);
}

/**
 * Formats seconds into MM:SS or HH:MM:SS format
 * Overtime displays with leading "+" sign if requested or if isOvertime is true
 */
export function formatTime(
  totalSeconds: number,
  options?: {
    showSign?: boolean;
    forceHours?: boolean;
    alwaysPositive?: boolean;
  }
): string {
  const isNegative = totalSeconds < 0;
  const absSeconds = Math.abs(Math.floor(totalSeconds));

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  let timeStr = '';
  if (hours > 0 || options?.forceHours) {
    timeStr = `${hours}:${pad(minutes)}:${pad(seconds)}`;
  } else {
    timeStr = `${pad(minutes)}:${pad(seconds)}`;
  }

  if (options?.showSign) {
    if (isNegative) return `-${timeStr}`;
    return `+${timeStr}`;
  }

  return isNegative && !options?.alwaysPositive ? `-${timeStr}` : timeStr;
}

/**
 * Formats seconds into concise human readable text, e.g. "1h 15m", "45m", "30s"
 */
export function formatDurationHuman(totalSeconds: number): string {
  const absSeconds = Math.abs(Math.floor(totalSeconds));
  if (absSeconds === 0) return '0m';

  const hours = Math.floor(absSeconds / 3600);
  const minutes = Math.floor((absSeconds % 3600) / 60);
  const seconds = absSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds}s`);

  return parts.join(' ') || '0s';
}

/**
 * Normalizes seconds to valid non-negative integer
 */
export function sanitizeDuration(seconds: number): number {
  if (isNaN(seconds) || seconds < 0) return 0;
  return Math.floor(seconds);
}

/**
 * Formats seconds into MM:SS format specifically for browser tab title countdown,
 * with optional race name suffix.
 * Examples:
 * - (300, false, "Workout") -> "05:00 - Workout"
 * - (45, false) -> "00:45"
 * - (75, true, "Deep Work") -> "+01:15 - Deep Work"
 * - (0, false, "Cooking") -> "00:00 - Cooking"
 */
export function formatTabTitleTime(
  totalSeconds: number,
  isOvertime: boolean = false,
  raceName?: string
): string {
  const absSeconds = Math.abs(Math.floor(totalSeconds));
  const minutes = Math.floor(absSeconds / 60);
  const seconds = absSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  const formatted = `${pad(minutes)}:${pad(seconds)}`;
  const timeStr = isOvertime && absSeconds > 0 ? `+${formatted}` : formatted;
  const trimmedName = raceName?.trim();
  return trimmedName ? `${timeStr} - ${trimmedName}` : timeStr;
}

