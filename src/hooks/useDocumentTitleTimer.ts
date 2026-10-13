import { useEffect, useRef } from 'react';
import { TimerTickData } from '../services/timer/timerEngine';
import { formatTabTitleTime } from '../utils/duration';

export const ORIGINAL_DOCUMENT_TITLE = 'Race Timer — Beat the Clock';

interface UseDocumentTitleTimerOptions {
  tickData: TimerTickData | null;
  enabled: boolean;
  raceName?: string;
  originalTitle?: string;
}

/**
 * Dynamically updates the browser / Chrome tab title to display the active timer's
 * remaining time in MM:SS format with the race name as suffix instead of the app name.
 *
 * Keeps it accurate when switching tabs, and restores the original title
 * when the timer is reset or inactive (or when disabled in settings).
 */
export function useDocumentTitleTimer({
  tickData,
  enabled,
  raceName,
  originalTitle = ORIGINAL_DOCUMENT_TITLE,
}: UseDocumentTitleTimerOptions): void {
  // Store initial base document title on mount if available
  const baseTitleRef = useRef<string>(
    typeof document !== 'undefined' && document.title ? document.title : originalTitle
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Check if the timer is currently active
    const isTimerActive = Boolean(
      tickData &&
        (tickData.timerState === 'RUNNING' ||
          tickData.timerState === 'PAUSED' ||
          tickData.timerState === 'WARNING' ||
          tickData.timerState === 'OVERTIME')
    );

    const updateTitle = () => {
      if (enabled && isTimerActive && tickData) {
        const remainingSeconds = tickData.isOvertime
          ? tickData.taskOvertimeSeconds
          : Math.max(0, tickData.taskRemainingSeconds);

        const currentRaceName = raceName || tickData.raceName;
        const formatted = formatTabTitleTime(remainingSeconds, tickData.isOvertime, currentRaceName);
        document.title = formatted;
      } else {
        // Inactive, reset, or feature disabled: restore original title
        document.title = baseTitleRef.current || originalTitle;
      }
    };

    updateTitle();

    // Listen for tab switching / window focus to guarantee accuracy when switching tabs
    const handleTabSwitch = () => {
      updateTitle();
    };

    document.addEventListener('visibilitychange', handleTabSwitch);
    window.addEventListener('focus', handleTabSwitch);

    return () => {
      document.removeEventListener('visibilitychange', handleTabSwitch);
      window.removeEventListener('focus', handleTabSwitch);
    };
  }, [tickData, enabled, raceName, originalTitle]);

  // Restore original title on unmount
  useEffect(() => {
    return () => {
      if (typeof document !== 'undefined') {
        document.title = baseTitleRef.current || originalTitle;
      }
    };
  }, [originalTitle]);
}
